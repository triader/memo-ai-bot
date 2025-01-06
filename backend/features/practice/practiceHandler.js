import { updateWordProgress } from '../../handlers/updateWordProgressHandler.js';
import { mainKeyboard, removeKeyboard } from '../../utils/keyboards.js';
import { stateManager } from '../../utils/stateManager.js';
import { BUTTONS as MAIN_BUTTONS } from '../../constants/buttons.js';
import { normalizeAnswer } from './utils/normalizeAnswer.js';
import { WORDS_PER_SESSION, PRACTICE_TYPES, BUTTONS, MESSAGES } from './constants/index.js';
import {
  createPracticeTypeKeyboard,
  createMultipleChoiceKeyboard,
  createTranslateKeyboard
} from './utils/keyboards.js';
import { createSummaryMessage, exitPractice } from './helpers.js';
import { practiceService } from '../../server.js';

export const practiceStates = new Map();

const getRandomPracticeType = () => {
  const types = [
    PRACTICE_TYPES.TRANSLATE,
    PRACTICE_TYPES.TRANSLATE_REVERSE,
    PRACTICE_TYPES.MULTIPLE_CHOICE,
    PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE
  ];
  return types[Math.floor(Math.random() * types.length)];
};

const sendPracticeQuestion = async (bot, chatId, wordData, practiceType) => {
  const { word, otherWords, otherTranslations } = wordData;

  switch (practiceType) {
    case PRACTICE_TYPES.TRANSLATE:
      await bot.sendMessage(
        chatId,
        MESSAGES.PROMPTS.TRANSLATE_WORD(word.word),
        createTranslateKeyboard()
      );
      break;

    case PRACTICE_TYPES.TRANSLATE_REVERSE:
      await bot.sendMessage(
        chatId,
        MESSAGES.PROMPTS.TRANSLATE_REVERSE(word.translation),
        createTranslateKeyboard()
      );
      break;

    case PRACTICE_TYPES.MULTIPLE_CHOICE:
      let options = [word.translation];
      if (otherTranslations.length) {
        const shuffled = otherTranslations
          .filter((t) => t !== word.translation)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        options = [...shuffled, word.translation].sort(() => Math.random() - 0.5);
      }
      await bot.sendMessage(
        chatId,
        MESSAGES.PROMPTS.CHOOSE_TRANSLATION(word.word),
        createMultipleChoiceKeyboard(options)
      );
      break;

    case PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE:
      let wordOptions = [word.word];
      if (otherWords.length) {
        const shuffled = otherWords
          .filter((w) => w !== word.word)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        wordOptions = [...shuffled, word.word].sort(() => Math.random() - 0.5);
      }
      await bot.sendMessage(
        chatId,
        MESSAGES.PROMPTS.CHOOSE_WORD(word.translation),
        createMultipleChoiceKeyboard(wordOptions)
      );
      break;
  }
};

export const handlePracticeTypeSelection = async (
  bot,
  chatId,
  userId,
  selectedType,
  currentCategory
) => {
  const wordData = await practiceService.getNextWord(userId, currentCategory);

  if (!wordData) {
    const keyboard = await mainKeyboard(userId);
    await bot.sendMessage(
      chatId,
      MESSAGES.ERRORS.NO_PRACTICE_WORDS(currentCategory.name),
      keyboard
    );
    practiceStates.delete(chatId);
    stateManager.clearState();
    return;
  }

  const isReverseType = [
    PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE,
    PRACTICE_TYPES.TRANSLATE_REVERSE
  ].includes(selectedType);

  practiceStates.set(chatId, {
    wordId: wordData.word.id,
    word: wordData.word.word,
    correctAnswer: isReverseType ? wordData.word.word : wordData.word.translation,
    practiceType: selectedType,
    isWaitingForAnswer: true,
    sessionProgress: 1,
    practicedWords: [wordData.word.id],
    currentCategory,
    selectedType
  });
  await sendPracticeQuestion(bot, chatId, wordData, selectedType);
};

