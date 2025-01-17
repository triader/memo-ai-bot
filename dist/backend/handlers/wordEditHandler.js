"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordEditHandler = void 0;
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const config_1 = require("../config");
// Store edit states
const editStates = new Map();
const wordEditHandler = (bot) => {
    return async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!userId || !chatId || !text)
            return;
        try {
            let state = editStates.get(chatId);
            if (text === '/edit' || text === '✏️ Edit word') {
                editStates.set(chatId, { step: 'waiting_for_word' });
                await bot.sendMessage(chatId, constants_1.MESSAGES.PROMPTS.EDIT_WHICH_WORD, utils_1.cancelKeyboard);
                return;
            }
            const directWord = match ? match[1]?.trim() : null;
            if (directWord) {
                await findAndSetupWordEdit(chatId, userId, directWord, bot, config_1.supabase);
                return;
            }
            if (!state) {
                return false; // Message not handled
            }
            if (state.step === 'waiting_for_word') {
                await findAndSetupWordEdit(chatId, userId, text, bot, config_1.supabase);
                return true;
            }
            if (state.step === 'waiting_for_new_word') {
                editStates.set(chatId, {
                    ...state,
                    step: 'waiting_for_new_translation',
                    newWord: text
                });
                await bot.sendMessage(chatId, constants_1.MESSAGES.PROMPTS.ENTER_NEW_TRANSLATION(state.translation), utils_1.cancelKeyboard);
                return true;
            }
            if (state.step === 'waiting_for_new_translation') {
                await updateWord(chatId, userId, state.wordId, state.newWord, text, bot, config_1.supabase);
                editStates.delete(chatId);
                utils_1.stateManager.clearState();
                return true;
            }
            return true; // Message was handled
        }
        catch (error) {
            console.error('Error in word edit:', error);
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
            editStates.delete(chatId);
            utils_1.stateManager.clearState();
            return true; // Consider errors as handled
        }
    };
};
exports.wordEditHandler = wordEditHandler;
// Helper function to find and setup word edit
async function findAndSetupWordEdit(chatId, userId, wordToFind, bot, supabase) {
    const { data: words, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', userId)
        .ilike('word', wordToFind)
        .limit(1);
    if (error || !words?.length) {
        const keyboard = await (0, utils_1.mainKeyboard)(userId);
        await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.WORD_NOT_FOUND, keyboard);
        editStates.delete(chatId);
        utils_1.stateManager.clearState();
        return;
    }
    const wordData = words[0];
    editStates.set(chatId, {
        step: 'waiting_for_new_word',
        wordId: wordData.id,
        word: wordData.word,
        translation: wordData.translation
    });
    await bot.sendMessage(chatId, constants_1.MESSAGES.PROMPTS.ENTER_NEW_WORD(wordData.word), utils_1.cancelKeyboard);
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
    if (error)
        throw error;
    const keyboard = await (0, utils_1.mainKeyboard)(userId);
    await bot.sendMessage(chatId, '✅ Word updated successfully!', keyboard);
}
//# sourceMappingURL=wordEditHandler.js.map