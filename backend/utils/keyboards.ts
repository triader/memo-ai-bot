import { supabase } from '../config';
import { BUTTONS } from '../constants';
import { userSettingsService } from '../server';
import { CategoryService } from '../services';

// Helper function to format category button text
const formatCategoryButton = (categoryName: string) => `📚 ${categoryName || 'Select Category'}`;

// Helper function to get the current category button text
const getCategoryButtonText = async (userId: number) => {
  const currentCategory = await userSettingsService.getCurrentCategory(userId);
  if (!currentCategory) {
    return undefined;
  }
  return `📚 ${currentCategory?.name}`;
};

export const getMainKeyboard = async (userId: number): Promise<any> => {
  const categoryService = new CategoryService(supabase);
  const hasCategories = await categoryService.hasCategories(userId);

  if (!hasCategories) {
    // When there are no categories, show no keyboard at all
    return {
      reply_markup: {
        remove_keyboard: true
      }
    };
  }

  const categoryButton = await getCategoryButtonText(userId);

  return {
    reply_markup: {
      keyboard: [...mainOptions, [categoryButton]],
      resize_keyboard: true
    }
  };
};

const mainOptions = [
  [BUTTONS.MY_WORDS, BUTTONS.PRACTICE],
  [BUTTONS.ADD_WORD, BUTTONS.MORE_OPTIONS]
  // [BUTTONS.IMPORT]
];

export const mainKeyboardNewCategory = (categoryName: string): any => {
  return {
    reply_markup: {
      keyboard: [...mainOptions, [formatCategoryButton(categoryName)]],
      resize_keyboard: true
    }
  };
};

export const mainKeyboard = async (userId: number) => await getMainKeyboard(userId);

export const mainKeyboardSecondary = {
  reply_markup: {
    keyboard: [
      [
        // { text: BUTTONS.EDIT_WORD },
        { text: BUTTONS.DELETE_WORD }
      ],
      [{ text: BUTTONS.IMPORT }, { text: BUTTONS.CHANGE_CONTEXT }],
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
