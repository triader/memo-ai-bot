import { updateWordProgress } from '../../handlers';
import { mainKeyboard, removeKeyboard, stateManager } from '../../utils';
import { BUTTONS as MAIN_BUTTONS } from '../../constants';
import { WORDS_PER_SESSION, PRACTICE_TYPES, BUTTONS, MESSAGES, PRACTICE_MODES } from './constants';
import {
  createLevelNavigationKeyboard,
  createMultipleChoiceKeyboard,
  createPracticeOptionsKeyboard,
  createTranslateKeyboard,
  normalizeAnswer
} from './utils';
import { createSummaryMessage, exitPractice } from './helpers';
import { categoryService, practiceService, userSettingsService, wordsService } from '../../server';
import { Category } from '../../services';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { supabase } from '../../config';

interface PracticeState {
  wordId?: string;
  word?: string;
  correctAnswer?: string;
  practiceType?: PRACTICE_TYPES;
  isWaitingForAnswer?: boolean;
  sessionProgress?: number;
  practicedWords?: string[];
  currentCategory?: Category;
  selectedType?: PRACTICE_TYPES;
  sessionResults?: Record<string, boolean | 'skipped'>;
  currentLevel?: number;
  practiceMode?: PRACTICE_MODES;
}

export const practiceStates = new Map<number, PracticeState>();

interface WordData {
  word: {
    id: string;
    word: string;
    translation: string;
  };
  otherWords: string[];
  otherTranslations: string[];
}

const getRandomPracticeType = () => {
  const types = [
    PRACTICE_TYPES.TRANSLATE,
    PRACTICE_TYPES.TRANSLATE_REVERSE,
    PRACTICE_TYPES.MULTIPLE_CHOICE,
    PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE
  ];
  return types[Math.floor(Math.random() * types.length)];
};

const determinePracticeType = (masteryLevel: number): PRACTICE_TYPES => {
  if (masteryLevel >= 0 && masteryLevel <= 29) {
    return PRACTICE_TYPES.MULTIPLE_CHOICE;
  } else if (masteryLevel >= 30 && masteryLevel <= 59) {
    return PRACTICE_TYPES.TRANSLATE;
  } else if (masteryLevel >= 60 && masteryLevel <= 79) {
    return PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE;
  } else {
    return PRACTICE_TYPES.TRANSLATE_REVERSE;
  }
};

