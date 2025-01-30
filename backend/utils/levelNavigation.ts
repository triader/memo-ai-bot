export const LEVEL_NAVIGATION = {
  FIRST: 'level_first',
  PREV: 'level_prev',
  NEXT: 'level_next',
  LAST: 'level_last'
} as const;

export const addLevelNavigationRow = (
  keyboard: { inline_keyboard: any[][] },
  currentLevel: number,
  maxLevel: number,
  callbackPrefix: string = '' // Optional prefix for callbacks
) => {
  if (maxLevel > 1) {
    keyboard.inline_keyboard.push(
      [
        ...(currentLevel > 1
          ? [{ text: '⏮ First', callback_data: `${callbackPrefix}${LEVEL_NAVIGATION.FIRST}` }]
          : []),
        ...(currentLevel > 1
          ? [{ text: '◀️ Previous', callback_data: `${callbackPrefix}${LEVEL_NAVIGATION.PREV}` }]
          : []),
        ...(currentLevel < maxLevel
          ? [{ text: 'Next ▶️', callback_data: `${callbackPrefix}${LEVEL_NAVIGATION.NEXT}` }]
          : []),
        ...(currentLevel < maxLevel
          ? [{ text: 'Last ⏭', callback_data: `${callbackPrefix}${LEVEL_NAVIGATION.LAST}` }]
          : [])
      ].filter(Boolean)
    );
  }
  return keyboard;
};

export const handleLevelNavigation = (
  callbackData: string,
  currentLevel: number,
  maxLevel: number
): number => {
  switch (callbackData) {
    case LEVEL_NAVIGATION.FIRST:
      return 1;
    case LEVEL_NAVIGATION.PREV:
      return Math.max(1, currentLevel - 1);
    case LEVEL_NAVIGATION.NEXT:
      return Math.min(maxLevel, currentLevel + 1);
    case LEVEL_NAVIGATION.LAST:
      return maxLevel;
    default:
      return currentLevel;
  }
};
