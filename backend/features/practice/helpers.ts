import TelegramBot, { CallbackQuery } from 'node-telegram-bot-api';
import { BotState, stateManager } from '../../utils';
import { MESSAGES, PRACTICE_MODES } from './constants';
import { practiceStates, startPracticeSession } from './practiceHandler';
import { wordsService } from '../../server';
import { createLevelNavigationKeyboard, createPracticeOptionsKeyboard } from './utils';
import { getProgressEmoji } from '../../utils/getProgressEmoji';

export const createSummaryMessage = (practicedWordsDetails: any[], sessionResults: any[]) => {
  const wordsList = practicedWordsDetails
    .map((word) => {
      const result = sessionResults[word.id];
      const resultEmoji = result === true ? '✅' : result === 'skipped' ? '⏭️' : '❌';
      const progress = word.mastery_level || 0;

      return `${getProgressEmoji(progress)} ${word.word} - ${word.translation} ${resultEmoji}`;
    })
    .join('\n\n');

  return MESSAGES.PRACTICE_SUMMARY.HEADER + wordsList + '\n\n' + MESSAGES.PRACTICE_SUMMARY.FOOTER;
};

export async function exitPractice(bot: TelegramBot, chatId: number, keyboard: any) {
  stateManager.setState(BotState.IDLE);
  await bot.sendMessage(
    chatId,
    'Practice session ended. You can start a new practice session anytime! 🌟',
    keyboard
  );
}

export const handlePracticeCallback = async (bot: TelegramBot, query: CallbackQuery) => {
  const chatId = query.message?.chat.id;
  const userId = query.from.id;
  const callbackData = query.data;

  if (!chatId || !userId || !callbackData) return;

  const state = practiceStates.get(chatId);
  if (!state) return;

  try {
    await bot.answerCallbackQuery(query.id);

    if (callbackData.startsWith('level_')) {
      const direction = callbackData.split('_')[1];
      let newLevel = state.currentLevel!;

      if (direction === 'back' && state.currentLevel! > 1) {
        newLevel = state.currentLevel! - 1;
      } else if (direction === 'forward') {
        const { max: maxLevel } = await wordsService.getMaxLevel(userId, state.currentCategory!.id);
        if (state.currentLevel! < maxLevel) {
          newLevel = state.currentLevel! + 1;
        }
      }

      // Update state with new level
      state.currentLevel = newLevel;
      practiceStates.set(chatId, state);

      const { reviewWordsCount, newWordsCount } = await wordsService.getCountNewAndReviewWords(
        userId,
        state.currentCategory!.id,
        newLevel
      );

      const { max: maxLevel } = await wordsService.getMaxLevel(userId, state.currentCategory!.id);

      await bot.editMessageText(`Practice level ${newLevel}`, {
        chat_id: chatId,
        message_id: query.message?.message_id,
        reply_markup: {
          inline_keyboard: [
            ...createLevelNavigationKeyboard(newLevel, maxLevel),
            ...createPracticeOptionsKeyboard(reviewWordsCount, newWordsCount)
          ]
        }
      });
    } else if (callbackData === 'review_words') {
      stateManager.setState(BotState.PRACTICING);
      practiceStates.set(chatId, {
        ...state,
        practiceMode: PRACTICE_MODES.REVIEW
      });
      await startPracticeSession(bot, chatId, userId, state.currentCategory!, state.currentLevel!);
    } else if (callbackData === 'learn_new_words') {
      stateManager.setState(BotState.PRACTICING);
      practiceStates.set(chatId, {
        ...state,
        practiceMode: PRACTICE_MODES.LEARN
      });
      await startPracticeSession(bot, chatId, userId, state.currentCategory!, state.currentLevel!);
    }
  } catch (error) {
    console.error('Error handling practice callback:', error);
    await bot.answerCallbackQuery(query.id, {
      text: 'An error occurred while processing your request.'
    });
  }
};
