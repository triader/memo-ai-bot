"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStates = void 0;
exports.deleteWordHandler = deleteWordHandler;
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const server_1 = require("../server");
const config_1 = require("../config");
exports.deleteStates = new Map();
function deleteWordHandler(bot) {
    return async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!userId || !chatId)
            return;
        const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
        if (!currentCategory) {
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
            return;
        }
        // @ts-ignore
        if (msg.callback_query) {
            // @ts-ignore
            const chatId = msg.callback_query.message.chat.id;
            // @ts-ignore
            const userId = msg.callback_query.from.id;
            // @ts-ignore
            const wordToDelete = msg.callback_query.data;
            try {
                await findAndDeleteWord(userId, wordToDelete, config_1.supabase, currentCategory.id);
                await bot.editMessageText(constants_1.MESSAGES.SUCCESS.WORD_DELETED(wordToDelete), {
                    chat_id: chatId,
                    // @ts-ignore
                    message_id: msg.callback_query.message.message_id,
                    reply_markup: { inline_keyboard: [] }
                });
                exports.deleteStates.delete(chatId);
                utils_1.stateManager.clearState();
            }
            catch (error) {
                console.error('Error in word delete:', error);
                const keyboard = await (0, utils_1.mainKeyboard)(userId);
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
                utils_1.stateManager.clearState();
            }
            return;
        }
        try {
            await bot.sendChatAction(chatId, 'typing');
            if (text === constants_1.BUTTONS.DELETE_WORD) {
                const { data: words, error } = await config_1.supabase
                    .from('words')
                    .select('word')
                    .eq('user_id', userId)
                    .eq('category_id', currentCategory.id);
                if (error) {
                    console.error('Error fetching words:', error);
                    const keyboard = await (0, utils_1.mainKeyboard)(userId);
                    await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
                    return;
                }
                if (!words || words.length === 0) {
                    const keyboard = await (0, utils_1.mainKeyboard)(userId);
                    await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.NO_WORDS, keyboard);
                    return;
                }
                const keyboard = {
                    inline_keyboard: words.reduce((acc, { word }, index) => {
                        if (index % 2 === 0) {
                            acc.push([{ text: word, callback_data: word }]);
                        }
                        else {
                            acc[acc.length - 1].push({ text: word, callback_data: word });
                        }
                        return acc;
                    }, [])
                };
                exports.deleteStates.set(chatId, {
                    action: 'SELECT_WORD_TO_DELETE',
                    category: currentCategory
                });
                await bot.sendMessage(chatId, constants_1.MESSAGES.PROMPTS.SELECT_WORD_TO_DELETE, {
                    reply_markup: keyboard
                });
            }
        }
        catch (error) {
            console.error('Error in word delete:', error);
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
            exports.deleteStates.delete(chatId);
        }
    };
}
async function findAndDeleteWord(userId, wordToDelete, supabase, categoryId) {
    const { error: deleteError } = await supabase
        .from('words')
        .delete()
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .ilike('word', wordToDelete);
    if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
    }
}
//# sourceMappingURL=deleteWordHandler.js.map