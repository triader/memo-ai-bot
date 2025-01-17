"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMultipleChoiceKeyboard = exports.createTranslateKeyboard = exports.createPracticeTypeKeyboard = void 0;
const constants_1 = require("../constants");
const createPracticeTypeKeyboard = () => ({
    inline_keyboard: [
        [
            {
                text: constants_1.PRACTICE_TYPE_LABELS[constants_1.PRACTICE_TYPES.TRANSLATE],
                callback_data: constants_1.PRACTICE_TYPES.TRANSLATE
            }
        ],
        [
            {
                text: constants_1.PRACTICE_TYPE_LABELS[constants_1.PRACTICE_TYPES.TRANSLATE_REVERSE],
                callback_data: constants_1.PRACTICE_TYPES.TRANSLATE_REVERSE
            }
        ],
        [
            {
                text: constants_1.PRACTICE_TYPE_LABELS[constants_1.PRACTICE_TYPES.MULTIPLE_CHOICE],
                callback_data: constants_1.PRACTICE_TYPES.MULTIPLE_CHOICE
            }
        ],
        [
            {
                text: constants_1.PRACTICE_TYPE_LABELS[constants_1.PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE],
                callback_data: constants_1.PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE
            }
        ]
        // [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.RANDOM], callback_data: PRACTICE_TYPES.RANDOM }]
    ]
});
exports.createPracticeTypeKeyboard = createPracticeTypeKeyboard;
const createTranslateKeyboard = () => ({
    reply_markup: {
        keyboard: [[{ text: constants_1.BUTTONS.SKIP }], [{ text: constants_1.BUTTONS.EXIT_PRACTICE }]],
        one_time_keyboard: true,
        resize_keyboard: true
    }
});
exports.createTranslateKeyboard = createTranslateKeyboard;
const createMultipleChoiceKeyboard = (options) => ({
    reply_markup: {
        keyboard: [
            ...options.map((option) => [{ text: option }]),
            [{ text: constants_1.BUTTONS.SKIP }],
            [{ text: constants_1.BUTTONS.EXIT_PRACTICE }]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
    }
});
exports.createMultipleChoiceKeyboard = createMultipleChoiceKeyboard;
//# sourceMappingURL=keyboards.js.map