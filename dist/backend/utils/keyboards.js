"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeKeyboard = exports.cancelKeyboard = exports.mainKeyboardSecondary = exports.mainKeyboard = exports.getMainKeyboard = void 0;
const config_1 = require("../config");
const constants_1 = require("../constants");
const server_1 = require("../server");
const services_1 = require("../services");
// Helper function to get the current category button text
const getCategoryButtonText = async (userId) => {
    const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
    if (!currentCategory) {
        return undefined;
    }
    const totalWordsCount = await server_1.wordsService.getTotalWordsCount(userId, currentCategory.id);
    return `📚 ${currentCategory?.name} (${totalWordsCount})`;
};
const getMainKeyboard = async (userId) => {
    const categoryService = new services_1.CategoryService(config_1.supabase);
    const hasCategories = await categoryService.hasCategories(userId);
    if (!hasCategories) {
        // When there are no categories, show no keyboard at all
        return {
            reply_markup: {
                remove_keyboard: true
            }
        };
    }
    const categoryButton = await getCategoryButtonText(userId);
    return {
        reply_markup: {
            keyboard: [...mainOptions, [categoryButton]],
            resize_keyboard: true
        }
    };
};
exports.getMainKeyboard = getMainKeyboard;
const mainOptions = [
    [constants_1.BUTTONS.MY_WORDS, constants_1.BUTTONS.PRACTICE],
    [constants_1.BUTTONS.ADD_WORD, constants_1.BUTTONS.MORE_OPTIONS]
    // [BUTTONS.IMPORT]
];
const mainKeyboard = async (userId) => await (0, exports.getMainKeyboard)(userId);
exports.mainKeyboard = mainKeyboard;
exports.mainKeyboardSecondary = {
    reply_markup: {
        keyboard: [
            [
                { text: constants_1.BUTTONS.SET_WORDS_PER_LEVEL },
                // { text: BUTTONS.EDIT_WORD },
                { text: constants_1.BUTTONS.DELETE_WORD }
            ],
            [{ text: constants_1.BUTTONS.IMPORT }, { text: constants_1.BUTTONS.CHANGE_CONTEXT }],
            [{ text: constants_1.BUTTONS.BACK_TO_MAIN }]
        ],
        resize_keyboard: true
    }
};
exports.cancelKeyboard = {
    reply_markup: {
        keyboard: [[{ text: constants_1.BUTTONS.CANCEL }]],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};
exports.removeKeyboard = {
    reply_markup: {
        remove_keyboard: true
    }
};
//# sourceMappingURL=keyboards.js.map