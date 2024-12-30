import { MESSAGES } from '../constants/messages.js';
import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';
import { stateManager } from '../utils/stateManager.js';

// Store delete states
export const deleteStates = new Map();

export const deleteWordHandler = (bot, supabase) => {
  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      let state = deleteStates.get(chatId);

      // Direct delete command with word
      if (text.startsWith('/delete')) {
        const directWord = text.replace('/delete', '').trim();
        if (directWord) {
          await findAndDeleteWord(chatId, userId, directWord, bot, supabase);
          return;
        }
      }

      // Initial command handling
      if (text === '🗑️ Delete word') {
        deleteStates.set(chatId, { step: 'waiting_for_word' });
        await bot.sendMessage(chatId, MESSAGES.PROMPTS.DELETE_WHICH_WORD, cancelKeyboard);
        return;
      }

      // Get updated state (in case it was just set)
      state = deleteStates.get(chatId);

      // If no state, ignore the message
      if (!state) {
        return;
      }

      // Handle word to delete
      if (state.step === 'waiting_for_word') {
        await findAndDeleteWord(chatId, userId, text, bot, supabase);
        deleteStates.delete(chatId);
        stateManager.clearState();
      }
    } catch (error) {
      console.error('Error in word delete:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, mainKeyboard);
      deleteStates.delete(chatId);
      stateManager.clearState();
    }
  };
};

// Helper function to find and delete word
async function findAndDeleteWord(chatId, userId, wordToDelete, bot, supabase) {
  // Find the word in database
  const { data: words, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .ilike('word', wordToDelete)
    .limit(1);

  if (error || !words?.length) {
    await bot.sendMessage(chatId, MESSAGES.ERRORS.WORD_NOT_FOUND, mainKeyboard);
    return;
  }

  const wordData = words[0];

  // Delete the word
  const { error: deleteError } = await supabase
    .from('words')
    .delete()
    .eq('id', wordData.id)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw deleteError;
  }

  await bot.sendMessage(chatId, MESSAGES.SUCCESS.WORD_DELETED(wordData.word), mainKeyboard);
}
