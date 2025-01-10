import { BotState, stateManager } from '../../utils/stateManager.js';
import { BUTTONS } from '../../constants/buttons.js';
import { MESSAGES } from '../../constants/messages.js';
import { cancelKeyboard, mainKeyboard } from '../../utils/keyboards.js';

export const translationStore = new Map();
export const conversationStore = new Map();

export function translateAIHandler(bot, openai, userSettingsService) {
  return async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    // Get user's current category and language contexts
    const currentCategory = await userSettingsService.getCurrentCategory(userId);

    // Get context data
    const contextData = await userSettingsService.getCategoryContext(userId, currentCategory.id);
    const categoryWithContext = {
      ...currentCategory,
      original_context: contextData.original_context,
      learning_context: contextData.learning_context
    };

    // Check if contexts are set
    if (!categoryWithContext.original_context || !categoryWithContext.learning_context) {
      await bot.sendMessage(
        chatId,
        'Please set up your language contexts first. What context are you translating from? (e.g., "English" or "Russian")',
        cancelKeyboard
      );
      stateManager.setState(BotState.SETTING_ORIGINAL_CONTEXT);
      return;
    }

    const followUpData = translationStore.get(`followup_${chatId}`);
    if (followUpData && text) {
      try {
        const { word } = followUpData;

        // Get or initialize conversation history
        let conversationHistory = conversationStore.get(chatId) || [
          {
            role: 'system',
            content: `You are a helpful language learning assistant. You are helping someone who knows ${categoryWithContext.original_context} learn ${categoryWithContext.learning_context}. Answer questions about word usage, meaning, and context.`
          }
        ];

        // Add user's message
        conversationHistory.push({
          role: 'user',
          content: `Regarding the word/phrase "${word}": ${text}`
        });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: conversationHistory,
          temperature: 0.7
        });

        // Store assistant's response in history
        conversationHistory.push(completion.choices[0].message);
        conversationStore.set(chatId, conversationHistory);

        await bot.sendChatAction(chatId, 'typing');

        if (followUpData.keyboardMessageId) {
          try {
            await bot.deleteMessage(chatId, followUpData.keyboardMessageId);
          } catch (e) {
            console.error('Error deleting keyboard message:', e);
          }
        }

        console.log('word', text);

        const followUpText = completion.choices[0].message.content;

        await bot.sendMessage(chatId, followUpText, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: BUTTONS.FOLLOW_UP,
                  callback_data: `translate_followup_${word}`
                }
              ]
            ]
          }
        });

        const keyboard = await mainKeyboard(userId);
        await bot.sendMessage(chatId, 'Let me know if you have any more questions!', keyboard);

        translationStore.delete(`followup_${chatId}`);

        return;
      } catch (error) {
        console.error('Follow-up error:', error);
        const keyboard = await mainKeyboard(userId);
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
        translationStore.delete(`followup_${chatId}`);
        return;
      }
    }

    // Handle regular translation (only in IDLE state)
    if (stateManager.getState() === BotState.IDLE && text) {
      try {
        await bot.sendChatAction(chatId, 'typing');

        // Check if contexts are the same
        const isSameContext =
          categoryWithContext.original_context === categoryWithContext.learning_context;

        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                `You are a helpful language learning assistant. You are helping someone who knows ${categoryWithContext.original_context} learn ${categoryWithContext.learning_context}. ` +
                'Provide ' +
                (isSameContext ? 'definition' : 'translation') +
                ' in the following format ONLY:\n\n' +
                (!isSameContext
                  ? `${categoryWithContext.original_context}: [${isSameContext ? 'term' : 'word or phrase'} in ${categoryWithContext.original_context} (only the word or phrase, no other text, no quotes; for example: ${categoryWithContext.original_context}: Hello.)]\n\n`
                  : `Word: [${text}]\n\n`) +
                (isSameContext ? 'Definition:' : 'Translation:') +
                ` [${isSameContext ? 'brief definition' : 'translated word or phrase'}]` +
                '[For translations containing special characters like kanji, add their reading on the next line in parentheses.]\n\n' +
                'Explanation: [detailed explanation]\n\n' +
                `${!isSameContext ? 'Example: [usage example] (${categoryWithContext.original_context}: [translation])' : ''}`
            },
            {
              role: 'user',
              content: isSameContext
                ? `Define "${text}" in ${categoryWithContext.learning_context} and provide a brief explanation and usage example.`
                : `Translate or give definition of "${text}" from ${categoryWithContext.original_context} to ${categoryWithContext.learning_context} and provide a brief explanation and usage example.`
            }
          ],
          model: 'gpt-4o'
        });

        const response = completion.choices[0].message.content;

        // Parse the translation/definition from the response
        const translationMatch = response.match(/(Translation|Definition):\s*([^\n]+)/);
        const translation = translationMatch
          ? isSameContext
            ? translationMatch[0]
            : translationMatch[2].trim()
          : null;

        // Parse the original word from the response
        const originalWordMatch = response.match(
          new RegExp(`${categoryWithContext.original_context}:\\s*([^\\n]+)`)
        );
        const originalWord = originalWordMatch ? originalWordMatch[1].trim() : text;

        // Send the full response first
        await bot.sendMessage(chatId, response);

        // If we successfully parsed the translation, show the options
        if (translation) {
          // Store translation data with a unique key
          const translationKey = `${userId}_${Date.now()}`;
          translationStore.set(translationKey, {
            word: originalWord,
            translation,
            categoryId: currentCategory.id
          });

          const inlineKeyboard = {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: BUTTONS.ADD_WORD,
                    callback_data: `add_trans_${translationKey}`
                  }
                ],
                [
                  {
                    text: BUTTONS.MORE_EXAMPLES,
                    callback_data: `more_examples_${translationKey}`
                  },
                  {
                    text: BUTTONS.FOLLOW_UP,
                    callback_data: `translate_followup_${translationKey}`
                  }
                ]
              ],
              resize_keyboard: true
            }
          };

          await bot.sendMessage(
            chatId,
            'Would you like to add this word to your vocabulary?',
            inlineKeyboard
          );
        }
      } catch (error) {
        await bot.sendMessage(chatId, '❌ Translation failed. Please try again.');
        console.error(error);
      }
    }

    // Clear conversation when canceling or changing words
    conversationStore.delete(chatId);
  };
}
