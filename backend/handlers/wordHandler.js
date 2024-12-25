import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';
import { CategoryService } from '../services/categoryService.js';
import { UserService } from '../services/userService.js';
import { StateManager } from '../utils/stateManager.js';

const createCategoryKeyboard = (categories) => {
  const keyboard = categories.map((cat) => [
    {
      text: cat.name
    }
  ]);

  keyboard.push([{ text: '❌ Cancel' }]);

  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: true
  };
};

export const handleAddWord = (bot, supabase) => {
  const categoryService = new CategoryService(supabase);
  const userService = new UserService(supabase);

  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      // Ensure user exists
      await userService.ensureUserExists(msg.from);

      // Handle initial command
      if (text === '/add' || text === '📝 Add Word') {
        const categories = await categoryService.getUserCategories(userId);

        let message;
        if (categories?.length) {
          message = 'Choose a category or type a new category name:';
          const categoryKeyboard = createCategoryKeyboard(categories);
          await bot.sendMessage(chatId, message, { reply_markup: categoryKeyboard });
          StateManager.setState(chatId, 'selecting_category');
        } else {
          message = 'You have no categories yet. Please enter a name for your first category:';
          await bot.sendMessage(chatId, message, cancelKeyboard);
          StateManager.setState(chatId, 'creating_category');
        }
        return;
      }

      // Handle cancel command in any state
      if (text === '❌ Cancel') {
        StateManager.delete(chatId);
        await bot.sendMessage(chatId, 'Operation cancelled.', mainKeyboard);
        return;
      }

      // Get current state
      const userState = StateManager.get(chatId);

      if (!userState) {
        console.log('No state found for chat:', chatId);
        return;
      }

      // Handle state-specific logic
      switch (userState.step) {
        case 'selecting_category':
          const categories = await categoryService.getUserCategories(userId);
          const selectedCategory = categories.find((cat) => cat.name === text);

          try {
            let category;
            if (selectedCategory) {
              category = selectedCategory;
            } else {
              // Create new category if it doesn't exist
              category = await categoryService.createCategory(userId, text);
            }

            StateManager.setState(chatId, 'waiting_word', {
              categoryId: category.id,
              categoryName: category.name
            });

            const message = selectedCategory
              ? `Category: ${category.name}\nPlease enter the word you want to add:`
              : `Category "${category.name}" created!\nPlease enter the word you want to add:`;

            await bot.sendMessage(chatId, message, cancelKeyboard);
          } catch (error) {
            console.error('Error in category selection:', error);
            await bot.sendMessage(
              chatId,
              '❌ Failed to process category. Please try again.',
              mainKeyboard
            );
            StateManager.delete(chatId);
          }
          break;

        case 'creating_category':
          try {
            const categoryName = text.trim();

            if (!categoryName) {
              await bot.sendMessage(chatId, 'Please enter a valid category name.', cancelKeyboard);
              return;
            }

            const category = await categoryService.createCategory(userId, categoryName);

            StateManager.setState(chatId, 'waiting_word', {
              categoryId: category.id,
              categoryName: category.name
            });

            await bot.sendMessage(
              chatId,
              `Category "${category.name}" created!\nPlease enter the word you want to add:`,
              cancelKeyboard
            );
          } catch (error) {
            console.error('Error creating category:', error);
            await bot.sendMessage(
              chatId,
              '❌ Failed to create category. Please try again.',
              mainKeyboard
            );
            StateManager.delete(chatId);
          }
          break;

        case 'waiting_word':
          const word = text.trim();

          if (!word) {
            await bot.sendMessage(chatId, 'Please enter a valid word.', cancelKeyboard);
            return;
          }

          console.log('Before transition - Current state:', userState);

          // Update state for waiting translation
          StateManager.setState(chatId, 'waiting_translation', {
            categoryId: userState.categoryId,
            categoryName: userState.categoryName,
            word
          });

          console.log('After transition - New state:', StateManager.get(chatId));

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
                category_id: userState.categoryId,
                word: userState.word,
                translation: translation,
                created_at: new Date()
              }
            ]);

            if (error) throw error;

            StateManager.delete(chatId);

            await bot.sendMessage(
              chatId,
              `✅ Successfully added to category "${userState.categoryName}":\n${userState.word} - ${translation}`,
              mainKeyboard
            );
          } catch (error) {
            console.error('Error adding word:', error);
            StateManager.delete(chatId);
            await bot.sendMessage(chatId, '❌ Failed to add word. Please try again.', mainKeyboard);
          }
          break;

        default:
          console.error('Invalid state:', userState.step);
          StateManager.delete(chatId);
          await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.', mainKeyboard);
      }
    } catch (error) {
      console.error('Error in word handler:', error);
      StateManager.delete(chatId);
      await bot.sendMessage(chatId, '❌ Failed to add word. Please try again.', mainKeyboard);
    }
  };
};
