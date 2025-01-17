"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAnswer = void 0;
const normalizeAnswer = (text) => {
    // Convert to lowercase and trim
    let normalized = text.trim().toLowerCase();
    // Remove leading "to " for verbs
    if (normalized.startsWith('to ')) {
        normalized = normalized.slice(3);
    }
    // Remove leading "a " or "an " for nouns
    if (normalized.startsWith('a ')) {
        normalized = normalized.slice(2);
    }
    else if (normalized.startsWith('an ')) {
        normalized = normalized.slice(3);
    }
    return normalized;
};
exports.normalizeAnswer = normalizeAnswer;
//# sourceMappingURL=normalizeAnswer.js.map