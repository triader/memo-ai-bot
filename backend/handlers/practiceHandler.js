import { generateSentence } from '../utils/openai.js';
import { updateWordProgress } from './wordProgressHandler.js';
import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';

// Constants
const WORDS_PER_SESSION = 5;

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

    if (error) throw error;
    if (!words?.length) return null;

    return words[0];
  };

  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      // Handle cancel command
      if (text === '❌ Cancel') {
        practiceStates.delete(chatId);
        await bot.sendMessage(chatId, 'Practice cancelled.', mainKeyboard);
        return;
      }

      // Handle initial command
      if (text === '/practice' || text === '🎯 Practice') {
        const currentCategory = await userSettingsService.getCurrentCategory(userId);

        if (!currentCategory) {
          await bot.sendMessage(chatId, 'You need to add some words first!', mainKeyboard);
          return;
        }

        // Initialize practice session
        const word = await getNextWord(userId, currentCategory);
        if (!word) {
          await bot.sendMessage(
            chatId,
            `No words to practice in category "${currentCategory.name}"! All words are well learned or you need to add new ones.`,
            mainKeyboard
          );
          return;
        }

        const practiceType = ['translate', 'multiple_choice', 'fill_blank'][
          Math.floor(Math.random() * 3)
        ];

        practiceStates.set(chatId, {
          wordId: word.id,
          word: word.word,
          correctAnswer: word.translation,
          practiceType,
          isWaitingForAnswer: true,
          sessionProgress: 1,
          practicedWords: [word.id],
          currentCategory
        });

        // Send first practice question
        await sendPracticeQuestion(bot, chatId, word, practiceType, currentCategory);
        return;
      }

      // Handle answer
      const state = practiceStates.get(chatId);
      if (!state || !state.isWaitingForAnswer) return;

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
          ? '✅ Correct!'
          : `❌ Wrong. The correct answer is: ${
              state.practiceType === 'fill_blank' ? state.word : state.correctAnswer
            }`,
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
        let performanceEmoji;
        if (percentage >= 90) performanceEmoji = '🌟';
        else if (percentage >= 70) performanceEmoji = '👍';
        else if (percentage >= 50) performanceEmoji = '💪';
        else performanceEmoji = '📚';

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
          `🎉 Practice session complete!\n\n` +
          `Overall Results:\n` +
          `✅ Correct: ${sessionStats.correct}\n` +
          `❌ Wrong: ${sessionStats.total - sessionStats.correct}\n` +
          `${performanceEmoji} Success rate: ${percentage}%\n\n` +
          `Practiced words:\n\n${wordsList}\n\n` +
          `Keep practicing to improve your vocabulary!`;

        await bot.sendMessage(chatId, summaryMessage, mainKeyboard);
        practiceStates.delete(chatId);
        return;
      }

      // Get next word
      const nextWord = await getNextWord(userId, state.currentCategory, state.practicedWords);
      if (!nextWord) {
        await bot.sendMessage(
          chatId,
          'No more words available for practice in this category.',
          mainKeyboard
        );
        practiceStates.delete(chatId);
        return;
      }

      // Update state for next word
      const nextPracticeType = ['translate', 'multiple_choice', 'fill_blank'][
        Math.floor(Math.random() * 3)
      ];

      practiceStates.set(chatId, {
        ...state,
        wordId: nextWord.id,
        word: nextWord.word,
        correctAnswer: nextWord.translation,
        practiceType: nextPracticeType,
        sessionProgress: state.sessionProgress + 1,
        practicedWords: [...state.practicedWords, nextWord.id],
        sessionResults: {
          ...(state.sessionResults || {}),
          [state.wordId]: isCorrect // Store result for the word that was just answered
        }
      });

      // Send next practice question
      await sendPracticeQuestion(bot, chatId, nextWord, nextPracticeType, state.currentCategory);
    } catch (error) {
      console.error('Practice error:', error);
      await bot.sendMessage(
        chatId,
        '❌ Failed to process practice. Please try again.',
        mainKeyboard
      );
      practiceStates.delete(chatId);
    }
  };
};

// Helper function to send practice questions
const sendPracticeQuestion = async (bot, chatId, word, practiceType, category) => {
  switch (practiceType) {
    case 'translate':
      await bot.sendMessage(
        chatId,
        `[${category.name}] Translate this word: ${word.word}`,
        cancelKeyboard
      );
      break;

    case 'multiple_choice':
      // Note: You'll need to modify this to get other words for options
      const options = [word.translation]; // This needs to be expanded
      await bot.sendMessage(
        chatId,
        `[${category.name}] Choose the correct translation for: ${word.word}`,
        {
          reply_markup: {
            keyboard: options.map((option) => [{ text: option }]),
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
