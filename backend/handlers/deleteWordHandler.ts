import TelegramBot, { Message } from 'node-telegram-bot-api';
import { BUTTONS, MESSAGES } from '../constants';
import { mainKeyboard, stateManager } from '../utils';
import { userSettingsService, wordsService } from '../server';
import { Category } from '../services/category';

interface DeleteState {
  action: string;
  category: Category;
  currentLevel: number;
}

export const deleteStates = new Map<number, DeleteState>();

const LEVEL_NAVIGATION = {
  FIRST: 'level_first',
  PREV: 'level_prev',
  NEXT: 'level_next',
  LAST: 'level_last'
};

const showWordsForLevel = async (
  bot: TelegramBot,
  chatId: number,
  userId: number,
  categoryId: string,
  level: number,
  messageId?: number
) => {
  const words = await wordsService.getWordsByLevel(userId, categoryId, level);
  const { max } = await wordsService.getCurrentAndMaxLevel(userId, categoryId);

  const keyboard = {
    inline_keyboard: words.reduce(
      (acc, { word, id }, index) => {
        if (index % 2 === 0) {
          acc.push([{ text: word, callback_data: id }]);
        } else {
          acc[acc.length - 1].push({ text: word, callback_data: id });
        }
        return acc;
      },
      [] as { text: string; callback_data: string }[][]
    )
  };

  // Add navigation buttons (only if there are multiple levels)
  if (max > 1) {
    keyboard.inline_keyboard.push(
      [
        ...(level > 1 ? [{ text: '⏮ First', callback_data: LEVEL_NAVIGATION.FIRST }] : []),
        ...(level > 1 ? [{ text: '◀️ Previous', callback_data: LEVEL_NAVIGATION.PREV }] : []),
        ...(level < max ? [{ text: 'Next ▶️', callback_data: LEVEL_NAVIGATION.NEXT }] : []),
        ...(level < max ? [{ text: 'Last ⏭', callback_data: LEVEL_NAVIGATION.LAST }] : [])
      ].filter(Boolean)
    ); // Remove empty slots
  }

  const message = `🗑 Words in Level ${level}/${max}\nSelect a word to delete:`;

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

    // Handle callback queries
    if ('callback_query' in msg) {
      //@ts-ignore
      const callbackData = msg.callback_query.data;
      //@ts-ignore
      const messageId = msg.callback_query.message.message_id;

      // Handle level navigation
      if (Object.values(LEVEL_NAVIGATION).includes(callbackData)) {
        const state = deleteStates.get(chatId);
        if (!state) return;

        const { max } = await wordsService.getCurrentAndMaxLevel(userId, state.category.id);
        let newLevel = state.currentLevel;

        switch (callbackData) {
          case LEVEL_NAVIGATION.FIRST:
            newLevel = 1;
            break;
          case LEVEL_NAVIGATION.PREV:
            newLevel = Math.max(1, state.currentLevel - 1);
            break;
          case LEVEL_NAVIGATION.NEXT:
            newLevel = Math.min(max, state.currentLevel + 1);
            break;
          case LEVEL_NAVIGATION.LAST:
            newLevel = max;
            break;
        }

        state.currentLevel = newLevel;
        deleteStates.set(chatId, state);
        await showWordsForLevel(bot, chatId, userId, state.category.id, newLevel, messageId);
        return;
      }

      // Handle word deletion
      const result = await wordsService.deleteWord(userId, callbackData, currentCategory.id);
      if (result) {
        // Send success message
        await bot.sendMessage(
          chatId,
          MESSAGES.SUCCESS.WORD_DELETED(result.word, result.translation),
          await mainKeyboard(userId)
        );

        // Get the current state and update the keyboard
        const state = deleteStates.get(chatId);
        if (state) {
          //@ts-ignore
          const currentKeyboard = msg.callback_query.message.reply_markup;

          // Filter out the deleted word button
          const updatedKeyboard = {
            inline_keyboard: currentKeyboard.inline_keyboard
              .map((row: any) => row.filter((button: any) => button.callback_data !== callbackData))
              .filter((row: any) => row.length > 0) // Remove empty rows
          };

          // Check if there are any words left in current level (excluding navigation row)
          const hasWordsLeft = updatedKeyboard.inline_keyboard.some(
            (row: any) => !row[0]?.callback_data?.startsWith('level_')
          );

          if (!hasWordsLeft) {
            // If no words left and we're not in level 1, go to previous level
            if (state.currentLevel > 1) {
              const newLevel = state.currentLevel - 1;
              state.currentLevel = newLevel;
              deleteStates.set(chatId, state);
              await showWordsForLevel(
                bot,
                chatId,
                userId,
                currentCategory.id,
                newLevel,
                //@ts-ignore
                msg.callback_query.message.message_id
              );
              return;
            }
          }

          // If we still have words or we're in level 1, just update the keyboard
          const lastRow =
            updatedKeyboard.inline_keyboard[updatedKeyboard.inline_keyboard.length - 1];
          const isLastRowNavigation = lastRow?.[0]?.callback_data?.startsWith('level_');

          // Add navigation buttons only if they exist in original keyboard and aren't already present
          if (!isLastRowNavigation) {
            const originalLastRow =
              currentKeyboard.inline_keyboard[currentKeyboard.inline_keyboard.length - 1];
            if (originalLastRow?.[0]?.callback_data?.startsWith('level_')) {
              updatedKeyboard.inline_keyboard.push(originalLastRow);
            }
          }

          // Update the existing message with new keyboard
          //@ts-ignore
          await bot.editMessageReplyMarkup(updatedKeyboard, {
            chat_id: chatId,
            //@ts-ignore
            message_id: msg.callback_query.message.message_id
          });
        } else {
          // If somehow state is lost, show main keyboard
          const keyboard = await mainKeyboard(userId);
          await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
          stateManager.clearState();
        }
      } else {
        const keyboard = await mainKeyboard(userId);
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
        stateManager.clearState();
      }
      return;
    }

    try {
      await bot.sendChatAction(chatId, 'typing');
      if (text === BUTTONS.DELETE_WORD) {
        const { current, max } = await wordsService.getCurrentAndMaxLevel(
          userId,
          currentCategory.id
        );

        deleteStates.set(chatId, {
          action: 'SELECT_WORD_TO_DELETE',
          category: currentCategory,
          currentLevel: current
        });

        await showWordsForLevel(bot, chatId, userId, currentCategory.id, current);
      }
    } catch (error) {
      console.error('Error in word delete:', error);
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
      deleteStates.delete(chatId);
    }
  };
}