const sendPracticeQuestion = async (
  bot: TelegramBot,
  chatId: number,
  wordData: WordData,
  practiceType: PRACTICE_TYPES
) => {
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

const isReverseType = (practiceType: PRACTICE_TYPES): boolean => {
  if (
    practiceType === PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE ||
    practiceType === PRACTICE_TYPES.TRANSLATE_REVERSE
  ) {
    return true;
  }
  return false;
};

// export const handlePracticeTypeSelection = async (
//   bot: TelegramBot,
//   chatId: number,
//   userId: number,
//   selectedType: PracticeType,
//   currentCategory: Category
// ) => {
//   const wordData = await practiceService.getNextWord(userId, currentCategory);

//   if (!wordData) {
//     const keyboard = await mainKeyboard(userId);
//     await bot.sendMessage(chatId, MESSAGES.ERRORS.NO_PRACTICE_WORDS, keyboard);
//     practiceStates.delete(chatId);
//     stateManager.clearState();
//     return;
//   }

//   const isReverse = isReverseType(selectedType);

//   practiceStates.set(chatId, {
//     wordId: wordData.word.id,
//     word: wordData.word.word,
//     correctAnswer: isReverse ? wordData.word.word : wordData.word.translation,
//     practiceType: selectedType,
//     isWaitingForAnswer: true,
//     sessionProgress: 1,
//     practicedWords: [wordData.word.id],
//     currentCategory,
//     selectedType
//   });
//   await sendPracticeQuestion(bot, chatId, wordData, selectedType);
// };

export const practiceHandler = (bot: TelegramBot) => {
  const handleAnswerResult = async (
    chatId: number,
    state: PracticeState,
    userId: number,
    isCorrectAnswer: boolean,
    keyboard: any,
    isSkipped = false
  ) => {
    // Update word progress
    if (state.wordId) {
      await updateWordProgress(supabase, state.wordId, isCorrectAnswer);
    }
    const level = await categoryService.getCurrentLevel(state.currentCategory?.id!);

    if (!state.practicedWords) return;

    // Get next word first to check if session should continue
    const nextWordData = await practiceService.getNextWord(
      userId,
      state.currentCategory,
      level,
      // @ts-ignore
      state.practicedWords,
      state.practiceMode
    );
    const isNextWord =
      !!nextWordData &&
      state.sessionProgress !== undefined &&
      state.sessionProgress < WORDS_PER_SESSION;

    if (state.practiceType === undefined) {
      return;
    }

    const isReverse = isReverseType(state.practiceType);

    if (state.correctAnswer === undefined || state.word === undefined) {
      return;
    }

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
          : MESSAGES.PROMPTS.WRONG_ANSWER(isReverse ? state.word : state.correctAnswer),
        state.sessionProgress === WORDS_PER_SESSION ? keyboard : removeKeyboard
      );
    }
    // Check if session is complete
    if (
      (state.sessionProgress !== undefined && state.sessionProgress >= WORDS_PER_SESSION) ||
      !nextWordData
    ) {
      await handleSessionComplete(
        chatId,
        state,
        { ...state.sessionResults, [state.wordId!]: isSkipped ? 'skipped' : isCorrectAnswer },
        keyboard
      );
      return;
    }
    // Update state for next word
    const nextPracticeType =
      state.selectedType === PRACTICE_TYPES.RANDOM
        ? getRandomPracticeType()
        : determinePracticeType(nextWordData.word.mastery_level);

    practiceStates.set(chatId, {
      ...state,
      wordId: nextWordData.word.id,
      word: nextWordData.word.word,
      correctAnswer: isReverse ? nextWordData.word.word : nextWordData.word.translation,
      practiceType: nextPracticeType,
      sessionProgress: state.sessionProgress !== undefined ? state.sessionProgress + 1 : 1,
      practicedWords:
        state.practicedWords !== undefined
          ? [...state.practicedWords, nextWordData.word.id]
          : [nextWordData.word.id],
      sessionResults: {
        ...(state.sessionResults || {}),
        [state.wordId!]: isSkipped ? 'skipped' : isCorrectAnswer
      }
    });

    // Send next practice question
    if (nextPracticeType !== undefined) {
      await sendPracticeQuestion(bot, chatId, nextWordData, nextPracticeType);
    }
  };

  const handleSessionComplete = async (
    chatId: number,
    state: PracticeState,
    finalSessionResults: Record<string, boolean | 'skipped'>,
    keyboard: any
  ) => {
    if (!state.practicedWords) return;
    try {
      const practicedWordsDetails = await practiceService.getPracticedWordsDetails(
        state.practicedWords
      );

      if (!practicedWordsDetails?.length) {
        throw new Error('No practiced words details found');
      }

      const sessionStats =
        state.practicedWords !== undefined
          ? state.practicedWords.reduce(
              (stats, wordId) => {
                const result = finalSessionResults[wordId];
                return {
                  correct: stats.correct + (result === true ? 1 : 0),
                  skipped: stats.skipped + (result === 'skipped' ? 1 : 0),
                  total: stats.total + 1
                };
              },
              { correct: 0, skipped: 0, total: 0 }
            )
          : { correct: 0, skipped: 0, total: 0 };

      const summaryMessage = createSummaryMessage(
        practicedWordsDetails,
        // @ts-ignore
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

  return async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) {
      return;
    }
    const keyboard = await mainKeyboard(userId);

    if (text === BUTTONS.EXIT_PRACTICE) {
      await exitPractice(bot, chatId, keyboard);
      return;
    }

    // Handle level navigation callback
    if (text.startsWith('level_')) {
      const state = practiceStates.get(chatId);
      if (!state || !state.currentCategory) return;

      const direction = text.split('_')[1];
      const newLevel = direction === 'back' ? state.currentLevel! - 1 : state.currentLevel! + 1;

      // Update state with new level
      state.currentLevel = newLevel;
      practiceStates.set(chatId, state);

      const { reviewWordsCount, newWordsCount } = await wordsService.getCountNewAndReviewWords(
        userId,
        state.currentCategory.id,
        newLevel
      );

      const { max: maxLevel } = await wordsService.getMaxLevel(userId, state.currentCategory.id);

      await bot.sendMessage(chatId, `Practice level ${newLevel}`, {
        reply_markup: {
          inline_keyboard: [
            ...createLevelNavigationKeyboard(newLevel, maxLevel),
            ...createPracticeOptionsKeyboard(reviewWordsCount, newWordsCount)
          ]
        }
      });
      return;
    }

    try {
      await bot.sendChatAction(chatId, 'typing');
      if (text === MAIN_BUTTONS.PRACTICE) {
        const currentCategory = await userSettingsService.getCurrentCategory(userId);
        if (!currentCategory) return;

        const hasWords = await wordsService.hasWordsInCategory(userId, currentCategory);
        if (!hasWords) {
          await bot.sendMessage(
            chatId,
            MESSAGES.ERRORS.NO_WORDS_CATEGORY(currentCategory.name),
            keyboard
          );
          return;
        }

        const currentLevel = currentCategory.current_level || 1;
        const { max: maxLevel } = await wordsService.getMaxLevel(userId, currentCategory.id);

        const { reviewWordsCount, newWordsCount } = await wordsService.getCountNewAndReviewWords(
          userId,
          currentCategory.id,
          currentLevel
        );

        // Send level navigation and practice options
        await bot.sendMessage(chatId, `Practice level ${currentLevel}`, {
          reply_markup: {
            inline_keyboard: [
              ...createLevelNavigationKeyboard(currentLevel, maxLevel),
              ...createPracticeOptionsKeyboard(reviewWordsCount, newWordsCount)
            ]
          }
        });

        practiceStates.set(chatId, {
          currentCategory,
          currentLevel,
          practiceMode: undefined
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

      if (!state.correctAnswer) return;
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

// Function to start a practice session
export async function startPracticeSession(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  category: Category,
  level: number
) {
  const words =
    practiceStates.get(chatId)?.practiceMode === PRACTICE_MODES.REVIEW
      ? await wordsService.getWordsForReview(userId, category.id, level, WORDS_PER_SESSION)
      : await wordsService.getNewWords(userId, category.id, level, WORDS_PER_SESSION);

  if (words.length === 0) {
    await bot.sendMessage(
      chatId,
      `No words available for ${practiceStates.get(chatId)?.practiceMode} at this level.`
    );
    return;
  }

  const wordData = words[0]; // Start with the first word
  const practiceType = determinePracticeType(wordData.mastery_level);

  // Prepare the WordData object correctly
  const wordDetails: WordData = {
    word: {
      id: wordData.id,
      word: wordData.word,
      translation: wordData.translation
    },
    otherWords: words.slice(1).map((w) => w.word), // Assuming other words are the rest
    otherTranslations: words.slice(1).map((w) => w.translation) // Assuming other translations are the rest
  };

  practiceStates.set(chatId, {
    wordId: wordDetails.word.id,
    word: wordDetails.word.word,
    correctAnswer:
      practiceType === PRACTICE_TYPES.TRANSLATE_REVERSE
        ? wordDetails.word.word
        : wordDetails.word.translation,
    practiceType,
    isWaitingForAnswer: true,
    sessionProgress: 1,
    practicedWords: [wordDetails.word.id],
    currentCategory: category,
    currentLevel: level,
    sessionResults: {},
    practiceMode: practiceStates.get(chatId)?.practiceMode
  });

  await sendPracticeQuestion(bot, chatId, wordDetails, practiceType);
}
