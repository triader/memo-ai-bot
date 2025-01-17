"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateContextChange = initiateContextChange;
exports.setUpOriginalContext = setUpOriginalContext;
exports.setUpLearningContext = setUpLearningContext;
const server_1 = require("../../server");
const utils_1 = require("../../utils");
async function initiateContextChange(bot, chatId, userId) {
    try {
        await bot.sendMessage(chatId, 'Let\'s update your language contexts. What language are you translating from? (e.g., "English" or "Russian")', utils_1.cancelKeyboard);
        utils_1.stateManager.setState(utils_1.BotState.SETTING_ORIGINAL_CONTEXT);
    }
    catch (error) {
        console.error('Error initiating context change:', error);
        const keyboard = await (0, utils_1.mainKeyboard)(userId);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
    }
}
async function setUpOriginalContext(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;
    if (!chatId || !userId || !text)
        return;
    try {
        await bot.sendChatAction(chatId, 'typing');
        const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
        if (!currentCategory)
            return;
        await server_1.userSettingsService.updateCategoryContext(userId, currentCategory.id, {
            original_context: text
        });
        await bot.sendMessage(chatId, 'What context are you learning? (e.g., "English" or "Genetics")', utils_1.cancelKeyboard);
        utils_1.stateManager.setState(utils_1.BotState.SETTING_LEARNING_CONTEXT);
    }
    catch (error) {
        console.error('Error setting original context:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
}
async function setUpLearningContext(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;
    if (!chatId || !userId || !text)
        return;
    try {
        const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
        if (!currentCategory)
            return;
        await server_1.userSettingsService.updateCategoryContext(userId, currentCategory.id, {
            learning_context: text
        });
        const keyboard = await (0, utils_1.mainKeyboard)(userId);
        await bot.sendMessage(chatId, 'Great! Your language contexts have been set. You can now start translating!', keyboard);
        utils_1.stateManager.setState(utils_1.BotState.IDLE);
    }
    catch (error) {
        console.error('Error setting learning context:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
}
//# sourceMappingURL=setUpContexts.js.map