import { SupabaseClient } from '@supabase/supabase-js';
import { MESSAGES } from '../constants';
import { mainKeyboard, cancelKeyboard, stateManager } from '../utils';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { supabase } from '../config';

// Store edit states
const editStates = new Map();

export const wordEditHandler = (bot: TelegramBot) => {
  return async (msg: Message, match: RegExpMatchArray) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !chatId || !text) return;

    try {
      let state = editStates.get(chatId);

      if (text === '/edit' || text === '✏️ Edit word') {
        editStates.set(chatId, { step: 'waiting_for_word' });
        await bot.sendMessage(chatId, MESSAGES.PROMPTS.EDIT_WHICH_WORD, cancelKeyboard);
        return;
      }

      const directWord = match ? match[1]?.trim() : null;
      if (directWord) {
        await findAndSetupWordEdit(chatId, userId, directWord, bot, supabase);
        return;
      }

      if (!state) {
        return false; // Message not handled
      }

      if (state.step === 'waiting_for_word') {
        await findAndSetupWordEdit(chatId, userId, text, bot, supabase);
        return true;
      }

      if (state.step === 'waiting_for_new_word') {
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
        await updateWord(chatId, userId, state.wordId, state.newWord, text, bot, supabase);
        editStates.delete(chatId);
        stateManager.clearState();
        return true;
      }

      return true; // Message was handled
    } catch (error) {
      console.error('Error in word edit:', error);
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL, keyboard);
      editStates.delete(chatId);
      stateManager.clearState();
      return true; // Consider errors as handled
    }
  };
};

// Helper function to find and setup word edit
async function findAndSetupWordEdit(
  chatId: number,
  userId: number,
  wordToFind: string,
  bot: TelegramBot,
  supabase: SupabaseClient
) {
  const { data: words, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .ilike('word', wordToFind)
    .limit(1);

  if (error || !words?.length) {
    const keyboard = await mainKeyboard(userId);
    await bot.sendMessage(chatId, MESSAGES.ERRORS.WORD_NOT_FOUND, keyboard);
    editStates.delete(chatId);
    stateManager.clearState();
    return;
  }

  const wordData = words[0];

  editStates.set(chatId, {
    step: 'waiting_for_new_word',
    wordId: wordData.id,
    word: wordData.word,
    translation: wordData.translation
  });

  await bot.sendMessage(chatId, MESSAGES.PROMPTS.ENTER_NEW_WORD(wordData.word), cancelKeyboard);
}

// Helper function to update word
async function updateWord(
  chatId: number,
  userId: number,
  wordId: string,
  newWord: string,
  newTranslation: string,
  bot: TelegramBot,
  supabase: SupabaseClient
) {
  const { error } = await supabase
    .from('words')
    .update({
      word: newWord,
      translation: newTranslation
    })
    .eq('id', wordId)
    .eq('user_id', userId);

  if (error) throw error;

  const keyboard = await mainKeyboard(userId);
  await bot.sendMessage(chatId, '✅ Word updated successfully!', keyboard);
}
