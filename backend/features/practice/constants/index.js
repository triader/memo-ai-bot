export { BUTTONS } from './buttons.js';
export { MESSAGES } from './messages.js';
export const WORDS_PER_SESSION = 5;

export const PRACTICE_TYPES = {
  RANDOM: 'random',
  TRANSLATE: 'translate',
  TRANSLATE_REVERSE: 'translate_reverse',
  MULTIPLE_CHOICE: 'multiple_choice',
  REVERSE_MULTIPLE_CHOICE: 'reverse_multiple_choice',
  FILL_BLANK: 'fill_blank'
};

export const PRACTICE_TYPE_LABELS = {
  [PRACTICE_TYPES.RANDOM]: '🎲 Random Practice',
  [PRACTICE_TYPES.TRANSLATE]: '📝 Translation',
  [PRACTICE_TYPES.TRANSLATE_REVERSE]: '🔄 Reverse Translation',
  [PRACTICE_TYPES.MULTIPLE_CHOICE]: '✅ Multiple Choice',
  [PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE]: '🔄 Reverse Multiple Choice',
  [PRACTICE_TYPES.FILL_BLANK]: '📝 Fill in Blank'
};
