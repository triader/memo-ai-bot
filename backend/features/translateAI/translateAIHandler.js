import { BotState, stateManager } from '../../utils/stateManager.js';
import { BUTTONS } from '../../constants/buttons.js';
import { MESSAGES } from '../../constants/messages.js';
import { mainKeyboard } from '../../utils/keyboards.js';

export const translationStore = new Map();
export const conversationStore = new Map();

export function translateAIHandler(bot, openai, userSettingsService) {
  return async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    const followUpData = translationStore.get(`followup_${chatId}`);
    if (followUpData && text) {
      try {
        const { word } = followUpData;

        // Get or initialize conversation history
        let conversationHistory = conversationStore.get(chatId) || [
          {
            role: 'system',
            content:
              'You are a helpful language learning assistant. Answer questions about word usage, meaning, and context.'
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
      const { currentCategory } = await userSettingsService.getCurrentCategory(userId);

      try {
        await bot.sendChatAction(chatId, 'typing');
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful language learning assistant. Provide translations in the following format ONLY:\n' +
                'Translation: [translated word or phrase]' +
                '[For translations containing kanji or Chinese characters, add their reading on the next line in parentheses. Do not add readings for hiragana or katakana.]\n' +
                'Explanation: [explanation]\n' +
                'Example: [usage example] (English: [translation])\n' +
                '[If the example contains kanji or Chinese characters, add their reading on the next line in parentheses. Do not add readings for hiragana or katakana.]'
            },
            {
              role: 'user',
              content: `Translate "${text}" to ${currentCategory.name} and provide a brief explanation and usage example. For Japanese words with kanji or Chinese characters, include their reading in parentheses (but don't add readings for hiragana/katakana). Include English translations for examples.`
            }
          ],
          model: 'gpt-4o'
        });

        const response = completion.choices[0].message.content;

        // Parse the translation from the response
        const translationMatch = response.match(/Translation:\s*([^\n]+)/);
        const translation = translationMatch ? translationMatch[1].trim() : null;

        // Send the full response first
        await bot.sendMessage(chatId, response);

        // If we successfully parsed the translation, show the options
        if (translation) {
          // Store translation data with a unique key
          const translationKey = `${userId}_${Date.now()}`;
          translationStore.set(translationKey, {
            word: text,
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
                    callback_data: `translate_followup_${translation}`
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
