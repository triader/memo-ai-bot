import TelegramBot, { Message } from 'node-telegram-bot-api';
import { BUTTONS, MESSAGES } from '../constants';
import { mainKeyboard, stateManager } from '../utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { userSettingsService } from '../server';
import { supabase } from '../config';

export const deleteStates = new Map();

export function deleteWordHandler(bot: TelegramBot) {
  return async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !chatId) return;
    const currentCategory = await userSettingsService.getCurrentCategory(userId);

    if (!currentCategory) {
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
      return;
    }

    // @ts-ignore
    if (msg.callback_query) {
      // @ts-ignore
      const chatId = msg.callback_query.message.chat.id;
      // @ts-ignore
      const userId = msg.callback_query.from.id;
      // @ts-ignore
      const wordToDelete = msg.callback_query.data;

      try {
        await findAndDeleteWord(userId, wordToDelete, supabase, currentCategory.id);
        await bot.editMessageText(MESSAGES.SUCCESS.WORD_DELETED(wordToDelete), {
          chat_id: chatId,
          // @ts-ignore
          message_id: msg.callback_query.message.message_id,
          reply_markup: { inline_keyboard: [] }
        });
        deleteStates.delete(chatId);
        stateManager.clearState();
      } catch (error) {
        console.error('Error in word delete:', error);
        const keyboard = await mainKeyboard(userId);
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
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
          const keyboard = await mainKeyboard(userId);
          await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
          return;
        }

        if (!words || words.length === 0) {
          const keyboard = await mainKeyboard(userId);
          await bot.sendMessage(chatId, MESSAGES.ERRORS.NO_WORDS, keyboard);
          return;
        }

        const keyboard = {
          inline_keyboard: words.reduce(
            (acc, { word }, index) => {
              if (index % 2 === 0) {
                acc.push([{ text: word, callback_data: word }]);
              } else {
                acc[acc.length - 1].push({ text: word, callback_data: word });
              }
              return acc;
            },
            [] as { text: string; callback_data: string }[][]
          )
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
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
      deleteStates.delete(chatId);
    }
  };
}

async function findAndDeleteWord(
  userId: number,
  wordToDelete: string,
  supabase: SupabaseClient,
  categoryId: string
) {
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
