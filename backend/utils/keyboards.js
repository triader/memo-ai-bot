import { BUTTONS } from '../constants/buttons.js';
import { userSettingsService } from '../server.js';

// Helper function to get the current category button text
const getCategoryButtonText = async (userId) => {
  const { currentCategory } = await userSettingsService.getCurrentCategory(userId);
  return `📚 ${currentCategory?.name || 'Select Category'}`;
};

export const getMainKeyboard = async (userId) => {
  const categoryButton = await getCategoryButtonText(userId);

  return {
    reply_markup: {
      keyboard: [
        [BUTTONS.ADD_WORD, BUTTONS.PRACTICE],
        [BUTTONS.MY_WORDS, BUTTONS.MORE_OPTIONS],
        [categoryButton]
      ],
      resize_keyboard: true
    }
  };
};

export const mainKeyboardNewCategory = (categoryName) => {
  return {
    reply_markup: {
      keyboard: [
        [BUTTONS.ADD_WORD, BUTTONS.PRACTICE],
        [BUTTONS.MY_WORDS, BUTTONS.MORE_OPTIONS],
        [categoryName]
      ],
      resize_keyboard: true
    }
  };
};

// Update mainKeyboard to only require userId
export const mainKeyboard = async (userId) => await getMainKeyboard(userId);

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
