import TelegramBot, { CallbackQuery } from 'node-telegram-bot-api';
import { EMOJIS } from '../../constants/messages';
import { BotState, stateManager } from '../../utils';
import { MESSAGES, PRACTICE_TYPES } from './constants';
import { handlePracticeTypeSelection, practiceStates, PracticeType } from './practiceHandler';

export const createSummaryMessage = (
  sessionStats: { correct: number; total: number; skipped: number },
  practicedWordsDetails: any[],
  sessionResults: any[]
) => {
  const percentage = Math.round((sessionStats.correct / sessionStats.total) * 100);
  const performanceEmoji =
    percentage >= 90
      ? EMOJIS.PERFORMANCE.EXCELLENT
      : percentage >= 70
        ? EMOJIS.PERFORMANCE.GOOD
        : percentage >= 50
          ? EMOJIS.PERFORMANCE.FAIR
          : EMOJIS.PERFORMANCE.LEARNING;

  const wordsList = practicedWordsDetails
    .map((word) => {
      const result = sessionResults[word.id];
      const resultEmoji = result === true ? '✅' : result === 'skipped' ? '⏭️' : '❌';
      const progress = word.mastery_level || 0;
      const progressEmoji = progress >= 90 ? '🌟' : progress >= 50 ? '📈' : '🔄';

      return (
        `${resultEmoji} ${word.word} - ${word.translation}\n` +
        `   ${progressEmoji} Current progress: ${progress}%`
      );
    })
    .join('\n\n');

  return (
    MESSAGES.PRACTICE_SUMMARY.HEADER +
    MESSAGES.PRACTICE_SUMMARY.OVERALL_RESULTS +
    MESSAGES.PRACTICE_SUMMARY.CORRECT(sessionStats.correct) +
    MESSAGES.PRACTICE_SUMMARY.WRONG(
      sessionStats.total - sessionStats.correct - sessionStats.skipped
    ) +
    MESSAGES.PRACTICE_SUMMARY.SKIPPED(sessionStats.skipped) +
    MESSAGES.PRACTICE_SUMMARY.SUCCESS_RATE(performanceEmoji, percentage) +
    MESSAGES.PRACTICE_SUMMARY.PRACTICED_WORDS +
    wordsList +
    '\n\n' +
    MESSAGES.PRACTICE_SUMMARY.FOOTER
  );
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
  if (!chatId) {
    return;
  }

  const userId = query.from.id;
  const data = query.data;

  if (!data) {
    return;
  }

  if (Object.values(PRACTICE_TYPES).includes(data as PracticeType)) {
    const state = practiceStates.get(chatId);
    if (!state || !state.currentCategory) return;

    // Answer the callback query to remove the loading state
    await bot.answerCallbackQuery(query.id);

    // Delete the message with inline keyboard
    if (query.message?.message_id) {
      await bot.deleteMessage(chatId, query.message.message_id);
    }

    // Set the state when user selects practice type
    stateManager.setState(BotState.PRACTICING);
    await handlePracticeTypeSelection(
      bot,
      chatId,
      userId,
      data as PracticeType,
      state.currentCategory
    );
  }
};
