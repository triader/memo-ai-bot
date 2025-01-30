import TelegramBot, { Message } from 'node-telegram-bot-api';
import { MESSAGES } from '../constants';
import { BotState, cancelKeyboard, mainKeyboard, stateManager } from '../utils';
import { userSettingsService, wordsService } from '../server';

export const setWordsPerLevelHandler = (bot: TelegramBot) => {
  return async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !chatId) return;

    try {
      const state = stateManager.getState();
      const keyboard = await mainKeyboard(userId);

      if (state !== BotState.SETTING_WORDS_PER_LEVEL) {
        stateManager.setState(BotState.SETTING_WORDS_PER_LEVEL);
        await bot.sendMessage(chatId, MESSAGES.PROMPTS.ENTER_WORDS_PER_LEVEL, cancelKeyboard);
        return;
      }

      const wordsPerLevel = text ? parseInt(text) : 0;

      if (isNaN(wordsPerLevel) || wordsPerLevel <= 0) {
        await bot.sendMessage(chatId, MESSAGES.ERRORS.INVALID_WORDS_PER_LEVEL);
        return;
      }

      const currentCategory = await userSettingsService.getCurrentCategory(userId);
      if (!currentCategory) {
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
        stateManager.clearState();
        return;
      }

      // Update category setting and reorganize words
      const success = await wordsService.reorganizeWordsIntoLevels(
        userId,
        currentCategory.id,
        wordsPerLevel
      );

      if (success) {
        await bot.sendMessage(
          chatId,
          MESSAGES.PROMPTS.WORDS_PER_LEVEL_SET(wordsPerLevel),
          keyboard
        );
      } else {
        await bot.sendMessage(chatId, MESSAGES.ERRORS.WORDS_PER_LEVEL_FAILED, keyboard);
      }

      stateManager.clearState();
    } catch (error) {
      console.error('Error setting words per level:', error);
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
      stateManager.clearState();
    }
  };
};
