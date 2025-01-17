"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationStore = exports.translationStore = void 0;
exports.translateAIHandler = translateAIHandler;
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
const server_1 = require("../../server");
const config_1 = require("../../config");
exports.translationStore = new Map();
exports.conversationStore = new Map();
function translateAIHandler(bot) {
    return async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userId = msg.from?.id;
        if (!chatId || !userId || !text) {
            return;
        }
        // Get user's current category and language contexts
        const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
        if (!currentCategory) {
            await bot.sendMessage(chatId, 'No current category', await (0, utils_1.mainKeyboard)(userId));
            return;
        }
        // Get context data
        const contextData = await server_1.userSettingsService.getCategoryContext(userId, currentCategory.id);
        const contexts = {
            original_context: contextData.original_context,
            learning_context: contextData.learning_context
        };
        // Check if contexts are set
        if (!contexts.original_context || !contexts.learning_context) {
            await bot.sendMessage(chatId, 'Please set up your language contexts first. What context are you translating from? (e.g., "English" or "Russian")', utils_1.cancelKeyboard);
            utils_1.stateManager.setState(utils_1.BotState.SETTING_ORIGINAL_CONTEXT);
            return;
        }
        const followUpData = exports.translationStore.get(`followup_${chatId}`);
        if (followUpData && text) {
            try {
                const { word, translationKey } = followUpData;
                // Get or initialize conversation history
                let conversationHistory = exports.conversationStore.get(chatId) || [
                    {
                        role: 'system',
                        content: `You are a helpful language learning assistant. You are helping someone who knows ${contexts.original_context} learn ${contexts.learning_context}. Answer questions about word usage, meaning, and context. If user asks to translate to a different language - do so.`
                    }
                ];
                // Add user's message
                conversationHistory.push({
                    role: 'user',
                    content: `Regarding the word/phrase "${word}": ${text}`
                });
                const completion = await config_1.openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: conversationHistory,
                    temperature: 0.7
                });
                // Store assistant's response in history
                conversationHistory.push(completion.choices[0].message);
                exports.conversationStore.set(chatId, conversationHistory);
                await bot.sendChatAction(chatId, 'typing');
                if (followUpData.keyboardMessageId) {
                    try {
                        await bot.deleteMessage(chatId, followUpData.keyboardMessageId);
                    }
                    catch (e) {
                        console.error('Error deleting keyboard message:', e);
                    }
                }
                const aiResponse = completion.choices[0].message.content;
                await bot.sendMessage(chatId, aiResponse || '', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: constants_1.BUTTONS.FOLLOW_UP,
                                    callback_data: `translate_followup_${translationKey}`
                                }
                            ]
                        ]
                    }
                });
                const keyboard = await (0, utils_1.mainKeyboard)(userId);
                await bot.sendMessage(chatId, 'Let me know if you have any more questions!', keyboard);
                exports.translationStore.delete(`followup_${chatId}`);
                return;
            }
            catch (error) {
                console.error('Follow-up error:', error);
                const keyboard = await (0, utils_1.mainKeyboard)(userId);
                await bot.sendMessage(chatId, constants_1.MESSAGES.ERRORS.GENERAL, keyboard);
                exports.translationStore.delete(`followup_${chatId}`);
                return;
            }
        }
        // Handle regular translation
        if (text) {
            try {
                // Clear previous translation data and conversation history for this user
                for (const [key, value] of exports.translationStore.entries()) {
                    if (key.startsWith(`${userId}_`)) {
                        exports.translationStore.delete(key);
                    }
                }
                exports.conversationStore.delete(chatId);
                await bot.sendChatAction(chatId, 'typing');
                // Check if contexts are the same
                const isSameContext = contexts.original_context === contexts.learning_context;
                const completion = await config_1.openai.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: `You are a helpful language learning assistant. You are helping someone who knows ${contexts.original_context} learn ${contexts.learning_context}. ` +
                                'Provide ' +
                                (isSameContext ? 'definition' : 'translation') +
                                ' in the following format ONLY:\n\n' +
                                (!isSameContext
                                    ? `${contexts.original_context}: [${isSameContext ? 'term' : 'word or phrase'} in ${contexts.original_context} (only the word or phrase with its article/preposition, no other text, no quotes; for example: ${contexts.original_context}: A cat)]\n\n`
                                    : `Word: [${text}]\n\n`) +
                                (isSameContext ? 'Definition:' : `${contexts.learning_context}:`) +
                                ` [${isSameContext ? 'brief definition' : 'translated word or phrase'}]` +
                                '[For translations containing special characters like kanji, add their reading on the next line in parentheses.]\n\n' +
                                'Explanation: [detailed explanation of the word or phrase in ${contexts.learning_context} without using the word or phrase itself.]\n\n' +
                                `${!isSameContext ? 'Example: [usage example] ' : ''}`
                        },
                        {
                            role: 'user',
                            content: isSameContext
                                ? `Define "${text}" in ${contexts.learning_context} and provide a brief explanation and usage example.`
                                : `Translate or give definition of "${text}" in ${contexts.learning_context} and provide a brief explanation and usage example.`
                        }
                    ],
                    model: 'gpt-4o'
                });
                const response = completion.choices[0].message.content;
                // Parse the translation/definition from the response
                const translationMatch = response?.match(new RegExp(`(${contexts.learning_context}|Definition):\\s*(.+)(?:\n|$)`));
                const translation = translationMatch
                    ? isSameContext
                        ? translationMatch[0]
                        : translationMatch[2].trim()
                    : null;
                // Parse the original word from the response
                const originalWordMatch = response?.match(new RegExp(`${contexts.original_context}:\\s*([^\\n]+)`));
                const originalWord = originalWordMatch ? originalWordMatch[1].trim() : text;
                // If we successfully parsed the translation, show the options
                if (translation) {
                    const translationKey = `${userId}_${Date.now()}`;
                    exports.translationStore.set(translationKey, {
                        word: originalWord,
                        translation,
                        categoryId: currentCategory.id,
                        contexts
                    });
                    const inlineKeyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: constants_1.BUTTONS.ADD_WORD,
                                        callback_data: `add_trans_${translationKey}`
                                    }
                                ],
                                [
                                    {
                                        text: constants_1.BUTTONS.MORE_EXAMPLES,
                                        callback_data: `more_examples_${translationKey}`
                                    },
                                    {
                                        text: constants_1.BUTTONS.FOLLOW_UP,
                                        callback_data: `translate_followup_${translationKey}`
                                    }
                                ]
                            ],
                            resize_keyboard: true
                        }
                    };
                    await bot.sendMessage(chatId, response || '', inlineKeyboard);
                }
            }
            catch (error) {
                await bot.sendMessage(chatId, '❌ Translation failed. Please try again.');
                console.error(error);
            }
        }
    };
}
//# sourceMappingURL=translateAIHandler.js.map