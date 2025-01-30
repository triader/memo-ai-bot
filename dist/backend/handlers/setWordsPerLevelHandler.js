"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWordsPerLevelHandler = void 0;
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const server_1 = require("../server");
const setWordsPerLevelHandler = (bot) => {
    return async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!userId || !chatId)
            return;
        try {
            const state = utils_1.stateManager.getState();
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            if (state !== utils_1.BotState.SETTING_WORDS_PER_LEVEL) {
                utils_1.stateManager.setState(utils_1.BotState.SETTING_WORDS_PER_LEVEL);
                await bot.sendMessage(chatId, constants_1.MESSAGES.PROMPTS.ENTER_WORDS_PER_LEVEL, utils_1.cancelKeyboard);
                return;
            }
            const wordsPerLevel = text ? parseInt(text) : 0;
            if (isNaN(wordsPerLevel) || wordsPerLevel <= 0) {
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.INVALID_WORDS_PER_LEVEL);
                return;
            }
            const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
            if (!currentCategory) {
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
                utils_1.stateManager.clearState();
                return;
            }
            // Update category setting and reorganize words
            const success = await server_1.wordsService.reorganizeWordsIntoLevels(userId, currentCategory.id, wordsPerLevel);
            if (success) {
                await bot.sendMessage(chatId, constants_1.MESSAGES.PROMPTS.WORDS_PER_LEVEL_SET(wordsPerLevel), keyboard);
            }
            else {
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.WORDS_PER_LEVEL_FAILED, keyboard);
            }
            utils_1.stateManager.clearState();
        }
        catch (error) {
            console.error('Error setting words per level:', error);
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
            utils_1.stateManager.clearState();
        }
    };
};
exports.setWordsPerLevelHandler = setWordsPerLevelHandler;
//# sourceMappingURL=setWordsPerLevelHandler.js.map