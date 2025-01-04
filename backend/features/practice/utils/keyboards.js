import { BUTTONS } from '../../../constants/buttons.js';
import { PRACTICE_TYPE_LABELS, PRACTICE_TYPES } from '../constants/index.js';

export const createPracticeTypeKeyboard = () => ({
  keyboard: [
    [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.RANDOM] }],
    [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.TRANSLATE] }],
    [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.MULTIPLE_CHOICE] }],
    [{ text: BUTTONS.CANCEL }]
  ],
  resize_keyboard: true,
  one_time_keyboard: true
});

export const createTranslateKeyboard = () => ({
  reply_markup: {
    keyboard: [[{ text: BUTTONS.SKIP }], [{ text: BUTTONS.CANCEL }]],
    one_time_keyboard: true,
    resize_keyboard: true
  }
});

export const createMultipleChoiceKeyboard = (options) => ({
  reply_markup: {
    keyboard: [
      ...options.map((option) => [{ text: option }]),
      [{ text: BUTTONS.SKIP }],
      [{ text: BUTTONS.CANCEL }]
    ],
    one_time_keyboard: true,
    resize_keyboard: true
  }
});
