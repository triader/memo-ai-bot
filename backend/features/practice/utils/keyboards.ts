import { BUTTONS, PRACTICE_TYPE_LABELS, PRACTICE_TYPES } from '../constants';

export const createPracticeTypeKeyboard = () => ({
  inline_keyboard: [
    [
      {
        text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.TRANSLATE],
        callback_data: PRACTICE_TYPES.TRANSLATE
      }
    ],
    [
      {
        text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.TRANSLATE_REVERSE],
        callback_data: PRACTICE_TYPES.TRANSLATE_REVERSE
      }
    ],
    [
      {
        text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.MULTIPLE_CHOICE],
        callback_data: PRACTICE_TYPES.MULTIPLE_CHOICE
      }
    ],
    [
      {
        text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE],
        callback_data: PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE
      }
    ]
    // [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.RANDOM], callback_data: PRACTICE_TYPES.RANDOM }]
  ]
});

export const createTranslateKeyboard = () => ({
  reply_markup: {
    keyboard: [[{ text: BUTTONS.SKIP }], [{ text: BUTTONS.EXIT_PRACTICE }]],
    one_time_keyboard: true,
    resize_keyboard: true
  }
});

export const createMultipleChoiceKeyboard = (options: string[]) => ({
  reply_markup: {
    keyboard: [
      ...options.map((option) => [{ text: option }]),
      [{ text: BUTTONS.SKIP }],
      [{ text: BUTTONS.EXIT_PRACTICE }]
    ],
    one_time_keyboard: true,
    resize_keyboard: true
  }
});
