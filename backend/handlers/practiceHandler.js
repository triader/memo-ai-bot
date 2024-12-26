import { generateSentence } from '../utils/openai.js';
import { updateWordProgress } from './wordProgressHandler.js';
import { mainKeyboard } from '../utils/keyboards.js';
import { MESSAGES, EMOJIS } from '../constants/messages.js';

// Constants
const WORDS_PER_SESSION = 5;

const PRACTICE_TYPES = {
  RANDOM: 'random',
  TRANSLATE: 'translate',
  MULTIPLE_CHOICE: 'multiple_choice',
  FILL_BLANK: 'fill_blank'
};

const PRACTICE_TYPE_LABELS = {
  [PRACTICE_TYPES.RANDOM]: '🎲 Random Practice',
  [PRACTICE_TYPES.TRANSLATE]: '📝 Translation',
  [PRACTICE_TYPES.MULTIPLE_CHOICE]: '✅ Multiple Choice',
  [PRACTICE_TYPES.FILL_BLANK]: '📝 Fill in Blank'
};

// Define cancel keyboard with skip button
const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '⏭️ Skip' }], [{ text: '❌ Cancel' }]],
    resize_keyboard: true
  }
};

// Create practice type selection keyboard
const createPracticeTypeKeyboard = () => ({
  keyboard: [
    [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.RANDOM] }],
    [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.TRANSLATE] }],
    [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.MULTIPLE_CHOICE] }],
    [{ text: PRACTICE_TYPE_LABELS[PRACTICE_TYPES.FILL_BLANK] }],
    [{ text: '❌ Cancel' }]
  ],
  resize_keyboard: true,
  one_time_keyboard: true
});

// Store practice states
export const practiceStates = new Map();

// Helper function to normalize answers
const normalizeAnswer = (text) => {
  // Convert to lowercase and trim
  let normalized = text.trim().toLowerCase();

  // Remove leading "to " for verbs
  if (normalized.startsWith('to ')) {
    normalized = normalized.slice(3);
  }

  // Remove leading "a " or "an " for nouns
  if (normalized.startsWith('a ')) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('an ')) {
    normalized = normalized.slice(3);
  }

  return normalized;
};

// Add this helper function near the top with other helper functions
const createSummaryMessage = (sessionStats, practicedWordsDetails, sessionResults) => {
  const percentage = Math.round((sessionStats.correct / sessionStats.total) * 100);
  const performanceEmoji =
    percentage >= 90
      ? EMOJIS.PERFORMANCE.EXCELLENT
      : percentage >= 70
        ? EMOJIS.PERFORMANCE.GOOD
        : percentage >= 50
          ? EMOJIS.PERFORMANCE.FAIR
          : EMOJIS.PERFORMANCE.LEARNING;

  const wordsList = practicedWordsDetails
    .map((word) => {
      const result = sessionResults[word.id];
      const resultEmoji = result === true ? '✅' : result === 'skipped' ? '⏭️' : '❌';
      const progress = word.mastery_level || 0;
      const progressEmoji = progress >= 90 ? '🌟' : progress >= 50 ? '📈' : '🔄';

      return (
        `${resultEmoji} ${word.word} - ${word.translation}\n` +
        `   ${progressEmoji} Current progress: ${progress}%`
      );
    })
    .join('\n\n');

  return (
    MESSAGES.PRACTICE_SUMMARY.HEADER +
    MESSAGES.PRACTICE_SUMMARY.OVERALL_RESULTS +
    MESSAGES.PRACTICE_SUMMARY.CORRECT(sessionStats.correct) +
    MESSAGES.PRACTICE_SUMMARY.WRONG(
      sessionStats.total - sessionStats.correct - sessionStats.skipped
    ) +
    MESSAGES.PRACTICE_SUMMARY.SKIPPED(sessionStats.skipped) +
    MESSAGES.PRACTICE_SUMMARY.SUCCESS_RATE(performanceEmoji, percentage) +
    MESSAGES.PRACTICE_SUMMARY.PRACTICED_WORDS +
    wordsList +
    '\n\n' +
    MESSAGES.PRACTICE_SUMMARY.FOOTER
  );
};

