"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePracticeCallback = exports.createSummaryMessage = void 0;
exports.exitPractice = exitPractice;
const messages_1 = require("../../constants/messages");
const utils_1 = require("../../utils");
const constants_1 = require("./constants");
const practiceHandler_1 = require("./practiceHandler");
const createSummaryMessage = (sessionStats, practicedWordsDetails, sessionResults) => {
    const percentage = Math.round((sessionStats.correct / sessionStats.total) * 100);
    const performanceEmoji = percentage >= 90
        ? messages_1.EMOJIS.PERFORMANCE.EXCELLENT
        : percentage >= 70
            ? messages_1.EMOJIS.PERFORMANCE.GOOD
            : percentage >= 50
                ? messages_1.EMOJIS.PERFORMANCE.FAIR
                : messages_1.EMOJIS.PERFORMANCE.LEARNING;
    const wordsList = practicedWordsDetails
        .map((word) => {
        const result = sessionResults[word.id];
        const resultEmoji = result === true ? '✅' : result === 'skipped' ? '⏭️' : '❌';
        const progress = word.mastery_level || 0;
        const progressEmoji = progress >= 90 ? '🌟' : progress >= 50 ? '📈' : '🔄';
        return (`${resultEmoji} ${word.word} - ${word.translation}\n` +
            `   ${progressEmoji} Current progress: ${progress}%`);
    })
        .join('\n\n');
    return (constants_1.MESSAGES.PRACTICE_SUMMARY.HEADER +
        constants_1.MESSAGES.PRACTICE_SUMMARY.OVERALL_RESULTS +
        constants_1.MESSAGES.PRACTICE_SUMMARY.CORRECT(sessionStats.correct) +
        constants_1.MESSAGES.PRACTICE_SUMMARY.WRONG(sessionStats.total - sessionStats.correct - sessionStats.skipped) +
        constants_1.MESSAGES.PRACTICE_SUMMARY.SKIPPED(sessionStats.skipped) +
        constants_1.MESSAGES.PRACTICE_SUMMARY.SUCCESS_RATE(performanceEmoji, percentage) +
        constants_1.MESSAGES.PRACTICE_SUMMARY.PRACTICED_WORDS +
        wordsList +
        '\n\n' +
        constants_1.MESSAGES.PRACTICE_SUMMARY.FOOTER);
};
exports.createSummaryMessage = createSummaryMessage;
async function exitPractice(bot, chatId, keyboard) {
    utils_1.stateManager.setState(utils_1.BotState.IDLE);
    await bot.sendMessage(chatId, 'Practice session ended. You can start a new practice session anytime! 🌟', keyboard);
}
const handlePracticeCallback = async (bot, query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) {
        return;
    }
    const userId = query.from.id;
    const data = query.data;
    if (!data) {
        return;
    }
    if (Object.values(constants_1.PRACTICE_TYPES).includes(data)) {
        const state = practiceHandler_1.practiceStates.get(chatId);
        if (!state || !state.currentCategory)
            return;
        // Answer the callback query to remove the loading state
        await bot.answerCallbackQuery(query.id);
        // Delete the message with inline keyboard
        if (query.message?.message_id) {
            await bot.deleteMessage(chatId, query.message.message_id);
        }
        // Set the state when user selects practice type
        utils_1.stateManager.setState(utils_1.BotState.PRACTICING);
        await (0, practiceHandler_1.handlePracticeTypeSelection)(bot, chatId, userId, data, state.currentCategory);
    }
};
exports.handlePracticeCallback = handlePracticeCallback;
//# sourceMappingURL=helpers.js.map