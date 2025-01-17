"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWordHandler = exports.createCategoryKeyboard = void 0;
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const server_1 = require("../server");
const config_1 = require("../config");
// Store word addition states
const wordStates = new Map();
const createCategoryKeyboard = (categories) => {
    const keyboard = categories.map((cat) => [{ text: cat.name }]);
    keyboard.push([{ text: constants_1.BUTTONS.CANCEL }]);
    return {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true
    };
};
exports.createCategoryKeyboard = createCategoryKeyboard;
const addWordHandler = (bot) => {
    return async (msg) => {
        const chatId = msg.chat.id;
        const user = msg.from;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!user || !userId)
            return;
        try {
            await bot.sendChatAction(chatId, 'typing');
            // Ensure user exists
            await server_1.userService.ensureUserExists(user);
            // Handle initial command
            if (text === constants_1.BUTTONS.ADD_WORD) {
                const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
                if (currentCategory) {
                    // If user has a current category, start word addition directly
                    wordStates.set(chatId, {
                        step: 'waiting_word',
                        categoryId: currentCategory.id,
                        categoryName: currentCategory.name
                    });
                    await bot.sendMessage(chatId, `Adding word to category "${currentCategory.name}"\nPlease enter the word:`, utils_1.cancelKeyboard);
                }
                else {
                    // If no category exists, prompt to create one
                    await bot.sendMessage(chatId, 'You have no categories yet. Please enter a name for your first category:', utils_1.cancelKeyboard);
                    wordStates.set(chatId, { step: 'creating_category' });
                }
                return;
            }
            // Get current state
            const state = wordStates.get(chatId);
            if (!state)
                return;
            // Handle state-specific logic
            switch (state.step) {
                case 'creating_category':
                    const categoryName = text?.trim();
                    if (!categoryName) {
                        await bot.sendMessage(chatId, 'Please enter a valid category name.', utils_1.cancelKeyboard);
                        return;
                    }
                    const category = await server_1.categoryService.createCategory(userId, categoryName);
                    await server_1.userSettingsService.setCurrentCategory(userId, category.id);
                    wordStates.set(chatId, {
                        step: 'waiting_word',
                        categoryId: category.id,
                        categoryName: category.name
                    });
                    await bot.sendMessage(chatId, `Category "${category.name}" created!\nPlease enter the word you want to add:`, utils_1.cancelKeyboard);
                    break;
                case 'waiting_word':
                    const word = text?.trim();
                    if (!word) {
                        await bot.sendMessage(chatId, 'Please enter a valid word.', utils_1.cancelKeyboard);
                        return;
                    }
                    wordStates.set(chatId, {
                        ...state,
                        step: 'waiting_translation',
                        word
                    });
                    await bot.sendMessage(chatId, `Great! Now enter the translation for "${word}":`, utils_1.cancelKeyboard);
                    break;
                case 'waiting_translation':
                    const translation = text?.trim();
                    if (!translation) {
                        await bot.sendMessage(chatId, 'Please enter a valid translation.', utils_1.cancelKeyboard);
                        return;
                    }
                    try {
                        const { error } = await config_1.supabase.from('words').insert([
                            {
                                user_id: userId,
                                category_id: state.categoryId,
                                word: state.word,
                                translation,
                                created_at: new Date()
                            }
                        ]);
                        if (error)
                            throw error;
                        const keyboard = await (0, utils_1.mainKeyboard)(userId);
                        await bot.sendMessage(chatId, `✅ Word added successfully!`, keyboard);
                        wordStates.delete(chatId);
                        utils_1.stateManager.clearState();
                    }
                    catch (error) {
                        console.error('Error adding word:', error);
                        const keyboard = await (0, utils_1.mainKeyboard)(userId);
                        await bot.sendMessage(chatId, '❌ Failed to add word. Please try again.', keyboard);
                        wordStates.delete(chatId);
                        utils_1.stateManager.clearState();
                    }
                    break;
            }
        }
        catch (error) {
            console.error('Error in word handler:', error);
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, '❌ Failed to add word. Please try again.', keyboard);
            wordStates.delete(chatId);
            utils_1.stateManager.clearState();
        }
    };
};
exports.addWordHandler = addWordHandler;
//# sourceMappingURL=addWordHandler.js.map