import { BUTTONS } from '../constants/buttons.js';

export const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [BUTTONS.ADD_WORD, BUTTONS.PRACTICE],
      [BUTTONS.MY_WORDS, BUTTONS.CHANGE_CATEGORY],
      [BUTTONS.MORE_OPTIONS]
    ],
    resize_keyboard: true
  }
};

if (process.env.ENVIRONMENT === 'development') {
  mainKeyboard.reply_markup.keyboard.push([{ text: BUTTONS.DEV_INDICATOR }]);
}

export const mainKeyboardSecondary = {
  reply_markup: {
    keyboard: [
      [{ text: BUTTONS.EDIT_WORD }, { text: BUTTONS.DELETE_WORD }],
      [{ text: BUTTONS.IMPORT }],
      [{ text: BUTTONS.BACK_TO_MAIN }]
    ],
    resize_keyboard: true
  }
};

export const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: BUTTONS.CANCEL }]],
    resize_keyboard: true,
    one_time_keyboard: true
  }
};

export const removeKeyboard = {
  reply_markup: {
    remove_keyboard: true
  }
};
