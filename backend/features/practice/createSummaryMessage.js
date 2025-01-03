import { EMOJIS, MESSAGES } from '../../constants/messages.js';

export const createSummaryMessage = (sessionStats, practicedWordsDetails, sessionResults) => {
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
