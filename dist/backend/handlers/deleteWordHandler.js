"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStates = void 0;
exports.deleteWordHandler = deleteWordHandler;
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const server_1 = require("../server");
const levelNavigation_1 = require("../utils/levelNavigation");
exports.deleteStates = new Map();
const showWordsForLevel = async (bot, chatId, userId, categoryId, level, messageId) => {
    const { max, hasLevels } = await server_1.wordsService.getCurrentAndMaxLevel(userId, categoryId);
    const words = await server_1.wordsService.getWordsByLevel(userId, categoryId, hasLevels ? level : null);
    const keyboard = {
        inline_keyboard: words.reduce((acc, { word, id }, index) => {
            if (index % 2 === 0) {
                acc.push([{ text: word, callback_data: `delete_${id}` }]);
            }
            else {
                acc[acc.length - 1].push({ text: word, callback_data: `delete_${id}` });
            }
            return acc;
        }, [])
    };
    if (hasLevels) {
        (0, levelNavigation_1.addLevelNavigationRow)(keyboard, level, max, 'delete_');
    }
    const message = hasLevels
        ? `🗑 Words in Level ${level}/${max}\nSelect a word to delete:`
        : '🗑 Select a word to delete:';
    if (messageId) {
        await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
    else {
        await bot.sendMessage(chatId, message, {
            reply_markup: keyboard
        });
    }
};
function deleteWordHandler(bot) {
    return async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!userId || !chatId)
            return;
        const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
        if (!currentCategory) {
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
            return;
        }
        // Handle callback queries
        if ('callback_query' in msg) {
            //@ts-ignore
            const callbackData = msg.callback_query.data;
            //@ts-ignore
            const messageId = msg.callback_query.message.message_id;
            // Remove delete_ prefix for processing
            const action = callbackData.replace('delete_', '');
            // Handle level navigation
            if (Object.values(levelNavigation_1.LEVEL_NAVIGATION).includes(action)) {
                const state = exports.deleteStates.get(chatId);
                if (!state)
                    return;
                const { max } = await server_1.wordsService.getCurrentAndMaxLevel(userId, state.category.id);
                const newLevel = (0, levelNavigation_1.handleLevelNavigation)(action, state.currentLevel, max);
                state.currentLevel = newLevel;
                exports.deleteStates.set(chatId, state);
                await showWordsForLevel(bot, chatId, userId, state.category.id, newLevel, messageId);
                return;
            }
            // Handle word deletion
            const result = await server_1.wordsService.deleteWord(userId, action, currentCategory.id);
            if (result) {
                // Send success message
                await bot.sendMessage(chatId, constants_1.MESSAGES.SUCCESS.WORD_DELETED(result.word, result.translation), await (0, utils_1.mainKeyboard)(userId));
                // Get the current state and update the keyboard
                const state = exports.deleteStates.get(chatId);
                if (state) {
                    //@ts-ignore
                    const currentKeyboard = msg.callback_query.message.reply_markup;
                    // Filter out the deleted word button
                    const updatedKeyboard = {
                        inline_keyboard: currentKeyboard.inline_keyboard
                            .map((row) => row.filter((button) => button.callback_data !== callbackData))
                            .filter((row) => row.length > 0) // Remove empty rows
                    };
                    // Check if there are any words left in current level (excluding navigation row)
                    const hasWordsLeft = updatedKeyboard.inline_keyboard.some((row) => !row[0]?.callback_data?.startsWith('level_'));
                    if (!hasWordsLeft) {
                        // If no words left and we're not in level 1, go to previous level
                        if (state.currentLevel > 1) {
                            const newLevel = state.currentLevel - 1;
                            state.currentLevel = newLevel;
                            exports.deleteStates.set(chatId, state);
                            await showWordsForLevel(bot, chatId, userId, currentCategory.id, newLevel, 
                            //@ts-ignore
                            msg.callback_query.message.message_id);
                            return;
                        }
                    }
                    // If we still have words or we're in level 1, just update the keyboard
                    const lastRow = updatedKeyboard.inline_keyboard[updatedKeyboard.inline_keyboard.length - 1];
                    const isLastRowNavigation = lastRow?.[0]?.callback_data?.startsWith('level_');
                    // Add navigation buttons only if they exist in original keyboard and aren't already present
                    if (!isLastRowNavigation) {
                        const originalLastRow = currentKeyboard.inline_keyboard[currentKeyboard.inline_keyboard.length - 1];
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
                }
                else {
                    // If somehow state is lost, show main keyboard
                    const keyboard = await (0, utils_1.mainKeyboard)(userId);
                    await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
                    utils_1.stateManager.clearState();
                }
            }
            else {
                const keyboard = await (0, utils_1.mainKeyboard)(userId);
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
                utils_1.stateManager.clearState();
            }
            return;
        }
        try {
            await bot.sendChatAction(chatId, 'typing');
            if (text === constants_1.BUTTONS.DELETE_WORD) {
                const { current, max } = await server_1.wordsService.getCurrentAndMaxLevel(userId, currentCategory.id);
                exports.deleteStates.set(chatId, {
                    action: 'SELECT_WORD_TO_DELETE',
                    category: currentCategory,
                    currentLevel: current
                });
                await showWordsForLevel(bot, chatId, userId, currentCategory.id, current);
            }
        }
        catch (error) {
            console.error('Error in word delete:', error);
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
            exports.deleteStates.delete(chatId);
        }
    };
}
//# sourceMappingURL=deleteWordHandler.js.map