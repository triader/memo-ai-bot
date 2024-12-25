import { createWordActionsKeyboard, mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';

export const handleMyWords = (bot, supabase, userSettingsService) => {
  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const currentCategory = await userSettingsService.getCurrentCategory(userId);

      if (!currentCategory) {
        await bot.sendMessage(chatId, 'You need to add some words first!', mainKeyboard);
        return;
      }

      // Get words for current category
      const { data: words, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', currentCategory.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!words?.length) {
        await bot.sendMessage(
          chatId,
          `No words found in category "${currentCategory.name}". Add some words first!`,
          mainKeyboard
        );
        return;
      }

      // Format words list
      const wordsList = words.map((w) => `${w.word} - ${w.translation}`).join('\n');

      await bot.sendMessage(
        chatId,
        `📚 Words in category "${currentCategory.name}":\n\n${wordsList}`,
        mainKeyboard
      );
    } catch (error) {
      console.error('Error fetching words:', error);
      await bot.sendMessage(chatId, '❌ Failed to fetch words. Please try again.', mainKeyboard);
    }
  };
};

export const handleWordEdit = (bot, supabase) => async (msg, wordId) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const { data: word } = await supabase
      .from('words')
      .select('*')
      .eq('id', wordId)
      .eq('user_id', userId)
      .single();

    if (!word) {
      await bot.sendMessage(chatId, '❌ Word not found.');
      return;
    }

    await bot.sendMessage(
      chatId,
      `Enter new translation for "${word.word}" in format:\n${word.word} - new_translation`,
      cancelKeyboard
    );

    // Set user state for editing
    return { state: 'editing_word', wordId };
  } catch (error) {
    console.error('Error editing word:', error);
    await bot.sendMessage(chatId, '❌ Failed to edit word.');
  }
};

export const handleWordDelete = (bot, supabase) => async (msg, wordId) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const { error } = await supabase.from('words').delete().eq('id', wordId).eq('user_id', userId);

    if (error) throw error;

    await bot.sendMessage(chatId, '✅ Word deleted successfully.', mainKeyboard);
  } catch (error) {
    console.error('Error deleting word:', error);
    await bot.sendMessage(chatId, '❌ Failed to delete word.');
  }
};
