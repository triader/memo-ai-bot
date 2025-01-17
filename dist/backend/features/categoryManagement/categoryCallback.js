"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryCallback = void 0;
exports.onCategorySelectClick = onCategorySelectClick;
exports.onCategoryCreateClick = onCategoryCreateClick;
const utils_1 = require("../../utils");
const categoryHandler_1 = require("./categoryHandler");
const server_1 = require("../../server");
const helpers_1 = require("./helpers");
const constants_1 = require("./constants");
const categoryCallback = (bot) => async (callbackQuery) => {
    const chatId = callbackQuery.message?.chat.id;
    if (!chatId || !callbackQuery.data) {
        return;
    }
    const userId = callbackQuery.from.id;
    const keyboard = await (0, utils_1.mainKeyboard)(userId);
    try {
        const action = (0, helpers_1.getCallbackAction)(callbackQuery.data);
        const categoryId = (0, helpers_1.getCallbackCategoryId)(callbackQuery.data);
        if (!action) {
            return;
        }
        switch (action) {
            case constants_1.CATEGORY_ACTIONS.SELECT:
                await onCategorySelectClick(bot, userId, chatId, categoryId, callbackQuery);
                break;
            case constants_1.CATEGORY_ACTIONS.NEW:
                await onCategoryCreateClick(bot, chatId, callbackQuery);
                break;
            case constants_1.CATEGORY_ACTIONS.EDIT:
                await onCategoryEditClick(bot, chatId, categoryId, callbackQuery);
                break;
            case constants_1.CATEGORY_ACTIONS.DELETE:
                await onCategoryDeleteClick(bot, userId, chatId, categoryId, callbackQuery);
                break;
            default:
                console.warn('Unknown callback action:', action);
                break;
        }
    }
    catch (error) {
        console.error('Error in category callback handler:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
        categoryHandler_1.categoryStates.delete(chatId);
        utils_1.stateManager.setState(utils_1.BotState.IDLE);
    }
};
exports.categoryCallback = categoryCallback;
async function onCategorySelectClick(bot, userId, chatId, categoryId, callbackQuery) {
    if (!callbackQuery.message?.message_id) {
        return;
    }
    await server_1.userSettingsService.setCurrentCategory(userId, categoryId);
    const category = await server_1.categoryService.findCategoryById(userId, categoryId);
    if (!category)
        return;
    await bot.deleteMessage(chatId, callbackQuery.message?.message_id);
    // Send success message
    await bot.sendMessage(chatId, `✅ Current category changed to "${category.name}"`, (0, utils_1.mainKeyboardNewCategory)(category.name));
    // Show updated category list
    await (0, helpers_1.showCategoryList)(bot, chatId, userId);
    await bot.answerCallbackQuery(callbackQuery.id);
    utils_1.stateManager.setState(utils_1.BotState.IDLE);
}
async function onCategoryCreateClick(bot, chatId, callbackQuery) {
    try {
        if (!callbackQuery.message?.message_id) {
            return;
        }
        await bot.deleteMessage(chatId, callbackQuery.message?.message_id);
        await bot.sendMessage(chatId, constants_1.MESSAGES.NEW_CATEGORY, utils_1.cancelKeyboard);
        utils_1.stateManager.setState(utils_1.BotState.CREATING_CATEGORY);
        await bot.answerCallbackQuery(callbackQuery.id);
    }
    catch (error) {
        console.error('Error in onCategoryCreateClick:', error);
        throw error;
    }
}
async function onCategoryEditClick(bot, chatId, categoryId, callbackQuery) {
    if (!callbackQuery.message?.message_id) {
        return;
    }
    utils_1.stateManager.setState(utils_1.BotState.EDITING_CATEGORY);
    await bot.sendMessage(chatId, constants_1.MESSAGES.EDIT_CATEGORY, utils_1.cancelKeyboard);
    categoryHandler_1.categoryStates.set(chatId, {
        step: 'saving_edited_category',
        categoryToEdit: { id: categoryId }
    });
    await bot.deleteMessage(chatId, callbackQuery.message.message_id);
    await bot.answerCallbackQuery(callbackQuery.id);
}
async function onCategoryDeleteClick(bot, userId, chatId, categoryId, callbackQuery) {
    if (!callbackQuery.message?.message_id) {
        return;
    }
    utils_1.stateManager.setState(utils_1.BotState.DELETING_CATEGORY);
    try {
        const category = await server_1.categoryService.validateCategoryDeletion(userId, categoryId);
        if (!category)
            return;
        await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        await bot.sendMessage(chatId, `⚠️ This action cannot be undone!\n\nTo delete category "${category.name}" and all its words, please type the category name to confirm:`, utils_1.cancelKeyboard);
        categoryHandler_1.categoryStates.set(chatId, {
            step: 'confirming_delete',
            categoryToDelete: category
        });
        await bot.answerCallbackQuery(callbackQuery.id);
    }
    catch (error) {
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: error.message,
            show_alert: true
        });
    }
}
//# sourceMappingURL=categoryCallback.js.map