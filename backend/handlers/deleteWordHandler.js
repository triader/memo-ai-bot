import { mainKeyboard } from '../utils/keyboards.js';

export const handleDeleteCommand = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Extract word from command using the command parser
  const word = text.split('/delete')[1]?.trim();

  if (!word) {
    await bot.sendMessage(
      chatId,
      '❌ Please specify a word to delete. Usage: /delete [word]',
      mainKeyboard
    );
    return;
  }

  try {
    // First find the word
    const { data: words, error: findError } = await supabase
      .from('words')
      .select('id, word')
      .eq('user_id', userId)
      .ilike('word', word);

    if (findError) {
      console.error('Error finding word:', findError);
      await bot.sendMessage(
        chatId,
        '❌ Failed to find word. Please try again.',
        mainKeyboard
      );
      return;
    }

    if (!words || words.length === 0) {
      await bot.sendMessage(
        chatId,
        `❌ Word "${word}" not found in your dictionary.`,
        mainKeyboard
      );
      return;
    }

    // Then delete it
    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .eq('id', words[0].id);

    

    if (deleteError) {
      console.error('Unexpected error:', words[0].id);
      await bot.sendMessage(
        chatId,
        words[0].id,
        mainKeyboard
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `✅ Successfully deleted "${words[0].word}" from your dictionary.`,
      mainKeyboard
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    await bot.sendMessage(
      chatId,
      '❌ An unexpected error occurred. Please try again.',
      mainKeyboard
    );
  }
};