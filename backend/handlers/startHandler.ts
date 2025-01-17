import { mainKeyboard } from '../utils';
import { categoryStates } from '../features';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { categoryService, userSettingsService } from '../server';
import { supabase } from '../config';

export const startHandler = (bot: TelegramBot) => async (msg: Message) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  if (!userId || !chatId) return;

  try {
    // Check if user has settings
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!existingSettings) {
      // Create initial user settings
      await userSettingsService.createInitialSettings(userId);
    }

    const hasCategories = await categoryService.hasCategories(userId);
    const keyboard = await mainKeyboard(userId);

    if (!hasCategories) {
      // New user without categories - go straight to category creation
      await bot.sendMessage(
        chatId,
        'Welcome to the Language Learning Bot! 🎉\n\n' +
          "To get started, let's create your first category.\n" +
          'Categories help you organize your words (e.g., "Verbs", "Food", "Travel").\n\n' +
          'Please enter a name for your first category:',
        keyboard
      );
      categoryStates.set(chatId, { step: 'creating_category' });
    } else {
      // Existing user with categories
      await bot.sendMessage(chatId, 'Welcome back to the Language Learning Bot! 📚', keyboard);
    }
  } catch (error) {
    console.error('Error in start handler:', error);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try /start again.');
  }
};
