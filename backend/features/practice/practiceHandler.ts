import { updateWordProgress } from '../../handlers';
import { mainKeyboard, removeKeyboard, stateManager } from '../../utils';
import { BUTTONS as MAIN_BUTTONS } from '../../constants';
import { WORDS_PER_SESSION, PRACTICE_TYPES, BUTTONS, MESSAGES } from './constants';
import {
  createPracticeTypeKeyboard,
  createMultipleChoiceKeyboard,
  createTranslateKeyboard,
  normalizeAnswer
} from './utils';
import { createSummaryMessage, exitPractice } from './helpers';
import { practiceService, userSettingsService, wordsService } from '../../server';
import { Category } from '../../services';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { supabase } from '../../config';

export type PracticeType = (typeof PRACTICE_TYPES)[keyof typeof PRACTICE_TYPES];

interface PracticeState {
  wordId?: string;
  word?: string;
  correctAnswer?: string;
  practiceType?: PracticeType;
  isWaitingForAnswer?: boolean;
  sessionProgress?: number;
  practicedWords?: string[];
  currentCategory?: Category;
  selectedType?: PracticeType;
  sessionResults?: Record<string, boolean | 'skipped'>;
}

export const practiceStates = new Map<number, PracticeState>();

interface WordData {
  word: {
    id: number;
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

const sendPracticeQuestion = async (
  bot: TelegramBot,
  chatId: number,
  wordData: WordData,
  practiceType: PracticeType
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

const isReverseType = (practiceType: PracticeType): boolean => {
  if (
    practiceType === PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE ||
    practiceType === PRACTICE_TYPES.TRANSLATE_REVERSE
  ) {
    return true;
  }
  return false;
};

export const handlePracticeTypeSelection = async (
  bot: TelegramBot,
  chatId: number,
  userId: number,
  selectedType: PracticeType,
  currentCategory: Category
) => {
  const wordData = await practiceService.getNextWord(userId, currentCategory);

  if (!wordData) {
    const keyboard = await mainKeyboard(userId);
    await bot.sendMessage(chatId, MESSAGES.ERRORS.NO_PRACTICE_WORDS, keyboard);
    practiceStates.delete(chatId);
    stateManager.clearState();
    return;
  }

  const isReverse = isReverseType(selectedType);

  practiceStates.set(chatId, {
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

export const practiceHandler = (bot: TelegramBot) => {
  const handleAnswerResult = async (
    chatId: number,
    state: PracticeState,
    userId: number,
    isCorrectAnswer: boolean,
    keyboard: any,
    isSkipped = false
  ) => {
    // Update word progress if not skipped
    if (state.wordId && !isSkipped) {
      await updateWordProgress(supabase, state.wordId, isCorrectAnswer);
    }

    if (!state.practicedWords) return;

    // Get next word first to check if session should continue
    const nextWordData = await practiceService.getNextWord(
      userId,
      state.currentCategory,
      // @ts-ignore
      state.practicedWords
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
      state.selectedType === PRACTICE_TYPES.RANDOM ? getRandomPracticeType() : state.selectedType;

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
        sessionStats,
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
