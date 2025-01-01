import { BUTTONS } from '../constants/buttons.js';
import { MESSAGES } from '../constants/messages.js';
import { mainKeyboard } from '../utils/keyboards.js';
import { stateManager } from '../utils/stateManager.js';

export const deleteStates = new Map();

export function deleteWordHandler(bot, supabase, userSettingsService) {
  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const { currentCategory } = await userSettingsService.getCurrentCategory(userId);

    if (msg.callback_query) {
      const chatId = msg.callback_query.message.chat.id;
      const userId = msg.callback_query.from.id;
      const wordToDelete = msg.callback_query.data;

      try {
        await findAndDeleteWord(userId, wordToDelete, supabase, currentCategory.id);
        await bot.editMessageText(MESSAGES.SUCCESS.WORD_DELETED(wordToDelete), {
          chat_id: chatId,
          message_id: msg.callback_query.message.message_id,
          reply_markup: { inline_keyboard: [] }
        });
        deleteStates.delete(chatId);
        stateManager.clearState();
      } catch (error) {
        console.error('Error in word delete:', error);
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, mainKeyboard);
        stateManager.clearState();
      }
      return;
    }

    try {
      await bot.sendChatAction(chatId, 'typing');
      if (text === BUTTONS.DELETE_WORD) {
        const { data: words, error } = await supabase
          .from('words')
          .select('word')
          .eq('user_id', userId)
          .eq('category_id', currentCategory.id);

        if (error) {
          console.error('Error fetching words:', error);
          await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, mainKeyboard);
          return;
        }

        if (!words || words.length === 0) {
          await bot.sendMessage(chatId, MESSAGES.ERRORS.NO_WORDS, mainKeyboard);
          return;
        }

        const keyboard = {
          inline_keyboard: words.reduce((acc, { word }, index) => {
            if (index % 2 === 0) {
              acc.push([{ text: word, callback_data: word }]);
            } else {
              acc[acc.length - 1].push({ text: word, callback_data: word });
            }
            return acc;
          }, [])
        };

        deleteStates.set(chatId, {
          action: 'SELECT_WORD_TO_DELETE',
          category: currentCategory
        });
        await bot.sendMessage(chatId, MESSAGES.PROMPTS.SELECT_WORD_TO_DELETE, {
          reply_markup: keyboard
        });
      }
    } catch (error) {
      console.error('Error in word delete:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, mainKeyboard);
      deleteStates.delete(chatId);
    }
  };
}

async function findAndDeleteWord(userId, wordToDelete, supabase, categoryId) {
  const { error: deleteError } = await supabase
    .from('words')
    .delete()
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .ilike('word', wordToDelete);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw deleteError;
  }
}
