import { mainKeyboard } from '../utils/keyboards.js';
import { CategoryService } from '../services/categoryService.js';
import { categoryStates } from './categoryHandler.js';

export const startHandler = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const categoryService = new CategoryService(supabase);

  try {
    const hasCategories = await categoryService.hasCategories(userId);

    if (!hasCategories) {
      // New user without categories - go straight to category creation
      await bot.sendMessage(
        chatId,
        'Welcome to the Language Learning Bot! 🎉\n\n' +
          "To get started, let's create your first category.\n" +
          'Categories help you organize your words (e.g., "Verbs", "Food", "Travel").\n\n' +
          'Please enter a name for your first category:'
      );
      categoryStates.set(chatId, { step: 'creating_category' });
    } else {
      // Existing user with categories
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, 'Welcome back to the Language Learning Bot! 📚', keyboard);
    }
  } catch (error) {
    console.error('Error in start handler:', error);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try /start again.');
  }
};
