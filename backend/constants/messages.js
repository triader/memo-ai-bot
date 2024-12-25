export const MESSAGES = {
  ERRORS: {
    GENERAL: '❌ An error occurred. Please try again.',
    PRACTICE: '❌ Failed to process practice. Please try again.',
    FETCH_WORDS: '❌ Failed to fetch words. Please try again.',
    NO_WORDS: 'You need to add some words first!',
    NO_WORDS_CATEGORY: (categoryName) =>
      `No words found in category "${categoryName}". Add some words first!`,
    NO_PRACTICE_WORDS: (categoryName) =>
      `No words to practice in category "${categoryName}"! All words are well learned or you need to add new ones.`,
    NO_MORE_WORDS: 'No more words available for practice in this category.',
    INVALID_PRACTICE_TYPE: '❌ Please select a valid practice type or cancel.'
  },

  SUCCESS: {
    PRACTICE_COMPLETE: '🎉 Practice session complete!',
    CORRECT_ANSWER: '✅ Correct!',
    WRONG_ANSWER: (correctAnswer) => `❌ Wrong. The correct answer is: ${correctAnswer}`
  },

  ACTIONS: {
    CANCELLED: 'Operation cancelled.',
    PRACTICE_CANCELLED: 'Practice cancelled.'
  },

  PROMPTS: {
    CHOOSE_PRACTICE_TYPE: 'Choose practice type:',
    TRANSLATE_WORD: (category, word) => `[${category}] Translate this word: ${word}`,
    CHOOSE_TRANSLATION: (category, word) =>
      `[${category}] Choose the correct translation for: ${word}`
  },

  PRACTICE_SUMMARY: {
    HEADER: '🎉 Practice session complete!\n\n',
    OVERALL_RESULTS: 'Overall Results:',
    CORRECT: (count) => `✅ Correct: ${count}`,
    WRONG: (count) => `❌ Wrong: ${count}`,
    SUCCESS_RATE: (emoji, percentage) => `${emoji} Success rate: ${percentage}%`,
    PRACTICED_WORDS: 'Practiced words:',
    FOOTER: 'Keep practicing to improve your vocabulary!'
  }
};

export const EMOJIS = {
  MASTERY: {
    EXPERT: '🌟', // 90%+
    ADVANCED: '📈', // 50-89%
    BEGINNER: '🔄' // 0-49%
  },
  PERFORMANCE: {
    EXCELLENT: '🌟', // 90%+
    GOOD: '👍', // 70-89%
    FAIR: '💪', // 50-69%
    LEARNING: '📚' // 0-49%
  },
  RESULT: {
    CORRECT: '✅',
    WRONG: '❌'
  }
};