export const handlePractice = (bot, supabase, userSettingsService) => {
  const getNextWord = async (userId, currentCategory, previousWords = []) => {
    console.log('Getting next word with params:', {
      userId,
      categoryId: currentCategory.id,
      previousWords
    });

    // Get current timestamp minus 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    // Get words for practice, excluding:
    // 1. Previously practiced ones in this session
    // 2. Words practiced in the last 24 hours
    // 3. Words with mastery level >= 90
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', currentCategory.id)
      .lt('mastery_level', 90)
      .or(`last_practiced.is.null,last_practiced.lt.${oneDayAgo.toISOString()}`)
      .not('id', 'in', `(${previousWords.join(',')})`)
      .order('last_practiced', { ascending: true, nullsFirst: true })
      .limit(1);

    console.log('Query result:', { words, error });

    if (error) {
      console.error('Error fetching word:', error);
      throw error;
    }
    if (!words?.length) return null;

    // For multiple choice, also fetch other translations
    const { data: otherWords, error: otherError } = await supabase
      .from('words')
      .select('translation')
      .eq('category_id', currentCategory.id)
      .neq('id', words[0].id)
      .limit(10);

    console.log('Other words result:', { otherWords, otherError });

    return {
      word: words[0],
      otherTranslations: otherWords?.map((w) => w.translation) || []
    };
  };

  const getRandomPracticeType = () => {
    const types = [
      PRACTICE_TYPES.TRANSLATE,
      PRACTICE_TYPES.MULTIPLE_CHOICE,
      PRACTICE_TYPES.FILL_BLANK
    ];
    return types[Math.floor(Math.random() * types.length)];
  };

  const sendPracticeQuestion = async (bot, chatId, wordData, practiceType, category) => {
    const { word, otherTranslations } = wordData;

    switch (practiceType) {
      case 'translate':
        await bot.sendMessage(
          chatId,
          MESSAGES.PROMPTS.TRANSLATE_WORD(category.name, word.word),
          cancelKeyboard
        );
        break;

      case 'multiple_choice':
        // Create and shuffle options
        let options = [word.translation];
        if (otherTranslations.length) {
          const shuffled = otherTranslations
            .filter((t) => t !== word.translation)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          options = [...shuffled, word.translation];
        }
        options.sort(() => Math.random() - 0.5);

        // Add options as keyboard buttons and include Skip and Cancel buttons
        const keyboard = [
          ...options.map((option) => [{ text: option }]),
          [{ text: '⏭️ Skip' }],
          [{ text: '❌ Cancel' }]
        ];

        await bot.sendMessage(
          chatId,
          MESSAGES.PROMPTS.CHOOSE_TRANSLATION(category.name, word.word),
          {
            reply_markup: {
              keyboard,
              one_time_keyboard: true,
              resize_keyboard: true
            }
          }
        );
        break;

      case 'fill_blank':
        const sentence = await generateSentence(word.word, word.translation);
        await bot.sendMessage(chatId, `[${category.name}]\n${sentence}`, cancelKeyboard);
        break;
    }
  };

  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      // Handle cancel command at any point
      if (text === '❌ Cancel') {
        practiceStates.delete(chatId);
        await bot.sendMessage(chatId, MESSAGES.ACTIONS.PRACTICE_CANCELLED, mainKeyboard);
        return;
      }

      // Handle initial command
      if (text === '/practice' || text === '🎯 Practice') {
        const { currentCategory } = await userSettingsService.getCurrentCategory(userId);

        if (!currentCategory) {
          await bot.sendMessage(chatId, MESSAGES.ERRORS.NO_WORDS, mainKeyboard);
          return;
        }

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

      // Handle practice type selection
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

        // Initialize practice session
        console.log('Getting next word for user:', userId, 'category:', state.currentCategory);
        const wordData = await getNextWord(userId, state.currentCategory);
        console.log('Got word data:', wordData);

        if (!wordData) {
          await bot.sendMessage(
            chatId,
            MESSAGES.ERRORS.NO_PRACTICE_WORDS(state.currentCategory.name),
            mainKeyboard
          );
          practiceStates.delete(chatId);
          return;
        }

        const practiceType =
          selectedType === PRACTICE_TYPES.RANDOM ? getRandomPracticeType() : selectedType;
        console.log('Final practice type:', practiceType);

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

      // Handle skip command
      if (text === '⏭️ Skip') {
        await bot.sendMessage(
          chatId,
          MESSAGES.WORD_SKIPPED,
          state.sessionProgress === WORDS_PER_SESSION ? mainKeyboard : cancelKeyboard
        );

        // Update session results for the skipped word
        const updatedSessionResults = {
          ...(state.sessionResults || {}),
          [state.wordId]: 'skipped' // Mark as skipped instead of false
        };

        // Check if session is complete
        if (state.sessionProgress >= WORDS_PER_SESSION) {
          // Get details of practiced words
          const { data: practicedWordsDetails } = await supabase
            .from('words')
            .select('*')
            .in('id', state.practicedWords);

          // Calculate and show final statistics
          const sessionStats = state.practicedWords.reduce(
            (stats, wordId) => {
              const result = updatedSessionResults[wordId];
              return {
                correct: stats.correct + (result === true ? 1 : 0),
                skipped: stats.skipped + (result === 'skipped' ? 1 : 0),
                total: stats.total + 1
              };
            },
            { correct: 0, skipped: 0, total: 0 }
          );

          // Show summary and end session
          const summaryMessage = createSummaryMessage(
            sessionStats,
            practicedWordsDetails,
            updatedSessionResults
          );
          await bot.sendMessage(chatId, summaryMessage, mainKeyboard);
          practiceStates.delete(chatId);
          return;
        }

        // If session continues, get next word
        const nextWordData = await getNextWord(userId, state.currentCategory, state.practicedWords);
        if (!nextWordData) {
          await bot.sendMessage(chatId, MESSAGES.ERRORS.NO_MORE_WORDS, mainKeyboard);
          practiceStates.delete(chatId);
          return;
        }

        // Update state for next word
        const nextPracticeType =
          state.selectedType === PRACTICE_TYPES.RANDOM
            ? getRandomPracticeType()
            : state.selectedType;

        practiceStates.set(chatId, {
          ...state,
          wordId: nextWordData.word.id,
          word: nextWordData.word.word,
          correctAnswer: nextWordData.word.translation,
          practiceType: nextPracticeType,
          sessionProgress: state.sessionProgress + 1,
          practicedWords: [...state.practicedWords, nextWordData.word.id],
          sessionResults: updatedSessionResults
        });

        // Send next practice question
        await sendPracticeQuestion(
          bot,
          chatId,
          nextWordData,
          nextPracticeType,
          state.currentCategory
        );
        return;
      }

      // Handle answer
      if (!state.isWaitingForAnswer) return;

      // Check answer
      const answer = normalizeAnswer(text);
      let isCorrect = false;

      switch (state.practiceType) {
        case 'translate':
          isCorrect = answer === normalizeAnswer(state.correctAnswer);
          break;
        case 'multiple_choice':
          isCorrect = answer === normalizeAnswer(state.correctAnswer);
          break;
        case 'fill_blank':
          isCorrect = answer === normalizeAnswer(state.word);
          break;
      }

      // Update word progress
      if (state.wordId) {
        await updateWordProgress(supabase, state.wordId, isCorrect);
      }

      // Send feedback
      await bot.sendMessage(
        chatId,
        isCorrect
          ? MESSAGES.SUCCESS.CORRECT_ANSWER
          : MESSAGES.SUCCESS.WRONG_ANSWER(
              state.practiceType === 'fill_blank' ? state.word : state.correctAnswer
            ),
        state.sessionProgress === WORDS_PER_SESSION ? mainKeyboard : cancelKeyboard
      );

      // Check if session is complete
      if (state.sessionProgress >= WORDS_PER_SESSION) {
        // Update session results with the last answer first
        const finalSessionResults = {
          ...(state.sessionResults || {}),
          [state.wordId]: isCorrect
        };

        // Get details of practiced words
        const { data: practicedWordsDetails } = await supabase
          .from('words')
          .select('*')
          .in('id', state.practicedWords);

        // Calculate session statistics
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
        await bot.sendMessage(chatId, summaryMessage, mainKeyboard);
        practiceStates.delete(chatId);
        return;
      }

      // Get next word
      const nextWordData = await getNextWord(userId, state.currentCategory, state.practicedWords);
      if (!nextWordData) {
        await bot.sendMessage(chatId, MESSAGES.ERRORS.NO_MORE_WORDS, mainKeyboard);
        practiceStates.delete(chatId);
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
          [state.wordId]: isCorrect
        }
      });

      // Send next practice question
      await sendPracticeQuestion(
        bot,
        chatId,
        nextWordData,
        nextPracticeType,
        state.currentCategory
      );
    } catch (error) {
      console.error('Practice error:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.PRACTICE, mainKeyboard);
      practiceStates.delete(chatId);
    }
  };
};
