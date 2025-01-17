"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.practiceHandler = exports.handlePracticeTypeSelection = exports.practiceStates = void 0;
const handlers_1 = require("../../handlers");
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
const constants_2 = require("./constants");
const utils_2 = require("./utils");
const helpers_1 = require("./helpers");
const server_1 = require("../../server");
const config_1 = require("../../config");
exports.practiceStates = new Map();
const getRandomPracticeType = () => {
    const types = [
        constants_2.PRACTICE_TYPES.TRANSLATE,
        constants_2.PRACTICE_TYPES.TRANSLATE_REVERSE,
        constants_2.PRACTICE_TYPES.MULTIPLE_CHOICE,
        constants_2.PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE
    ];
    return types[Math.floor(Math.random() * types.length)];
};
const sendPracticeQuestion = async (bot, chatId, wordData, practiceType) => {
    const { word, otherWords, otherTranslations } = wordData;
    switch (practiceType) {
        case constants_2.PRACTICE_TYPES.TRANSLATE:
            await bot.sendMessage(chatId, constants_2.MESSAGES.PROMPTS.TRANSLATE_WORD(word.word), (0, utils_2.createTranslateKeyboard)());
            break;
        case constants_2.PRACTICE_TYPES.TRANSLATE_REVERSE:
            await bot.sendMessage(chatId, constants_2.MESSAGES.PROMPTS.TRANSLATE_REVERSE(word.translation), (0, utils_2.createTranslateKeyboard)());
            break;
        case constants_2.PRACTICE_TYPES.MULTIPLE_CHOICE:
            let options = [word.translation];
            if (otherTranslations.length) {
                const shuffled = otherTranslations
                    .filter((t) => t !== word.translation)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);
                options = [...shuffled, word.translation].sort(() => Math.random() - 0.5);
            }
            await bot.sendMessage(chatId, constants_2.MESSAGES.PROMPTS.CHOOSE_TRANSLATION(word.word), (0, utils_2.createMultipleChoiceKeyboard)(options));
            break;
        case constants_2.PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE:
            let wordOptions = [word.word];
            if (otherWords.length) {
                const shuffled = otherWords
                    .filter((w) => w !== word.word)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);
                wordOptions = [...shuffled, word.word].sort(() => Math.random() - 0.5);
            }
            await bot.sendMessage(chatId, constants_2.MESSAGES.PROMPTS.CHOOSE_WORD(word.translation), (0, utils_2.createMultipleChoiceKeyboard)(wordOptions));
            break;
    }
};
const isReverseType = (practiceType) => {
    if (practiceType === constants_2.PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE ||
        practiceType === constants_2.PRACTICE_TYPES.TRANSLATE_REVERSE) {
        return true;
    }
    return false;
};
const handlePracticeTypeSelection = async (bot, chatId, userId, selectedType, currentCategory) => {
    const wordData = await server_1.practiceService.getNextWord(userId, currentCategory);
    if (!wordData) {
        const keyboard = await (0, utils_1.mainKeyboard)(userId);
        await bot.sendMessage(chatId, constants_2.MESSAGES.ERRORS.NO_PRACTICE_WORDS, keyboard);
        exports.practiceStates.delete(chatId);
        utils_1.stateManager.clearState();
        return;
    }
    const isReverse = isReverseType(selectedType);
    exports.practiceStates.set(chatId, {
        wordId: wordData.word.id,
        word: wordData.word.word,
        correctAnswer: isReverse ? wordData.word.word : wordData.word.translation,
        practiceType: selectedType,
        isWaitingForAnswer: true,
        sessionProgress: 1,
        practicedWords: [wordData.word.id],
        currentCategory,
        selectedType
    });
    await sendPracticeQuestion(bot, chatId, wordData, selectedType);
};
exports.handlePracticeTypeSelection = handlePracticeTypeSelection;
const practiceHandler = (bot) => {
    const handleAnswerResult = async (chatId, state, userId, isCorrectAnswer, keyboard, isSkipped = false) => {
        // Update word progress if not skipped
        if (state.wordId && !isSkipped) {
            await (0, handlers_1.updateWordProgress)(config_1.supabase, state.wordId, isCorrectAnswer);
        }
        if (!state.practicedWords)
            return;
        // Get next word first to check if session should continue
        const nextWordData = await server_1.practiceService.getNextWord(userId, state.currentCategory, 
        // @ts-ignore
        state.practicedWords);
        const isNextWord = !!nextWordData &&
            state.sessionProgress !== undefined &&
            state.sessionProgress < constants_2.WORDS_PER_SESSION;
        if (state.practiceType === undefined) {
            return;
        }
        const isReverse = isReverseType(state.practiceType);
        if (state.correctAnswer === undefined || state.word === undefined) {
            return;
        }
        if (isSkipped) {
            await bot.sendMessage(chatId, constants_2.MESSAGES.PROMPTS.WORD_SKIPPED(state.correctAnswer, isNextWord), state.sessionProgress === constants_2.WORDS_PER_SESSION ? keyboard : utils_1.removeKeyboard);
        }
        else {
            await bot.sendMessage(chatId, isCorrectAnswer
                ? constants_2.MESSAGES.PROMPTS.CORRECT_ANSWER
                : constants_2.MESSAGES.PROMPTS.WRONG_ANSWER(isReverse ? state.word : state.correctAnswer), state.sessionProgress === constants_2.WORDS_PER_SESSION ? keyboard : utils_1.removeKeyboard);
        }
        // Check if session is complete
        if ((state.sessionProgress !== undefined && state.sessionProgress >= constants_2.WORDS_PER_SESSION) ||
            !nextWordData) {
            await handleSessionComplete(chatId, state, { ...state.sessionResults, [state.wordId]: isSkipped ? 'skipped' : isCorrectAnswer }, keyboard);
            return;
        }
        // Update state for next word
        const nextPracticeType = state.selectedType === constants_2.PRACTICE_TYPES.RANDOM ? getRandomPracticeType() : state.selectedType;
        exports.practiceStates.set(chatId, {
            ...state,
            wordId: nextWordData.word.id,
            word: nextWordData.word.word,
            correctAnswer: isReverse ? nextWordData.word.word : nextWordData.word.translation,
            practiceType: nextPracticeType,
            sessionProgress: state.sessionProgress !== undefined ? state.sessionProgress + 1 : 1,
            practicedWords: state.practicedWords !== undefined
                ? [...state.practicedWords, nextWordData.word.id]
                : [nextWordData.word.id],
            sessionResults: {
                ...(state.sessionResults || {}),
                [state.wordId]: isSkipped ? 'skipped' : isCorrectAnswer
            }
        });
        // Send next practice question
        if (nextPracticeType !== undefined) {
            await sendPracticeQuestion(bot, chatId, nextWordData, nextPracticeType);
        }
    };
    const handleSessionComplete = async (chatId, state, finalSessionResults, keyboard) => {
        if (!state.practicedWords)
            return;
        try {
            const practicedWordsDetails = await server_1.practiceService.getPracticedWordsDetails(state.practicedWords);
            if (!practicedWordsDetails?.length) {
                throw new Error('No practiced words details found');
            }
            const sessionStats = state.practicedWords !== undefined
                ? state.practicedWords.reduce((stats, wordId) => {
                    const result = finalSessionResults[wordId];
                    return {
                        correct: stats.correct + (result === true ? 1 : 0),
                        skipped: stats.skipped + (result === 'skipped' ? 1 : 0),
                        total: stats.total + 1
                    };
                }, { correct: 0, skipped: 0, total: 0 })
                : { correct: 0, skipped: 0, total: 0 };
            const summaryMessage = (0, helpers_1.createSummaryMessage)(sessionStats, practicedWordsDetails, 
            // @ts-ignore
            finalSessionResults);
            await bot.sendMessage(chatId, summaryMessage, keyboard);
        }
        catch (error) {
            console.error('Error creating practice summary:', error);
            await bot.sendMessage(chatId, constants_2.MESSAGES.ERRORS.PRACTICE_SUMMARY, keyboard);
        }
        finally {
            exports.practiceStates.delete(chatId);
            utils_1.stateManager.clearState();
        }
    };
    return async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!userId || !text) {
            return;
        }
        const keyboard = await (0, utils_1.mainKeyboard)(userId);
        if (text === constants_2.BUTTONS.EXIT_PRACTICE) {
            await (0, helpers_1.exitPractice)(bot, chatId, keyboard);
            return;
        }
        try {
            await bot.sendChatAction(chatId, 'typing');
            if (text === constants_1.BUTTONS.PRACTICE) {
                const currentCategory = await server_1.userSettingsService.getCurrentCategory(userId);
                if (!currentCategory)
                    return;
                const hasWords = await server_1.wordsService.hasWordsInCategory(userId, currentCategory);
                if (!hasWords) {
                    await bot.sendMessage(chatId, constants_2.MESSAGES.ERRORS.NO_WORDS_CATEGORY(currentCategory.name), keyboard);
                    return;
                }
                await bot.sendMessage(chatId, constants_2.MESSAGES.PROMPTS.CHOOSE_PRACTICE_TYPE, {
                    reply_markup: (0, utils_2.createPracticeTypeKeyboard)()
                });
                exports.practiceStates.set(chatId, {
                    currentCategory
                });
                return;
            }
            const state = exports.practiceStates.get(chatId);
            if (!state)
                return;
            if (text === constants_2.BUTTONS.SKIP) {
                await handleAnswerResult(chatId, state, userId, false, keyboard, true);
                return;
            }
            if (!state.isWaitingForAnswer)
                return;
            const answer = (0, utils_2.normalizeAnswer)(text);
            if (!state.correctAnswer)
                return;
            const isCorrect = answer === (0, utils_2.normalizeAnswer)(state.correctAnswer);
            await handleAnswerResult(chatId, state, userId, isCorrect, keyboard, false);
        }
        catch (error) {
            console.error('Practice error:', error);
            await bot.sendMessage(chatId, constants_2.MESSAGES.ERRORS.PRACTICE, keyboard);
            exports.practiceStates.delete(chatId);
            utils_1.stateManager.clearState();
        }
    };
};
exports.practiceHandler = practiceHandler;
//# sourceMappingURL=practiceHandler.js.map