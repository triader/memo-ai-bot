import { updateWordProgress } from '../../handlers/updateWordProgressHandler.js';
import { mainKeyboard, removeKeyboard } from '../../utils/keyboards.js';
import { MESSAGES } from '../../constants/messages.js';
import { BotState, stateManager } from '../../utils/stateManager.js';
import { BUTTONS as MAIN_BUTTONS } from '../../constants/buttons.js';
import { createSummaryMessage } from './index.js';
import { normalizeAnswer } from './utils/normalizeAnswer.js';
import { PracticeService } from './services/practiceService.js';
import {
  WORDS_PER_SESSION,
  PRACTICE_TYPES,
  PRACTICE_TYPE_LABELS,
  BUTTONS
} from './constants/index.js';
import {
  createPracticeTypeKeyboard,
  createMultipleChoiceKeyboard,
  createTranslateKeyboard
} from './utils/keyboards.js';

export const practiceStates = new Map();

async function exitPractice(bot, chatId, keyboard) {
  stateManager.setState(BotState.IDLE);
  await bot.sendMessage(
    chatId,
    'Practice session ended. You can start a new practice session anytime! 🌟',
    keyboard
  );
}

export const practiceHandler = (bot, supabase, userSettingsService) => {
  const practiceService = new PracticeService(supabase);

  const getRandomPracticeType = () => {
    const types = [PRACTICE_TYPES.TRANSLATE, PRACTICE_TYPES.MULTIPLE_CHOICE];
    return types[Math.floor(Math.random() * types.length)];
  };

  const sendPracticeQuestion = async (bot, chatId, wordData, practiceType, category) => {
    const { word, otherTranslations } = wordData;

    switch (practiceType) {
      case 'translate':
        await bot.sendMessage(
          chatId,
          MESSAGES.PROMPTS.TRANSLATE_WORD(word.word),
          createTranslateKeyboard()
        );
        break;

      case 'multiple_choice':
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
    }
  };

  const handleAnswerResult = async (chatId, state, userId, result, keyboard, isSkipped = false) => {
    // Update word progress if not skipped
    if (state.wordId && !isSkipped) {
      await updateWordProgress(supabase, state.wordId, result);
    }

    // Get next word first to check if session should continue
    const nextWordData = await practiceService.getNextWord(
      userId,
      state.currentCategory,
      state.practicedWords
    );
    const isNextWord = !!nextWordData && state.sessionProgress < WORDS_PER_SESSION;

    // Send feedback message
    await bot.sendMessage(
      chatId,
      isSkipped
        ? MESSAGES.WORD_SKIPPED(state.word, state.correctAnswer, isNextWord)
        : result
          ? MESSAGES.SUCCESS.CORRECT_ANSWER
          : MESSAGES.SUCCESS.WRONG_ANSWER(state.correctAnswer),
      state.sessionProgress === WORDS_PER_SESSION ? keyboard : removeKeyboard
    );

    // Check if session is complete
    if (state.sessionProgress >= WORDS_PER_SESSION || !nextWordData) {
      await handleSessionComplete(
        chatId,
        state,
        { ...state.sessionResults, [state.wordId]: isSkipped ? 'skipped' : result },
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
      correctAnswer: nextWordData.word.translation,
      practiceType: nextPracticeType,
      sessionProgress: state.sessionProgress + 1,
      practicedWords: [...state.practicedWords, nextWordData.word.id],
      sessionResults: {
        ...(state.sessionResults || {}),
        [state.wordId]: isSkipped ? 'skipped' : result
      }
    });

    // Send next practice question
    await sendPracticeQuestion(bot, chatId, nextWordData, nextPracticeType, state.currentCategory);
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
          step: 'selecting_type',
          currentCategory
        });
        return;
      }

      const state = practiceStates.get(chatId);
      if (!state) return;

      if (state.step === 'selecting_type') {
        let selectedType;

        for (const [type, label] of Object.entries(PRACTICE_TYPE_LABELS)) {
          if (text === label) {
            selectedType = type;
            break;
          }
        }

        if (!selectedType) {
          await bot.sendMessage(chatId, MESSAGES.ERRORS.INVALID_PRACTICE_TYPE, {
            reply_markup: createPracticeTypeKeyboard()
          });
          return;
        }

        const wordData = await practiceService.getNextWord(userId, state.currentCategory);

        if (!wordData) {
          await bot.sendMessage(
            chatId,
            MESSAGES.ERRORS.NO_PRACTICE_WORDS(state.currentCategory.name),
            keyboard
          );
          practiceStates.delete(chatId);
          return;
        }

        const practiceType =
          selectedType === PRACTICE_TYPES.RANDOM ? getRandomPracticeType() : selectedType;

        practiceStates.set(chatId, {
          wordId: wordData.word.id,
          word: wordData.word.word,
          correctAnswer: wordData.word.translation,
          practiceType,
          isWaitingForAnswer: true,
          sessionProgress: 1,
          practicedWords: [wordData.word.id],
          currentCategory: state.currentCategory,
          selectedType
        });

        await sendPracticeQuestion(bot, chatId, wordData, practiceType, state.currentCategory);
        return;
      }

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
