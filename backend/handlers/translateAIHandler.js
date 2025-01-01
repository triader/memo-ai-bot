import { BotState, stateManager } from '../utils/stateManager.js';
import { supabase } from '../config/supabase.js';
import { BUTTONS } from '../constants/buttons.js';
import { MESSAGES } from '../constants/messages.js';
import { mainKeyboard } from '../utils/keyboards.js';

// Store temporary translation data
const translationStore = new Map();

export function translateAIHandler(bot, openai, userSettingsService) {
  return async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    const followUpData = translationStore.get(`followup_${chatId}`);
    if (followUpData && text) {
      try {
        const { word } = followUpData;

        await bot.sendChatAction(chatId, 'typing');

        if (followUpData.keyboardMessageId) {
          try {
            await bot.deleteMessage(chatId, followUpData.keyboardMessageId);
          } catch (e) {
            console.error('Error deleting keyboard message:', e);
          }
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful language learning assistant. Answer questions about word usage, meaning, and context.'
            },
            {
              role: 'user',
              content: `Regarding the word/phrase "${word}": ${text}`
            }
          ],
          temperature: 0.7
        });

        const followUpText = response.choices[0].message.content;

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

        await bot.sendMessage(chatId, 'Let me know if you have any more questions!', mainKeyboard);

        translationStore.delete(`followup_${chatId}`);

        return;
      } catch (error) {
        console.error('Follow-up error:', error);
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, mainKeyboard);
        translationStore.delete(`followup_${chatId}`);
        return;
      }
    }

    // Handle regular translation (only in IDLE state)
    if (stateManager.getState() === BotState.IDLE && text) {
      const { currentCategory } = await userSettingsService.getCurrentCategory(userId);

      if (!currentCategory) {
        await bot.sendMessage(
          chatId,
          '⚠️ Please create a category first so that chatgpt knows what language to translate to'
        );
        return;
      }

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
  };
}

export function handleTranslationCallback(bot, openai) {
  return async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const messageId = callbackQuery.message.message_id;

    // Handle add translation callback
    if (callbackQuery.data.startsWith('add_trans_')) {
      try {
        const translationKey = callbackQuery.data.replace('add_trans_', '');
        const translationData = translationStore.get(translationKey);

        if (!translationData) {
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Translation data expired. Please try again.',
            show_alert: true
          });
          return;
        }

        const { word, translation, categoryId } = translationData;

        const { error } = await supabase.from('words').insert([
          {
            user_id: userId,
            category_id: categoryId,
            word: translation,
            translation: word,
            created_at: new Date()
          }
        ]);

        if (error) throw error;

        // Clean up stored data
        translationStore.delete(translationKey);

        // Update the message to show success
        await bot.editMessageText(`✅ Added "${translation} - ${word}" to your vocabulary!`, {
          chat_id: chatId,
          message_id: messageId
        });

        // Answer the callback query
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Word added successfully!'
        });
      } catch (error) {
        console.error('Error adding word:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Failed to add word. Please try again.',
          show_alert: true
        });
      }
    }

    // Handle more examples callback
    if (callbackQuery.data.startsWith('more_examples_')) {
      try {
        const translationKey = callbackQuery.data.replace('more_examples_', '');
        const translationData = translationStore.get(translationKey);

        if (!translationData) {
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Translation data expired. Please try again.',
            show_alert: true
          });
          return;
        }

        const { word, translation } = translationData;

        // Show loading state
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Generating more examples...'
        });
        await bot.sendChatAction(chatId, 'typing');

        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful language learning assistant. Provide 5 example sentences using the given word.\n' +
                'Format each example as follows:\n' +
                '1. [Example sentence in target language] ([translation in original language])\n' +
                '[If the sentence contains kanji or Chinese characters, add their reading on the next line in parentheses. Do not add readings for hiragana or katakana.]\n' +
                '\n' +
                'Number each example from 1 to 5.'
            },
            {
              role: 'user',
              content: `Provide 5 different example sentences using the word "${translation}" (${word}). Make the examples progressively more complex. Include English translations for each example.`
            }
          ],
          model: 'gpt-4o'
        });

        const examples = completion.choices[0].message.content;

        // Send examples as a new message with both More Examples and Follow-up buttons
        await bot.sendMessage(chatId, `📝 More examples with "${translation}":\n\n${examples}`, {
          reply_markup: {
            inline_keyboard: [
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
            ]
          }
        });
      } catch (error) {
        console.error('Error generating examples:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Failed to generate examples. Please try again.',
          show_alert: true
        });
      }
    }

    // Handle follow-up callback
    if (callbackQuery.data.startsWith('translate_followup_')) {
      try {
        const word = callbackQuery.data.replace('translate_followup_', '');

        const sentMessage = await bot.sendMessage(
          chatId,
          `What would you like to know about "${word}"?`,
          {
            reply_markup: { keyboard: [[BUTTONS.CANCEL]], resize_keyboard: true }
          }
        );

        translationStore.set(`followup_${chatId}`, {
          word,
          keyboardMessageId: sentMessage.message_id // Store the message ID
        });

        await bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Translation callback error:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Failed to start follow-up. Please try again.',
          show_alert: true
        });
      }
    }
  };
}
