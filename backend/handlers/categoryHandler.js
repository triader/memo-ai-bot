import { mainKeyboard, cancelKeyboard, mainKeyboardNewCategory } from '../utils/keyboards.js';
import { CategoryService } from '../services/categoryService.js';
import { BotState, stateManager } from '../utils/stateManager.js';

// Store category management states
export const categoryStates = new Map();

export const updateManageCategoryButton = async (userId, userSettingsService) => {
  const { currentCategory } = await userSettingsService.getCurrentCategory(userId);
  return `📚 ${currentCategory?.name || 'Select Category'}`;
};

export const categoryHandler = (bot, supabase, userSettingsService) => async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;
  const categoryService = new CategoryService(supabase);
  try {
    await bot.sendChatAction(chatId, 'typing');
    // Check if the text starts with "📚" to handle category management
    if (text.startsWith('📚')) {
      const categories = await categoryService.getUserCategories(userId);
      const { currentCategory } = await userSettingsService.getCurrentCategory(userId);

      if (!categories?.length) {
        await bot.sendMessage(
          chatId,
          'You have no categories yet. Please enter a name for your first category:',
          cancelKeyboard
        );
        categoryStates.set(chatId, { step: 'creating_category' });
        return;
      }

      // Create inline keyboard for categories with edit/delete buttons on separate rows
      const inlineKeyboard = categories.flatMap((cat) => [
        // Category name row
        [
          {
            text: `${cat.name}${cat.id === currentCategory?.id ? ' ✅' : ''}`,
            callback_data: `select_category_${cat.id}`
          }
        ],
        // Edit/Delete buttons row
        [
          {
            text: '✏️ Edit',
            callback_data: `edit_category_${cat.id}`
          },
          {
            text: '🗑️ Delete',
            callback_data: `delete_category_${cat.id}`
          }
        ]
      ]);

      // Add only the new category button at the bottom
      inlineKeyboard.push([
        {
          text: '➕ New Category',
          callback_data: 'new_category'
        }
      ]);

      await bot.sendMessage(chatId, '📚 Choose a category:', {
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
      return;
    }

    // Get current state
    const state = categoryStates.get(chatId);
    if (!state) return;

    switch (state.step) {
      case 'selecting_category':
        const categories = await categoryService.getUserCategories(userId);
        const { currentCategory } = await userSettingsService.getCurrentCategory(userId);

        const selectedCategory = categories.find((cat) => cat.name === text);
        console.log('Found category:', selectedCategory);

        if (selectedCategory?.id === currentCategory?.id) {
          console.log('Same category selected, returning');
          return;
        }

        await userSettingsService.setCurrentCategory(userId, selectedCategory.id);
        categoryStates.delete(chatId);
        await bot.sendMessage(
          chatId,
          `✅ Current category changed to "${selectedCategory.name}"`,
          mainKeyboardNewCategory(selectedCategory.name)
        );
        stateManager.setState(BotState.IDLE);
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
          const keyboard = await mainKeyboard(userId);

          await bot.sendMessage(
            chatId,
            `✅ Category "${catToDelete.name}" and all its words have been deleted.`,
            keyboard
          );
          categoryStates.delete(chatId);
          stateManager.setState(BotState.IDLE);
        } catch (error) {
          console.error('Error deleting category:', error);
          const keyboard = await mainKeyboard(userId);
          await bot.sendMessage(
            chatId,
            '❌ Failed to delete category. Please try again.',
            keyboard
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
        const keyboard = await mainKeyboard(userId);
        await bot.sendMessage(chatId, `✅ Category "${category.name}" created!`, keyboard);
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

          const keyboard = await mainKeyboard(userId);
          await bot.sendMessage(chatId, `✅ Category renamed to "${newName}"`, keyboard);
          categoryStates.delete(chatId);
          stateManager.setState(BotState.IDLE);
        } catch (error) {
          console.error('Error editing category:', error);
          const keyboard = await mainKeyboard(userId);
          await bot.sendMessage(chatId, '❌ Failed to edit category. Please try again.', keyboard);
          categoryStates.delete(chatId);
        }
        break;
    }
  } catch (error) {
    console.error('Error in category handler:', error);
    const keyboard = await mainKeyboard(userId);
    await bot.sendMessage(chatId, '❌ Failed to process category. Please try again.', keyboard);
    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  }
};

export const handleCategoryCallback =
  (bot, supabase, userSettingsService) => async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const categoryService = new CategoryService(supabase);
    const keyboard = await mainKeyboard(userId);

    try {
      if (callbackQuery.data.startsWith('select_category_')) {
        const categoryId = callbackQuery.data.replace('select_category_', '');
        await userSettingsService.setCurrentCategory(userId, categoryId);

        const category = (await categoryService.getUserCategories(userId)).find(
          (cat) => cat.id === categoryId
        );

        await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        await bot.sendMessage(
          chatId,
          `✅ Current category changed to "${category.name}"`,
          mainKeyboardNewCategory(category.name)
        );
        await bot.answerCallbackQuery(callbackQuery.id);
        stateManager.setState(BotState.IDLE);
      } else if (callbackQuery.data === 'new_category') {
        await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        await bot.sendMessage(chatId, 'Please enter a name for the new category:', cancelKeyboard);
        categoryStates.set(chatId, { step: 'creating_category' });
        await bot.answerCallbackQuery(callbackQuery.id);
      } else if (callbackQuery.data.startsWith('edit_category_')) {
        const categoryId = callbackQuery.data.replace('edit_category_', '');
        await bot.sendMessage(chatId, 'Enter new name for the category:', cancelKeyboard);
        categoryStates.set(chatId, {
          step: 'saving_edited_category',
          categoryToEdit: { id: categoryId }
        });
        await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        await bot.answerCallbackQuery(callbackQuery.id);
      } else if (callbackQuery.data.startsWith('delete_category_')) {
        const categoryId = callbackQuery.data.replace('delete_category_', '');
        const categories = await categoryService.getUserCategories(userId);

        if (categories.length === 1) {
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: "❌ Can't delete the last category. Create a new category first.",
            show_alert: true
          });
          return;
        }

        const category = categories.find((cat) => cat.id === categoryId);
        await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        await bot.sendMessage(
          chatId,
          `⚠️ This action cannot be undone!\n\nTo delete category "${category.name}" and all its words, please type the category name to confirm:`,
          cancelKeyboard
        );
        categoryStates.set(chatId, {
          step: 'confirming_delete',
          categoryToDelete: category
        });
        await bot.answerCallbackQuery(callbackQuery.id);
      }
    } catch (error) {
      console.error('Error in category callback handler:', error);
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
      categoryStates.delete(chatId);
      stateManager.setState(BotState.IDLE);
    }
  };
