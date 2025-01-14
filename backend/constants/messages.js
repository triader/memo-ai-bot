export const MESSAGES = {
  ERRORS: {
    GENERAL: '❌ An error occurred. Please try again.',
    PRACTICE: '❌ Failed to process practice. Please try again.',
    FETCH_WORDS: '❌ Failed to fetch words. Please try again.',
    NO_WORDS: 'You need to add some words first!',
    NO_WORDS_CATEGORY: (categoryName) =>
      `No words found in category "${categoryName}". Add some words first!`,
    WORD_NOT_FOUND: '❌ Word not found. Please try again.',
    EDIT_CANCELLED: '❌ Edit cancelled.',
    DELETE_CANCELLED: '❌ Delete cancelled.',
    PRACTICE_SUMMARY:
      '❌ Sorry, there was an error creating your practice summary. Please try again.'
  },

  SUCCESS: {
    WORD_UPDATED: '✅ Word has been updated successfully!',
    WORD_DELETED: (word) => `✅ Word "${word}" has been deleted.`
  },

  ACTIONS: {
    CANCELLED: 'Operation cancelled.',
    PRACTICE_CANCELLED: 'Practice cancelled.'
  },

  PROMPTS: {
    EDIT_WHICH_WORD: 'Which word would you like to edit?',
    ENTER_NEW_WORD: (oldWord) => `Current word is "${oldWord}". Please enter the new word:`,
    ENTER_NEW_TRANSLATION: (oldTranslation) =>
      `Current translation is "${oldTranslation}". Please enter the new translation:`,
    DELETE_WHICH_WORD: 'Which word would you like to delete?',
    SELECT_WORD_TO_DELETE: 'Select the word you want to delete:'
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
