import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';

const userStates = new Map();

export const handleAddWord = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  try {
    // Handle initial command
    if (text === '/add' || text === '📝 Add Word') {
      // First, fetch categories
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);
      console.log("chat id", chatId);
      console.log("user id", userId);
console.log("available categories", categories);
      userStates.set(chatId, { step: 'selecting_category' });
      
      let message = 'Choose a category or create a new one:\n\n';
      if (categories?.length) {
        message += categories.map((cat, i) => `${i + 1}. ${cat.name}`).join('\n');
        message += '\n\n✨ Or type a new category name to create one';
      } else {
        message += 'Type a category name to create your first category';
      }

      await bot.sendMessage(chatId, message, cancelKeyboard);
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

        let selectedCategory;
        
        // Check if user selected existing category by number
        if (/^\d+$/.test(text)) {
          const index = parseInt(text) - 1;
          selectedCategory = categories?.[index];
        }
        
        if (!selectedCategory) {
          // Create new category
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert([{
              user_id: userId,
              name: text.trim()
            }])
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

        const { error } = await supabase
          .from('words')
          .insert([{
            user_id: userId,
            category_id: userState.categoryId,
            word: userState.word,
            translation: translation,
            created_at: new Date()
          }]);

        if (error) throw error;

        userStates.delete(chatId);
        await bot.sendMessage(
          chatId,
          `✅ Successfully added to category "${userState.categoryName}":\n${userState.word} - ${translation}`,
          mainKeyboard
        );
        break;

      default:
        console.error('Invalid state:', userState.step);
        userStates.delete(chatId);
        await bot.sendMessage(
          chatId,
          '❌ Something went wrong. Please try again.',
          mainKeyboard
        );
    }
  } catch (error) {
    console.error('Error in word handler:', error);
    userStates.delete(chatId);
    await bot.sendMessage(
      chatId,
      '❌ Failed to add word. Please try again.',
      mainKeyboard
    );
  }
};