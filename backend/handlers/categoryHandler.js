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
  includeNew = false,
  includeEdit = false
) => {
  const keyboard = categories.map((cat) => [
    {
      text: `${cat.name} ${cat.id === currentCategory?.id ? '✅' : ''}`
    }
  ]);
  const bottomRow = [];
  if (includeNew) bottomRow.push({ text: BUTTONS.NEW_CATEGORY });
  if (includeEdit) bottomRow.push({ text: BUTTONS.EDIT_CATEGORY });
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
    if (text === BUTTONS.MANAGE_CATEGORY) {
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
        reply_markup: createCategoryKeyboard(categories, currentCategory, true, true, true)
      });

      categoryStates.set(chatId, { step: 'selecting_category' });
      return;
    }

    // Get current state
    const state = categoryStates.get(chatId);
    if (!state) return;

    switch (state.step) {
      case 'selecting_category':
        categories = await categoryService.getUserCategories(userId);
        const { currentCategory: dbCurrentCategory } =
          await userSettingsService.getCurrentCategory(userId);
        currentCategory = dbCurrentCategory;

        const selectedCategory = categories.find((cat) => cat.name === text);
        console.log('Found category:', selectedCategory);

        if (selectedCategory?.id === currentCategory?.id) {
          console.log('Same category selected, returning');
          return;
        }

        if (text === BUTTONS.EDIT_CATEGORY) {
          const categories = await categoryService.getUserCategories(userId);
          const inlineKeyboard = categories.map((cat) => [
            {
              text: cat.name,
              callback_data: `edit_category_${cat.id}`
            }
          ]);
          inlineKeyboard.push([{ text: BUTTONS.CANCEL, callback_data: 'cancel_edit' }]);

          await bot.sendMessage(chatId, 'Select a category to edit:', {
            reply_markup: {
              inline_keyboard: inlineKeyboard
            }
          });
          return;
        }

        if (text === BUTTONS.NEW_CATEGORY) {
          await bot.sendMessage(
            chatId,
            'Please enter a name for the new category:',
            cancelKeyboard
          );
          categoryStates.set(chatId, { step: 'creating_category' });
          return;
        }

        if (text === BUTTONS.DELETE_CATEGORY) {
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
            reply_markup: createCategoryKeyboard(categories, undefined, true)
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

      case 'saving_edited_category':
        const newName = text.trim();
        if (!newName) {
          await bot.sendMessage(chatId, '❌ Please enter a valid name.', cancelKeyboard);
          return;
        }

        try {
          await supabase
            .from('categories')
            .update({ name: newName })
            .eq('id', state.categoryToEdit.id)
            .eq('user_id', userId);

          await bot.sendMessage(chatId, `✅ Category renamed to "${newName}"`, mainKeyboard);
          categoryStates.delete(chatId);
          stateManager.setState(BotState.IDLE);
        } catch (error) {
          console.error('Error editing category:', error);
          await bot.sendMessage(
            chatId,
            '❌ Failed to edit category. Please try again.',
            mainKeyboard
          );
          categoryStates.delete(chatId);
        }
        break;
    }
  } catch (error) {
    console.error('Error in category handler:', error);
    await bot.sendMessage(chatId, '❌ Failed to process category. Please try again.', mainKeyboard);
    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  }
};

export const handleCategoryCallback = (bot) => async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;

  try {
    if (callbackQuery.data.startsWith('edit_category_')) {
      const categoryId = callbackQuery.data.replace('edit_category_', '');
      await bot.sendMessage(chatId, 'Enter new name for the category:', cancelKeyboard);
      categoryStates.set(chatId, {
        step: 'saving_edited_category',
        categoryToEdit: { id: categoryId }
      });
      await bot.deleteMessage(chatId, callbackQuery.message.message_id);
      await bot.answerCallbackQuery(callbackQuery.id);
    } else if (callbackQuery.data === 'cancel_edit') {
      await bot.deleteMessage(chatId, callbackQuery.message.message_id);
      await bot.answerCallbackQuery(callbackQuery.id);
      categoryStates.delete(chatId);
      await bot.sendMessage(chatId, 'Category editing cancelled', mainKeyboard);
      stateManager.setState(BotState.IDLE);
    }
  } catch (error) {
    console.error('Error in category callback handler:', error);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', mainKeyboard);
    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  }
};
