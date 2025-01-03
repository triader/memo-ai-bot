import { mainKeyboard } from '../utils/keyboards.js';

export const myWordsHandler = (bot, supabase, userSettingsService) => {
  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const keyboard = await mainKeyboard(userId);

    try {
      const { currentCategory } = await userSettingsService.getCurrentCategory(userId);

      if (!currentCategory) {
        await bot.sendMessage(chatId, 'You need to add some words first!', keyboard);
        return;
      }

      // Get words for current category with progress info
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
          keyboard
        );
        return;
      }

      // Format words list with progress
      const wordsList = words
        .map((w) => {
          const progress = w.mastery_level || 0;
          const progressEmoji = progress >= 90 ? '🌟' : progress >= 50 ? '📈' : '🔄';

          return `${w.word} - ${w.translation}\n` + `${progressEmoji} Progress: ${progress}% `;
        })
        .join('\n\n');

      const message =
        `📚 Words in category "${currentCategory.name}":\n\n` +
        `${wordsList}\n\n` +
        `Legend:\n` +
        `🌟 - Mastered (90%+)\n` +
        `📈 - Learning (50-89%)\n` +
        `🔄 - Needs practice (0-49%)`;

      await bot.sendMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Error fetching words:', error);
      await bot.sendMessage(chatId, '❌ Failed to fetch words. Please try again.', keyboard);
    }
  };
};

export const handleWordDelete = (bot, supabase) => async (msg, wordId) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const keyboard = await mainKeyboard(userId);

  try {
    const { error } = await supabase.from('words').delete().eq('id', wordId).eq('user_id', userId);

    if (error) throw error;

    await bot.sendMessage(chatId, '✅ Word deleted successfully.', keyboard);
  } catch (error) {
    console.error('Error deleting word:', error);
    await bot.sendMessage(chatId, '❌ Failed to delete word.', keyboard);
  }
};
