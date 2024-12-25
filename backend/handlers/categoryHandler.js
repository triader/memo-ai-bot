import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';
import { CategoryService } from '../services/categoryService.js';

// Store category management states
export const categoryStates = new Map();

export const createCategoryKeyboard = (categories) => {
  const keyboard = categories.map((cat) => [{ text: cat.name }]);
  keyboard.push([{ text: '➕ New Category' }]);
  keyboard.push([{ text: '❌ Cancel' }]);
  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: true
  };
};

export const handleCategory = (bot, supabase, userSettingsService) => {
  const categoryService = new CategoryService(supabase);

  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      // Handle initial command
      if (text === '/category' || text === '🔄 Change Category') {
        const categories = await categoryService.getUserCategories(userId);
        const currentCategory = await userSettingsService.getCurrentCategory(userId);

        if (!categories?.length) {
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
        message += '\nSelect a category or create a new one:';

        await bot.sendMessage(chatId, message, {
          reply_markup: createCategoryKeyboard(categories)
        });
        categoryStates.set(chatId, { step: 'selecting_category' });
        return;
      }

      // Handle cancel
      if (text === '❌ Cancel') {
        categoryStates.delete(chatId);
        await bot.sendMessage(chatId, 'Operation cancelled.', mainKeyboard);
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

          const categories = await categoryService.getUserCategories(userId);
          const selectedCategory = categories.find((cat) => cat.name === text);

          if (!selectedCategory) {
            await bot.sendMessage(chatId, '❌ Please select a valid category.', {
              reply_markup: createCategoryKeyboard(categories)
            });
            return;
          }

          userSettingsService.setCurrentCategory(userId, selectedCategory);
          categoryStates.delete(chatId);
          await bot.sendMessage(
            chatId,
            `✅ Current category changed to "${selectedCategory.name}"`,
            mainKeyboard
          );
          break;

        case 'creating_category':
          const categoryName = text.trim();
          if (!categoryName) {
            await bot.sendMessage(chatId, 'Please enter a valid category name.', cancelKeyboard);
            return;
          }

          const category = await categoryService.createCategory(userId, categoryName);
          userSettingsService.setCurrentCategory(userId, category);
          categoryStates.delete(chatId);
          await bot.sendMessage(
            chatId,
            `✅ Category "${category.name}" created and set as current category!`,
            mainKeyboard
          );
          break;
      }
    } catch (error) {
      console.error('Error in category handler:', error);
      await bot.sendMessage(
        chatId,
        '❌ Failed to process category. Please try again.',
        mainKeyboard
      );
      categoryStates.delete(chatId);
    }
  };
};
