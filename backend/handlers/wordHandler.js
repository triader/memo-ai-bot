import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';

const userStates = new Map();

// Add this new function to create category keyboard
const createCategoryKeyboard = (categories) => {
  const keyboard = categories.map((cat) => [
    {
      text: cat.name
    }
  ]);

  // Add a cancel button at the bottom
  keyboard.push([{ text: '❌ Cancel' }]);

  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: true
  };
};

export const handleAddWord = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  try {
    // First, ensure user exists in telegram_users table
    const { data: existingUser, error: userError } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (!existingUser) {
      // Create new user if doesn't exist
      const { error: createError } = await supabase.from('telegram_users').insert([
        {
          telegram_id: userId,
          username: msg.from.username,
          first_name: msg.from.first_name,
          last_name: msg.from.last_name
        }
      ]);

      if (createError) throw createError;
    }

    // Handle initial command
    if (text === '/add' || text === '📝 Add Word') {
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      userStates.set(chatId, { step: 'selecting_category' });

      let message;
      if (categories?.length) {
        message = 'Choose a category or type a new category name:';
        // Create custom keyboard with categories
        const categoryKeyboard = createCategoryKeyboard(categories);
        await bot.sendMessage(chatId, message, { reply_markup: categoryKeyboard });
      } else {
        message = 'You have no categories yet. Please enter a name for your first category:';
        userStates.set(chatId, {
          step: 'creating_category'
        });
        await bot.sendMessage(chatId, message, cancelKeyboard);
      }
      return;
    }

    // Get current state
    const userState = userStates.get(chatId);

    if (!userState) {
      console.log('No state found for chat:', chatId);
      return;
    }

    // Handle cancel command in any state
    if (text === '❌ Cancel') {
      userStates.delete(chatId);
      await bot.sendMessage(chatId, 'Operation cancelled.', mainKeyboard);
      return;
    }

    // Handle state-specific logic
    switch (userState.step) {
      case 'selecting_category':
        const { data: categories } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId);

        let selectedCategory = categories?.find((cat) => cat.name === text);

        if (!selectedCategory) {
          // Create new category if text doesn't match existing category
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert([
              {
                user_id: userId,
                name: text.trim()
              }
            ])
            .select()
            .single();

          if (categoryError) throw categoryError;
          selectedCategory = newCategory;
        }

        userStates.set(chatId, {
          step: 'waiting_word',
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name
        });

        await bot.sendMessage(
          chatId,
          `Category: ${selectedCategory.name}\nPlease enter the word you want to add:`,
          cancelKeyboard
        );
        break;

      case 'waiting_word':
        const word = text.trim();

        if (!word) {
          await bot.sendMessage(chatId, 'Please enter a valid word.', cancelKeyboard);
          return;
        }

        userStates.set(chatId, {
          ...userState,
          step: 'waiting_translation',
          word: word
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

        userStates.delete(chatId);
        await bot.sendMessage(
          chatId,
          `✅ Successfully added to category "${userState.categoryName}":\n${userState.word} - ${translation}`,
          mainKeyboard
        );
        break;

      case 'creating_category':
        try {
          const categoryName = text.trim();

          if (!categoryName) {
            await bot.sendMessage(chatId, 'Please enter a valid category name.', cancelKeyboard);
            return;
          }

          // Create new category
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert([
              {
                user_id: userId,
                name: categoryName
              }
            ])
            .select()
            .single();

          if (categoryError) throw categoryError;

          userStates.set(chatId, {
            step: 'waiting_word',
            categoryId: newCategory.id,
            categoryName: newCategory.name
          });

          await bot.sendMessage(
            chatId,
            `Category "${newCategory.name}" created!\nPlease enter the word you want to add:`,
            cancelKeyboard
          );
        } catch (error) {
          console.error('Error creating category:', error);
          await bot.sendMessage(
            chatId,
            '❌ Failed to create category. Please try again.',
            mainKeyboard
          );
          userStates.delete(chatId);
        }
        break;

      default:
        console.error('Invalid state:', userState.step);
        userStates.delete(chatId);
        await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.', mainKeyboard);
    }
  } catch (error) {
    console.error('Error in word handler:', error);
    userStates.delete(chatId);
    await bot.sendMessage(chatId, '❌ Failed to add word. Please try again.', mainKeyboard);
  }
};