export const practiceHandler = (bot, supabase, userSettingsService) => {
  const handleAnswerResult = async (
    chatId,
    state,
    userId,
    isCorrectAnswer,
    keyboard,
    isSkipped = false
  ) => {
    // Update word progress if not skipped
    if (state.wordId && !isSkipped) {
      await updateWordProgress(supabase, state.wordId, isCorrectAnswer);
    }

    // Get next word first to check if session should continue
    const nextWordData = await practiceService.getNextWord(
      userId,
      state.currentCategory,
      state.practicedWords
    );
    const isNextWord = !!nextWordData && state.sessionProgress < WORDS_PER_SESSION;

    // Send feedback message
    const isReverseType = [
      PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE,
      PRACTICE_TYPES.TRANSLATE_REVERSE
    ].includes(state.practiceType);
    if (isSkipped) {
      await bot.sendMessage(
        chatId,
        MESSAGES.PROMPTS.WORD_SKIPPED(state.correctAnswer, isNextWord),
        state.sessionProgress === WORDS_PER_SESSION ? keyboard : removeKeyboard
      );
    } else {
      await bot.sendMessage(
        chatId,
        isCorrectAnswer
          ? MESSAGES.PROMPTS.CORRECT_ANSWER
          : MESSAGES.PROMPTS.WRONG_ANSWER(isReverseType ? state.word : state.correctAnswer),
        state.sessionProgress === WORDS_PER_SESSION ? keyboard : removeKeyboard
      );
    }

    // Check if session is complete
    if (state.sessionProgress >= WORDS_PER_SESSION || !nextWordData) {
      await handleSessionComplete(
        chatId,
        state,
        { ...state.sessionResults, [state.wordId]: isSkipped ? 'skipped' : isCorrectAnswer },
        keyboard
      );
      return;
    }

    // Update state for next word
    const nextPracticeType =
      state.selectedType === PRACTICE_TYPES.RANDOM ? getRandomPracticeType() : state.selectedType;

    practiceStates.set(chatId, {
      ...state,
      wordId: nextWordData.word.id,
      word: nextWordData.word.word,
      correctAnswer: isReverseType ? nextWordData.word.word : nextWordData.word.translation,
      practiceType: nextPracticeType,
      sessionProgress: state.sessionProgress + 1,
      practicedWords: [...state.practicedWords, nextWordData.word.id],
      sessionResults: {
        ...(state.sessionResults || {}),
        [state.wordId]: isSkipped ? 'skipped' : isCorrectAnswer
      }
    });

    // Send next practice question
    await sendPracticeQuestion(bot, chatId, nextWordData, nextPracticeType);
  };

  const handleSessionComplete = async (chatId, state, finalSessionResults, keyboard) => {
    try {
      const practicedWordsDetails = await practiceService.getPracticedWordsDetails(
        state.practicedWords
      );

      if (!practicedWordsDetails?.length) {
        throw new Error('No practiced words details found');
      }

      const sessionStats = state.practicedWords.reduce(
        (stats, wordId) => {
          const result = finalSessionResults[wordId];
          return {
            correct: stats.correct + (result === true ? 1 : 0),
            skipped: stats.skipped + (result === 'skipped' ? 1 : 0),
            total: stats.total + 1
          };
        },
        { correct: 0, skipped: 0, total: 0 }
      );

      const summaryMessage = createSummaryMessage(
        sessionStats,
        practicedWordsDetails,
        finalSessionResults
      );
      await bot.sendMessage(chatId, summaryMessage, keyboard);
    } catch (error) {
      console.error('Error creating practice summary:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.PRACTICE_SUMMARY, keyboard);
    } finally {
      practiceStates.delete(chatId);
      stateManager.clearState();
    }
  };

  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const keyboard = await mainKeyboard(userId);

    if (text === BUTTONS.EXIT_PRACTICE) {
      await exitPractice(bot, chatId, keyboard);
      return;
    }

    try {
      await bot.sendChatAction(chatId, 'typing');
      if (text === MAIN_BUTTONS.PRACTICE) {
        const currentCategory = await userSettingsService.getCurrentCategory(userId);

        await bot.sendMessage(chatId, MESSAGES.PROMPTS.CHOOSE_PRACTICE_TYPE, {
          reply_markup: createPracticeTypeKeyboard()
        });

        practiceStates.set(chatId, {
          currentCategory
        });
        return;
      }

      const state = practiceStates.get(chatId);
      if (!state) return;

      if (text === BUTTONS.SKIP) {
        await handleAnswerResult(chatId, state, userId, false, keyboard, true);
        return;
      }

      if (!state.isWaitingForAnswer) return;

      const answer = normalizeAnswer(text);
      const isCorrect = answer === normalizeAnswer(state.correctAnswer);

      await handleAnswerResult(chatId, state, userId, isCorrect, keyboard, false);
    } catch (error) {
      console.error('Practice error:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.PRACTICE, keyboard);
      practiceStates.delete(chatId);
      stateManager.clearState();
    }
  };
};
