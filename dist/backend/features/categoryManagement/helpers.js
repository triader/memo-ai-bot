"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategoryInlineKeyboard = exports.sendSuccessMessage = exports.handleError = void 0;
exports.showCategoryList = showCategoryList;
exports.getCallbackAction = getCallbackAction;
exports.getCallbackCategoryId = getCallbackCategoryId;
const server_1 = require("../../server");
const server_2 = require("../../server");
const utils_1 = require("../../utils");
const categoryHandler_1 = require("./categoryHandler");
const constants_1 = require("./constants");
const handleError = async (bot, chatId, userId, message = 'Failed to process category. Please try again.') => {
    console.error('Error:', message);
    const keyboard = await (0, utils_1.mainKeyboard)(userId);
    await bot.sendMessage(chatId, `❌ ${message}`, keyboard);
    categoryHandler_1.categoryStates.delete(chatId);
    utils_1.stateManager.setState(utils_1.BotState.IDLE);
};
exports.handleError = handleError;
const sendSuccessMessage = async (bot, chatId, userId, message, customKeyboard = null) => {
    const keyboard = customKeyboard || (await (0, utils_1.mainKeyboard)(userId));
    await bot.sendMessage(chatId, `✅ ${message}`, keyboard);
    categoryHandler_1.categoryStates.delete(chatId);
    utils_1.stateManager.setState(utils_1.BotState.IDLE);
};
exports.sendSuccessMessage = sendSuccessMessage;
const createCategoryInlineKeyboard = (categories, currentCategory) => {
    const keyboard = categories.flatMap((cat) => [
        [
            {
                text: `${cat.name}${cat.id === currentCategory?.id ? ' ✅' : ''}`,
                callback_data: constants_1.CATEGORY_ACTIONS.SELECT + cat.id
            }
        ],
        [
            {
                text: '✏️ Edit',
                callback_data: constants_1.CATEGORY_ACTIONS.EDIT + cat.id
            },
            {
                text: '🗑️ Delete',
                callback_data: constants_1.CATEGORY_ACTIONS.DELETE + cat.id
            }
        ]
    ]);
    keyboard.push([
        {
            text: '➕ New Category',
            callback_data: constants_1.CATEGORY_ACTIONS.NEW
        }
    ]);
    return keyboard;
};
exports.createCategoryInlineKeyboard = createCategoryInlineKeyboard;
async function showCategoryList(bot, chatId, userId) {
    const categories = await server_2.categoryService.getUserCategories(userId);
    const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
    const inlineKeyboard = (0, exports.createCategoryInlineKeyboard)(categories, currentCategory);
    await bot.sendMessage(chatId, constants_1.MESSAGES.CATEGORY_LIST, {
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
}
function getCallbackAction(callbackData) {
    if (callbackData.startsWith(constants_1.CATEGORY_ACTIONS.SELECT))
        return constants_1.CATEGORY_ACTIONS.SELECT;
    if (callbackData.startsWith(constants_1.CATEGORY_ACTIONS.EDIT))
        return constants_1.CATEGORY_ACTIONS.EDIT;
    if (callbackData.startsWith(constants_1.CATEGORY_ACTIONS.DELETE))
        return constants_1.CATEGORY_ACTIONS.DELETE;
    if (callbackData === constants_1.CATEGORY_ACTIONS.NEW)
        return constants_1.CATEGORY_ACTIONS.NEW;
    return null;
}
function getCallbackCategoryId(callbackData) {
    if (!callbackData || callbackData === constants_1.CATEGORY_ACTIONS.NEW)
        return null;
    return callbackData.split('_').pop();
}
//# sourceMappingURL=helpers.js.map