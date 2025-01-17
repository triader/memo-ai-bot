"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCategoryCreate = exports.categoryHandler = exports.categoryStates = void 0;
const utils_1 = require("../../utils");
const server_1 = require("../../server");
const categoryCallback_1 = require("./categoryCallback");
const constants_1 = require("../../constants");
const helpers_1 = require("./helpers");
const constants_2 = require("./constants");
exports.categoryStates = new Map();
const categoryHandler = (bot) => async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from?.id;
    if (!chatId || !userId || !text) {
        return;
    }
    try {
        await bot.sendChatAction(chatId, 'typing');
        if (text?.startsWith(constants_1.BUTTONS.CATEGORY)) {
            return await handleCategoryList(bot, chatId, userId);
        }
        const state = exports.categoryStates.get(chatId);
        if (!state)
            return;
        const handlers = {
            selecting_category: () => (0, categoryCallback_1.onCategorySelectClick)(bot, chatId, userId, text, state),
            confirming_delete: () => onCategoryDelete(bot, chatId, userId, text, state),
            saving_edited_category: () => onCategoryEdit(bot, chatId, userId, text, state)
        };
        const handler = handlers[state.step];
        if (handler) {
            await handler();
        }
        exports.categoryStates.delete(chatId);
        utils_1.stateManager.setState(utils_1.BotState.IDLE);
    }
    catch (error) {
        await (0, helpers_1.handleError)(bot, chatId, userId);
    }
};
exports.categoryHandler = categoryHandler;
async function handleCategoryList(bot, chatId, userId) {
    const categories = await server_1.categoryService.getUserCategories(userId);
    if (!categories?.length) {
        await bot.sendMessage(chatId, constants_2.MESSAGES.NO_CATEGORIES, utils_1.cancelKeyboard);
        exports.categoryStates.set(chatId, { step: 'creating_category' });
        return;
    }
    const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
    const inlineKeyboard = (0, helpers_1.createCategoryInlineKeyboard)(categories, currentCategory);
    await bot.sendMessage(chatId, constants_2.MESSAGES.CATEGORY_LIST, {
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
}
async function onCategoryDelete(bot, chatId, userId, text, state) {
    const { categoryToDelete } = state;
    if (text !== categoryToDelete.name) {
        await bot.sendMessage(chatId, `❌ Category name doesn't match. Please type "${categoryToDelete.name}" exactly to confirm deletion, or press Cancel.`, utils_1.cancelKeyboard);
        return;
    }
    try {
        const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
        if (currentCategory?.id === categoryToDelete.id) {
            const categories = await server_1.categoryService.getUserCategories(userId);
            const newCurrentCategory = categories?.find((cat) => cat.id !== categoryToDelete.id);
            if (newCurrentCategory) {
                await server_1.userSettingsService.setCurrentCategory(userId, newCurrentCategory.id);
            }
            else {
                await server_1.userSettingsService.setCurrentCategory(userId, null);
            }
        }
        await server_1.categoryService.deleteCategory(userId, categoryToDelete.id);
        await bot.sendMessage(chatId, `✅ Category "${categoryToDelete.name}" and all its words have been deleted.`, await (0, utils_1.mainKeyboard)(userId));
        const remainingCategories = await server_1.categoryService.getUserCategories(userId);
        if (remainingCategories && remainingCategories.length > 0) {
            await (0, helpers_1.showCategoryList)(bot, chatId, userId);
        }
        else {
            await bot.sendMessage(chatId, 'You have no categories left. Please create a new category:', utils_1.cancelKeyboard);
            exports.categoryStates.set(chatId, { step: 'creating_category' });
            utils_1.stateManager.setState(utils_1.BotState.CREATING_CATEGORY);
            return;
        }
        exports.categoryStates.delete(chatId);
        utils_1.stateManager.setState(utils_1.BotState.IDLE);
    }
    catch (error) {
        console.error('Error deleting category:', error);
        await (0, helpers_1.handleError)(bot, chatId, userId, 'Failed to delete category. Please try again.');
    }
}
const onCategoryCreate = (bot) => async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from?.id;
    const categoryName = text?.trim();
    if (!chatId || !userId) {
        return;
    }
    if (!categoryName) {
        await bot.sendMessage(chatId, 'Please enter a valid category name.', utils_1.cancelKeyboard);
        return;
    }
    try {
        const existingCategories = await server_1.categoryService.getUserCategories(userId);
        if (existingCategories &&
            existingCategories.some((cat) => cat.name.toLowerCase() === categoryName.toLowerCase())) {
            await bot.sendMessage(chatId, '❌ A category with this name already exists. Please choose a different name.', utils_1.cancelKeyboard);
            return;
        }
        const category = await server_1.categoryService.createCategory(userId, categoryName);
        const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
        if (!currentCategory) {
            await server_1.userSettingsService.setCurrentCategory(userId, category.id);
        }
        await bot.sendMessage(chatId, `✅ Category "${category.name}" created successfully!`, await (0, utils_1.mainKeyboard)(userId));
        await (0, helpers_1.showCategoryList)(bot, chatId, userId);
        exports.categoryStates.delete(chatId);
        utils_1.stateManager.setState(utils_1.BotState.IDLE);
    }
    catch (error) {
        console.error('Error creating category:', error);
        await (0, helpers_1.handleError)(bot, chatId, userId, 'Failed to create category. Please try again.');
    }
};
exports.onCategoryCreate = onCategoryCreate;
async function onCategoryEdit(bot, chatId, userId, text, state) {
    const newName = text.trim();
    if (!newName) {
        await bot.sendMessage(chatId, '❌ Please enter a valid name.', utils_1.cancelKeyboard);
        return;
    }
    try {
        await server_1.categoryService.updateCategory(userId, state.categoryToEdit.id, newName);
        await bot.sendMessage(chatId, `✅ Category name updated to "${newName}"`, await (0, utils_1.mainKeyboard)(userId));
        await (0, helpers_1.showCategoryList)(bot, chatId, userId);
        exports.categoryStates.delete(chatId);
        utils_1.stateManager.setState(utils_1.BotState.IDLE);
    }
    catch (error) {
        await (0, helpers_1.handleError)(bot, chatId, userId, 'Failed to update category name. Please try again.');
    }
}
//# sourceMappingURL=categoryHandler.js.map