import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';
import { CategoryService } from '../services/categoryService.js';
import { UserService } from '../services/userService.js';
import { stateManager } from '../utils/stateManager.js';
import { BUTTONS } from '../constants/buttons.js';

// Store word addition states
const wordStates = new Map();

export const createCategoryKeyboard = (categories) => {
  const keyboard = categories.map((cat) => [{ text: cat.name }]);
  keyboard.push([{ text: BUTTONS.CANCEL }]);
  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: true
  };
};

export const addWordHandler = (bot, supabase, userSettingsService) => {
  const categoryService = new CategoryService(supabase);
  const userService = new UserService(supabase);
  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    try {
      await bot.sendChatAction(chatId, 'typing');
      // Ensure user exists
      await userService.ensureUserExists(msg.from);

      // Handle initial command
      if (text === BUTTONS.ADD_WORD) {
        const currentCategory = await userSettingsService.getCurrentCategory(userId);

        if (currentCategory) {
          // If user has a current category, start word addition directly
          wordStates.set(chatId, {
            step: 'waiting_word',
            categoryId: currentCategory.id,
            categoryName: currentCategory.name
          });
          await bot.sendMessage(
            chatId,
            `Adding word to category "${currentCategory.name}"\nPlease enter the word:`,
            cancelKeyboard
          );
        } else {
          // If no category exists, prompt to create one
          await bot.sendMessage(
            chatId,
            'You have no categories yet. Please enter a name for your first category:',
            cancelKeyboard
          );
          wordStates.set(chatId, { step: 'creating_category' });
        }
        return;
      }

      // Get current state
      const state = wordStates.get(chatId);
      if (!state) return;

      // Handle state-specific logic
      switch (state.step) {
        case 'creating_category':
          const categoryName = text.trim();
          if (!categoryName) {
            await bot.sendMessage(chatId, 'Please enter a valid category name.', cancelKeyboard);
            return;
          }

          const category = await categoryService.createCategory(userId, categoryName);
          await userSettingsService.setCurrentCategory(userId, category.id);

          wordStates.set(chatId, {
            step: 'waiting_word',
            categoryId: category.id,
            categoryName: category.name
          });

          await bot.sendMessage(
            chatId,
            `Category "${category.name}" created!\nPlease enter the word you want to add:`,
            cancelKeyboard
          );
          break;

        case 'waiting_word':
          const word = text.trim();
          if (!word) {
            await bot.sendMessage(chatId, 'Please enter a valid word.', cancelKeyboard);
            return;
          }

          wordStates.set(chatId, {
            ...state,
            step: 'waiting_translation',
            word
          });

          await bot.sendMessage(
            chatId,
            `Great! Now enter the translation for "${word}":`,
            cancelKeyboard
          );
          break;

        case 'waiting_translation':
          const translation = text.trim();
          if (!translation) {
            await bot.sendMessage(chatId, 'Please enter a valid translation.', cancelKeyboard);
            return;
          }

          try {
            const { error } = await supabase.from('words').insert([
              {
                user_id: userId,
                category_id: state.categoryId,
                word: state.word,
                translation,
                created_at: new Date()
              }
            ]);

            if (error) throw error;

            const keyboard = await mainKeyboard(userId);
            await bot.sendMessage(chatId, `✅ Word added successfully!`, keyboard);
            wordStates.delete(chatId);
            stateManager.clearState();
          } catch (error) {
            console.error('Error adding word:', error);
            const keyboard = await mainKeyboard(userId);
            await bot.sendMessage(chatId, '❌ Failed to add word. Please try again.', keyboard);
            wordStates.delete(chatId);
            stateManager.clearState();
          }
          break;
      }
    } catch (error) {
      console.error('Error in word handler:', error);
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, '❌ Failed to add word. Please try again.', keyboard);
      wordStates.delete(chatId);
      stateManager.clearState();
    }
  };
};
