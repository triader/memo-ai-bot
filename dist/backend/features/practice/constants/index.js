"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRACTICE_TYPE_LABELS = exports.PRACTICE_TYPES = exports.WORDS_PER_SESSION = exports.MESSAGES = exports.BUTTONS = void 0;
var buttons_1 = require("./buttons");
Object.defineProperty(exports, "BUTTONS", { enumerable: true, get: function () { return buttons_1.BUTTONS; } });
var messages_1 = require("./messages");
Object.defineProperty(exports, "MESSAGES", { enumerable: true, get: function () { return messages_1.MESSAGES; } });
exports.WORDS_PER_SESSION = 5;
exports.PRACTICE_TYPES = {
    RANDOM: 'random',
    TRANSLATE: 'translate',
    TRANSLATE_REVERSE: 'translate_reverse',
    MULTIPLE_CHOICE: 'multiple_choice',
    REVERSE_MULTIPLE_CHOICE: 'reverse_multiple_choice',
    FILL_BLANK: 'fill_blank'
};
exports.PRACTICE_TYPE_LABELS = {
    [exports.PRACTICE_TYPES.RANDOM]: '🎲 Random Practice',
    [exports.PRACTICE_TYPES.TRANSLATE]: '📝 Translation',
    [exports.PRACTICE_TYPES.TRANSLATE_REVERSE]: '🔄 Reverse Translation',
    [exports.PRACTICE_TYPES.MULTIPLE_CHOICE]: '✅ Multiple Choice',
    [exports.PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE]: '🔄 Reverse Multiple Choice',
    [exports.PRACTICE_TYPES.FILL_BLANK]: '📝 Fill in Blank'
};
//# sourceMappingURL=index.js.map