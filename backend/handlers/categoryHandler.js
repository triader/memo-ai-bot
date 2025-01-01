import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';
import { CategoryService } from '../services/categoryService.js';
import { BotState, stateManager } from '../utils/stateManager.js';
import { BUTTONS } from '../constants/buttons.js';

// Store category management states
export const categoryStates = new Map();

export const createCategoryKeyboard = (
  categories,
  currentCategory,
  includeDelete = false,
  includeNew = false
) => {
  const keyboard = categories.map((cat) => [
    {
      text: `${cat.name} ${cat.id === currentCategory?.id ? '✅' : ''}`
    }
  ]);
  const bottomRow = [];
  if (includeNew) bottomRow.push({ text: BUTTONS.NEW_CATEGORY });
  if (includeDelete) bottomRow.push({ text: BUTTONS.DELETE_CATEGORY });
  if (bottomRow.length) keyboard.push(bottomRow);

  keyboard.push([{ text: BUTTONS.CANCEL }]);

  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: true
  };
};

export const categoryHandler = (bot, supabase, userSettingsService) => async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  const categoryService = new CategoryService(supabase);
  let currentCategory = undefined;
  let categories = [];

  try {
    await bot.sendChatAction(chatId, 'typing');
    if (text === BUTTONS.CHANGE_CATEGORY) {
      categories = await categoryService.getUserCategories(userId);
      const { currentCategory: dbCurrentCategory } =
        await userSettingsService.getCurrentCategory(userId);
      currentCategory = dbCurrentCategory;
      if (!categories?.length && !currentCategory) {
        await bot.sendMessage(
          chatId,
          'You have no categories yet. Please enter a name for your first category:',
          cancelKeyboard
        );
        categoryStates.set(chatId, { step: 'creating_category' });
        return;
      }

      let message = '📚 Your categories:\n\n';
      categories.forEach((cat) => {
        message += `${cat.name}${cat.id === currentCategory?.id ? ' ✅' : ''}\n`;
      });
      message += '\nSelect a category, create new, or delete existing:';

      await bot.sendMessage(chatId, message, {
        reply_markup: createCategoryKeyboard(categories, currentCategory, true, true)
      });

      categoryStates.set(chatId, { step: 'selecting_category' });
      return;
    }

    // Get current state
    const state = categoryStates.get(chatId);
    if (!state) return;

    switch (state.step) {
      case 'selecting_category':
        if (text === '➕ New Category') {
          await bot.sendMessage(
            chatId,
            'Please enter a name for the new category:',
            cancelKeyboard
          );
          categoryStates.set(chatId, { step: 'creating_category' });
          return;
        }

        if (text === '🗑️ Delete Category') {
          const categories = await categoryService.getUserCategories(userId);

          if (categories.length === 1) {
            await bot.sendMessage(
              chatId,
              "❌ Can't delete the last category. Create a new category first.",
              mainKeyboard
            );
            categoryStates.delete(chatId);
            return;
          }

          await bot.sendMessage(chatId, 'Select a category to delete:', {
            reply_markup: createCategoryKeyboard(categories)
          });
          categoryStates.set(chatId, { step: 'deleting_category' });
          return;
        }

        const selectedCategory = categories.find((cat) => cat.name === text);
        //TODO: fix this
        //@ts-ignore
        if (selectedCategory?.id === currentCategory?.id) {
          return;
        }

        if (!selectedCategory) {
          await bot.sendMessage(chatId, '❌ Please select a valid category.', {
            reply_markup: createCategoryKeyboard(categories)
          });
          return;
        }
        await userSettingsService.setCurrentCategory(userId, selectedCategory.id);
        categoryStates.delete(chatId);
        await bot.sendMessage(
          chatId,
          `✅ Current category changed to "${selectedCategory.name}"`,
          mainKeyboard
        );
        stateManager.setState(BotState.IDLE);
        break;

      case 'deleting_category':
        const categoriesToDelete = await categoryService.getUserCategories(userId);
        const categoryToDelete = categoriesToDelete.find((cat) => cat.name === text);

        if (!categoryToDelete) {
          await bot.sendMessage(chatId, '❌ Please select a valid category.', {
            reply_markup: createCategoryKeyboard(categoriesToDelete, undefined, true)
          });
          return;
        }

        // Store category to delete in state and ask for confirmation
        categoryStates.set(chatId, {
          step: 'confirming_delete',
          categoryToDelete
        });

        await bot.sendMessage(
          chatId,
          `⚠️ This action cannot be undone!\n\nTo delete category "${categoryToDelete.name}" and all its words, please type the category name to confirm:`,
          cancelKeyboard
        );
        break;

      case 'confirming_delete':
        const { categoryToDelete: catToDelete } = state;

        if (text !== catToDelete.name) {
          await bot.sendMessage(
            chatId,
            `❌ Category name doesn't match. Please type "${catToDelete.name}" exactly to confirm deletion, or press Cancel.`,
            cancelKeyboard
          );
          return;
        }

        try {
          // Delete all words in the category
          await supabase
            .from('words')
            .delete()
            .eq('category_id', catToDelete.id)
            .eq('user_id', userId);

          // Delete the category
          await supabase.from('categories').delete().eq('id', catToDelete.id).eq('user_id', userId);

          // If this was the current category, set a different one as current
          const { currentCategory } = await userSettingsService.getCurrentCategory(userId);
          if (currentCategory?.id === catToDelete.id) {
            const categories = await categoryService.getUserCategories(userId);
            const remainingCategories = categories.filter((cat) => cat.id !== catToDelete.id);
            await userSettingsService.setCurrentCategory(userId, remainingCategories[0].id);
          }

          await bot.sendMessage(
            chatId,
            `✅ Category "${catToDelete.name}" and all its words have been deleted.`,
            mainKeyboard
          );
          categoryStates.delete(chatId);
          stateManager.setState(BotState.IDLE);
        } catch (error) {
          console.error('Error deleting category:', error);
          await bot.sendMessage(
            chatId,
            '❌ Failed to delete category. Please try again.',
            mainKeyboard
          );
          categoryStates.delete(chatId);
        }
        break;

      case 'creating_category':
        const categoryName = text.trim();
        if (!categoryName) {
          await bot.sendMessage(chatId, 'Please enter a valid category name.', cancelKeyboard);
          return;
        }

        const category = await categoryService.createCategory(userId, categoryName);
        await userSettingsService.setCurrentCategory(userId, category);
        categoryStates.delete(chatId);
        await bot.sendMessage(
          chatId,
          `✅ Category "${category.name}" created and set as current category!`,
          mainKeyboard
        );
        stateManager.setState(BotState.IDLE);
        break;
    }
  } catch (error) {
    console.error('Error in category handler:', error);
    await bot.sendMessage(chatId, '❌ Failed to process category. Please try again.', mainKeyboard);
    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  }
};
