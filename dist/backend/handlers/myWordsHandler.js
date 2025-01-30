"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWordDelete = exports.myWordsHandler = void 0;
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const server_1 = require("../server");
const levelNavigation_1 = require("../utils/levelNavigation");
const viewStates = new Map();
const showWordsForLevel = async (bot, chatId, userId, categoryId, level, messageId) => {
    const { max, hasLevels } = await server_1.wordsService.getCurrentAndMaxLevel(userId, categoryId);
    const words = await server_1.wordsService.getWordsByLevel(userId, categoryId, hasLevels ? level : null);
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
        (0, levelNavigation_1.addLevelNavigationRow)(keyboard, level, max);
    }
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
const myWordsHandler = (bot) => {
    return async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        if (!userId || !chatId)
            return;
        try {
            // Handle callback queries for navigation
            if ('callback_query' in msg) {
                //@ts-ignore
                const callbackData = msg.callback_query.data;
                if (Object.values(levelNavigation_1.LEVEL_NAVIGATION).includes(callbackData)) {
                    const state = viewStates.get(chatId);
                    if (!state)
                        return;
                    const { max } = await server_1.wordsService.getCurrentAndMaxLevel(userId, state.categoryId);
                    const newLevel = (0, levelNavigation_1.handleLevelNavigation)(callbackData, state.currentLevel, max);
                    state.currentLevel = newLevel;
                    viewStates.set(chatId, state);
                    await showWordsForLevel(bot, chatId, userId, state.categoryId, newLevel, 
                    //@ts-ignore
                    msg.callback_query.message.message_id);
                    return;
                }
            }
            const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
            if (!currentCategory) {
                const keyboard = await (0, utils_1.mainKeyboard)(userId);
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
                return;
            }
            const hasWords = await server_1.wordsService.hasWordsInCategory(userId, currentCategory);
            if (!hasWords) {
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.NO_WORDS_CATEGORY(currentCategory.name), await (0, utils_1.mainKeyboard)(userId));
                return;
            }
            // Initialize view state
            viewStates.set(chatId, {
                currentLevel: 1,
                categoryId: currentCategory.id
            });
            await showWordsForLevel(bot, chatId, userId, currentCategory.id, 1);
        }
        catch (error) {
            console.error('Error fetching words:', error);
            await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.FETCH_WORDS, await (0, utils_1.mainKeyboard)(userId));
        }
    };
};
exports.myWordsHandler = myWordsHandler;
const handleWordDelete = (bot, supabase) => async (msg, wordId) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId || !chatId || !wordId)
        return;
    const keyboard = await (0, utils_1.mainKeyboard)(userId);
    try {
        const { error } = await supabase
            .from('words')
            .delete()
            .eq('id', wordId)
            .eq('user_id', userId);
        if (error)
            throw error;
        await bot.sendMessage(chatId, '✅ Word deleted successfully.', keyboard);
    }
    catch (error) {
        console.error('Error deleting word:', error);
        await bot.sendMessage(chatId, '❌ Failed to delete word.', keyboard);
    }
};
exports.handleWordDelete = handleWordDelete;
//# sourceMappingURL=myWordsHandler.js.map