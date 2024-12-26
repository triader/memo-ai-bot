import { MESSAGES } from '../constants/messages.js';
import { mainKeyboardPrimary as mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';

// Store edit states
const editStates = new Map();

export const handleWordEdit = (bot, supabase) => {
  return async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      console.log('Edit handler called with:', { text, match, state: editStates.get(chatId) });

      // Handle cancel command
      if (text === '❌ Cancel') {
        editStates.delete(chatId);
        await bot.sendMessage(chatId, MESSAGES.ERRORS.EDIT_CANCELLED, mainKeyboard);
        return;
      }

      // Get current state
      let state = editStates.get(chatId);
      console.log('Current state:', state);

      // Initial command handling
      if (text === '/edit' || text === '✏️ Edit word') {
        console.log('Starting edit process');
        editStates.set(chatId, { step: 'waiting_for_word' });
        await bot.sendMessage(chatId, MESSAGES.PROMPTS.EDIT_WHICH_WORD, cancelKeyboard);
        return;
      }

      // Direct word edit command
      const directWord = match ? match[1]?.trim() : null;
      if (directWord) {
        console.log('Direct word edit:', directWord);
        await findAndSetupWordEdit(chatId, userId, directWord, bot, supabase);
        return;
      }

      // If no state and not a command, ignore the message
      if (!state) {
        console.log('No state found, ignoring message');
        return false; // Message not handled
      }

      // Process based on current state
      console.log('Processing state:', state.step);

      if (state.step === 'waiting_for_word') {
        console.log('Processing word to edit:', text);
        await findAndSetupWordEdit(chatId, userId, text, bot, supabase);
        return true;
      }

      if (state.step === 'waiting_for_new_word') {
        console.log('Processing new word:', text);
        editStates.set(chatId, {
          ...state,
          step: 'waiting_for_new_translation',
          newWord: text
        });
        await bot.sendMessage(
          chatId,
          MESSAGES.PROMPTS.ENTER_NEW_TRANSLATION(state.translation),
          cancelKeyboard
        );
        return true;
      }

      if (state.step === 'waiting_for_new_translation') {
        console.log('Processing new translation:', text);
        await updateWord(chatId, userId, state.wordId, state.newWord, text, bot, supabase);
        editStates.delete(chatId);
        return true;
      }

      return true; // Message was handled
    } catch (error) {
      console.error('Error in word edit:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, mainKeyboard);
      editStates.delete(chatId);
      return true; // Consider errors as handled
    }
  };
};

// Helper function to find and setup word edit
async function findAndSetupWordEdit(chatId, userId, wordToFind, bot, supabase) {
  console.log('Finding word:', wordToFind); // Debug log
  const { data: words, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .ilike('word', wordToFind)
    .limit(1);

  if (error || !words?.length) {
    await bot.sendMessage(chatId, MESSAGES.ERRORS.WORD_NOT_FOUND, mainKeyboard);
    editStates.delete(chatId);
    return;
  }

  const wordData = words[0];
  console.log('Found word:', wordData); // Debug log

  editStates.set(chatId, {
    step: 'waiting_for_new_word',
    wordId: wordData.id,
    word: wordData.word,
    translation: wordData.translation
  });

  await bot.sendMessage(chatId, MESSAGES.PROMPTS.ENTER_NEW_WORD(wordData.word), cancelKeyboard);
}

// Helper function to update word
async function updateWord(chatId, userId, wordId, newWord, newTranslation, bot, supabase) {
  const { error } = await supabase
    .from('words')
    .update({
      word: newWord,
      translation: newTranslation
    })
    .eq('id', wordId)
    .eq('user_id', userId);

  if (error) throw error;

  await bot.sendMessage(chatId, MESSAGES.SUCCESS.WORD_UPDATED, mainKeyboard);
}
