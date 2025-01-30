import TelegramBot, { Message } from 'node-telegram-bot-api';
import { SupabaseClient } from '@supabase/supabase-js';
import { mainKeyboard } from '../utils';
import { MESSAGES } from '../constants';
import { userSettingsService, wordsService } from '../server';
import {
  LEVEL_NAVIGATION,
  addLevelNavigationRow,
  handleLevelNavigation
} from '../utils/levelNavigation';

interface ViewState {
  currentLevel: number;
  categoryId: string;
}

const viewStates = new Map<number, ViewState>();

const showWordsForLevel = async (
  bot: TelegramBot,
  chatId: number,
  userId: number,
  categoryId: string,
  level: number,
  messageId?: number
) => {
  const { max, hasLevels } = await wordsService.getCurrentAndMaxLevel(userId, categoryId);
  const words = await wordsService.getWordsByLevel(userId, categoryId, hasLevels ? level : null);

  const wordsList = words
    .map((w) => {
      const progress = w.mastery_level || 0;
      const progressEmoji = progress >= 90 ? '🌳' : progress >= 50 ? '🌿' : '🌱';
      return `${progressEmoji} ${w.word} - ${w.translation}`;
    })
    .join('\n\n');

  const message = hasLevels
    ? `📚 Words in Level ${level}/${max}:\n\n${wordsList}`
    : `📚 Words:\n\n${wordsList}`;

  const keyboard = { inline_keyboard: [] };
  if (hasLevels) {
    addLevelNavigationRow(keyboard, level, max);
  }

  if (messageId) {
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
  } else {
    await bot.sendMessage(chatId, message, {
      reply_markup: keyboard
    });
  }
};

export const myWordsHandler = (bot: TelegramBot) => {
  return async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId || !chatId) return;

    try {
      // Handle callback queries for navigation
      if ('callback_query' in msg) {
        //@ts-ignore
        const callbackData = msg.callback_query.data;

        if (Object.values(LEVEL_NAVIGATION).includes(callbackData)) {
          const state = viewStates.get(chatId);
          if (!state) return;

          const { max } = await wordsService.getCurrentAndMaxLevel(userId, state.categoryId);
          const newLevel = handleLevelNavigation(callbackData, state.currentLevel, max);

          state.currentLevel = newLevel;
          viewStates.set(chatId, state);

          await showWordsForLevel(
            bot,
            chatId,
            userId,
            state.categoryId,
            newLevel,
            //@ts-ignore
            msg.callback_query.message.message_id
          );
          return;
        }
      }

      const currentCategory = await userSettingsService.getCurrentCategory(userId);
      if (!currentCategory) {
        const keyboard = await mainKeyboard(userId);
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
        return;
      }

      const hasWords = await wordsService.hasWordsInCategory(userId, currentCategory);
      if (!hasWords) {
        await bot.sendMessage(
          chatId,
          MESSAGES.ERRORS.NO_WORDS_CATEGORY(currentCategory.name),
          await mainKeyboard(userId)
        );
        return;
      }

      // Initialize view state
      viewStates.set(chatId, {
        currentLevel: 1,
        categoryId: currentCategory.id
      });

      await showWordsForLevel(bot, chatId, userId, currentCategory.id, 1);
    } catch (error) {
      console.error('Error fetching words:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.FETCH_WORDS, await mainKeyboard(userId));
    }
  };
};

export const handleWordDelete =
  (bot: TelegramBot, supabase: SupabaseClient) => async (msg: Message, wordId: string) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId || !chatId || !wordId) return;
    const keyboard = await mainKeyboard(userId);

    try {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId)
        .eq('user_id', userId);

      if (error) throw error;

      await bot.sendMessage(chatId, '✅ Word deleted successfully.', keyboard);
    } catch (error) {
      console.error('Error deleting word:', error);
      await bot.sendMessage(chatId, '❌ Failed to delete word.', keyboard);
    }
  };
