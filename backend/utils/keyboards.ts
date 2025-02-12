import { supabase } from '../config';
import { BUTTONS } from '../constants';
import { userSettingsService, wordsService } from '../server';
import { Category, CategoryService } from '../services';

// Helper function to get the current category button text
const getCategoryButtonText = async (userId: number, currentCategory: Category) => {
  const totalWordsCount = await wordsService.getTotalWordsCount(userId, currentCategory.id);
  return `📚 ${currentCategory?.name} (${totalWordsCount})`;
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

  const currentCategory = await userSettingsService.getCurrentCategory(userId);
  if (!currentCategory?.id) {
    return {
      reply_markup: {
        keyboard: [...mainOptions],
        resize_keyboard: true
      }
    };
  }
  const categoryButton = await getCategoryButtonText(userId, currentCategory);

  const levels = await categoryService.getLevelsForCategory(currentCategory.id);
  if (levels.length === 0) {
    return {
      reply_markup: {
        keyboard: [...mainOptions, [categoryButton]],
        resize_keyboard: true
      }
    };
  }
  const levelProgress = await categoryService.getLevelProgress(currentCategory);

  return {
    reply_markup: {
      keyboard: [...mainOptions, [categoryButton], [levelProgress]],
      resize_keyboard: true
    }
  };
};

const mainOptions = [
  [BUTTONS.MY_WORDS, BUTTONS.PRACTICE],
  [BUTTONS.ADD_WORD, BUTTONS.MORE_OPTIONS]
  // [BUTTONS.IMPORT]
];

export const mainKeyboard = async (userId: number) => await getMainKeyboard(userId);

export const mainKeyboardSecondary = {
  reply_markup: {
    keyboard: [
      [
        { text: BUTTONS.SET_WORDS_PER_LEVEL },
        // { text: BUTTONS.EDIT_WORD },
        { text: BUTTONS.DELETE_WORD }
      ],
      [{ text: BUTTONS.IMPORT }, { text: BUTTONS.CHANGE_CONTEXT }],
      [{ text: BUTTONS.RESET_PROGRESS }],
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

// Function to generate inline keyboard for levels
export const getLevelSelectionKeyboard = async (
  categoryId: string,
  currentLevel: Category['current_level']
): Promise<any> => {
  const categoryService = new CategoryService(supabase);
  const levels = await categoryService.getLevelsForCategory(categoryId);

  // Create a vertical inline keyboard with each level on a new line
  const inlineKeyboard = levels.map((level) => [
    {
      text: level === currentLevel ? `✅ Level ${level}` : `Level ${level}`,
      callback_data: `select_level_${level}`
    }
  ]);

  return {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };
};
