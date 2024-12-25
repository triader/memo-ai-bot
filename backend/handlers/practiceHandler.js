import { generateSentence } from '../utils/openai.js';
import { updateWordProgress } from './wordProgressHandler.js';
import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';
import { MESSAGES, EMOJIS } from '../constants/messages.js';

// Constants
const WORDS_PER_SESSION = 5;

const PRACTICE_TYPES = {
  RANDOM: 'random',
  TRANSLATE: 'translate',
  MULTIPLE_CHOICE: 'multiple_choice',
  FILL_BLANK: 'fill_blank'
};

console.log('Practice types:', PRACTICE_TYPES);

const PRACTICE_TYPE_LABELS = {
  [PRACTICE_TYPES.RANDOM]: '🎲 Random Practice',
  [PRACTICE_TYPES.TRANSLATE]: '📝 Translation',
  [PRACTICE_TYPES.MULTIPLE_CHOICE]: '✅ Multiple Choice',
  [PRACTICE_TYPES.FILL_BLANK]: '📝 Fill in Blank'
};

console.log('Practice type labels:', PRACTICE_TYPE_LABELS);

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

export const handlePractice = (bot, supabase, userSettingsService) => {
  const getNextWord = async (userId, currentCategory, previousWords = []) => {
    console.log('Getting next word with params:', {
      userId,
      categoryId: currentCategory.id,
      previousWords
    });

    // Get words for practice, excluding previously practiced ones
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', currentCategory.id)
      .lt('mastery_level', 90)
      .order('last_practiced', { ascending: true })
      .not('id', 'in', `(${previousWords.join(',')})`)
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

        // Add options as keyboard buttons and include Cancel button
        const keyboard = [...options.map((option) => [{ text: option }]), [{ text: '❌ Cancel' }]];

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
        const currentCategory = await userSettingsService.getCurrentCategory(userId);

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
        // Get details of practiced words
        const { data: practicedWordsDetails } = await supabase
          .from('words')
          .select('*')
          .in('id', state.practicedWords);

        // Calculate session statistics
        const sessionStats = state.practicedWords.reduce(
          (stats, wordId) => {
            const isCorrect = state.sessionResults?.[wordId] || false;
            return {
              correct: stats.correct + (isCorrect ? 1 : 0),
              total: stats.total + 1
            };
          },
          { correct: 0, total: 0 }
        );

        const percentage = Math.round((sessionStats.correct / sessionStats.total) * 100);
        const performanceEmoji =
          percentage >= 90
            ? EMOJIS.PERFORMANCE.EXCELLENT
            : percentage >= 70
              ? EMOJIS.PERFORMANCE.GOOD
              : percentage >= 50
                ? EMOJIS.PERFORMANCE.FAIR
                : EMOJIS.PERFORMANCE.LEARNING;

        // Format practiced words list
        const wordsList = practicedWordsDetails
          .map((word) => {
            const isCorrect = state.sessionResults[word.id];
            const resultEmoji = isCorrect ? '✅' : '❌';
            const progress = word.mastery_level || 0;
            const progressEmoji = progress >= 90 ? '🌟' : progress >= 50 ? '📈' : '🔄';

            return (
              `${resultEmoji} ${word.word} - ${word.translation}\n` +
              `   ${progressEmoji} Current progress: ${progress}%`
            );
          })
          .join('\n\n');

        const summaryMessage =
          MESSAGES.PRACTICE_SUMMARY.HEADER +
          MESSAGES.PRACTICE_SUMMARY.OVERALL_RESULTS +
          MESSAGES.PRACTICE_SUMMARY.CORRECT(sessionStats.correct) +
          MESSAGES.PRACTICE_SUMMARY.WRONG(sessionStats.total - sessionStats.correct) +
          MESSAGES.PRACTICE_SUMMARY.SUCCESS_RATE(performanceEmoji, percentage) +
          MESSAGES.PRACTICE_SUMMARY.PRACTICED_WORDS +
          MESSAGES.PRACTICE_SUMMARY.FOOTER;

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
