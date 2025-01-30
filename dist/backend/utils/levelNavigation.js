"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLevelNavigation = exports.addLevelNavigationRow = exports.LEVEL_NAVIGATION = void 0;
exports.LEVEL_NAVIGATION = {
    FIRST: 'level_first',
    PREV: 'level_prev',
    NEXT: 'level_next',
    LAST: 'level_last'
};
const addLevelNavigationRow = (keyboard, currentLevel, maxLevel, callbackPrefix = '' // Optional prefix for callbacks
) => {
    if (maxLevel > 1) {
        keyboard.inline_keyboard.push([
            ...(currentLevel > 1
                ? [{ text: '⏮ First', callback_data: `${callbackPrefix}${exports.LEVEL_NAVIGATION.FIRST}` }]
                : []),
            ...(currentLevel > 1
                ? [{ text: '◀️ Previous', callback_data: `${callbackPrefix}${exports.LEVEL_NAVIGATION.PREV}` }]
                : []),
            ...(currentLevel < maxLevel
                ? [{ text: 'Next ▶️', callback_data: `${callbackPrefix}${exports.LEVEL_NAVIGATION.NEXT}` }]
                : []),
            ...(currentLevel < maxLevel
                ? [{ text: 'Last ⏭', callback_data: `${callbackPrefix}${exports.LEVEL_NAVIGATION.LAST}` }]
                : [])
        ].filter(Boolean));
    }
    return keyboard;
};
exports.addLevelNavigationRow = addLevelNavigationRow;
const handleLevelNavigation = (callbackData, currentLevel, maxLevel) => {
    switch (callbackData) {
        case exports.LEVEL_NAVIGATION.FIRST:
            return 1;
        case exports.LEVEL_NAVIGATION.PREV:
            return Math.max(1, currentLevel - 1);
        case exports.LEVEL_NAVIGATION.NEXT:
            return Math.min(maxLevel, currentLevel + 1);
        case exports.LEVEL_NAVIGATION.LAST:
            return maxLevel;
        default:
            return currentLevel;
    }
};
exports.handleLevelNavigation = handleLevelNavigation;
//# sourceMappingURL=levelNavigation.js.map