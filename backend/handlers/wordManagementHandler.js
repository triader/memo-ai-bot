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
          mainKeyboard
        );
        return;
      }

      // Format words list with progress
      const wordsList = words
        .map((w) => {
          const progress = w.mastery_level || 0;
          const progressEmoji = progress >= 90 ? '🌟' : progress >= 50 ? '📈' : '🔄';
          const correctAnswers = w.correct_answers || 0;
          const incorrectAnswers = w.incorrect_answers || 0;
          const totalAttempts = correctAnswers + incorrectAnswers;

          return (
            `${w.word} - ${w.translation}\n` +
            `${progressEmoji} Progress: ${progress}% ` +
            `(✅${correctAnswers} ❌${incorrectAnswers})`
          );
        })
        .join('\n\n');

      const message =
        `📚 Words in category "${currentCategory.name}":\n\n` +
        `${wordsList}\n\n` +
        `Legend:\n` +
        `🌟 - Mastered (90%+)\n` +
        `📈 - Learning (50-89%)\n` +
        `🔄 - Needs practice (0-49%)`;

      await bot.sendMessage(chatId, message, mainKeyboard);
    } catch (error) {
      console.error('Error fetching words:', error);
      await bot.sendMessage(chatId, '❌ Failed to fetch words. Please try again.', mainKeyboard);
    }
  };
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
