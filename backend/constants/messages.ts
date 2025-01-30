export const MESSAGES = {
  ERRORS: {
    GENERAL: '❌ An error occurred. Please try again.',
    PRACTICE: '❌ Failed to process practice. Please try again.',
    FETCH_WORDS: '❌ Failed to fetch words. Please try again.',
    NO_WORDS: 'You need to add some words first!',
    NO_WORDS_CATEGORY: (categoryName: string) =>
      `No words found in category "${categoryName}". Add some words first!`,
    WORD_NOT_FOUND: '❌ Word not found. Please try again.',
    EDIT_CANCELLED: '❌ Edit cancelled.',
    DELETE_CANCELLED: '❌ Delete cancelled.',
    INVALID_WORDS_PER_LEVEL: 'Please enter a valid number greater than 0.',
    WORDS_PER_LEVEL_FAILED: 'Failed to set words per level. Please try again.'
  },
  SUCCESS: {
    WORD_UPDATED: '✅ Word has been updated successfully!',
    WORD_DELETED: (word: string, translation: string) =>
      `✅ "${word} - ${translation}" has been deleted.`
  },

  ACTIONS: {
    CANCELLED: 'Operation cancelled.',
    PRACTICE_CANCELLED: 'Practice cancelled.'
  },

  PROMPTS: {
    EDIT_WHICH_WORD: 'Which word would you like to edit?',
    ENTER_NEW_WORD: (oldWord: string) => `Current word is "${oldWord}". Please enter the new word:`,
    ENTER_NEW_TRANSLATION: (oldTranslation: string) =>
      `Current translation is "${oldTranslation}". Please enter the new translation:`,
    DELETE_WHICH_WORD: 'Which word would you like to delete?',
    SELECT_WORD_TO_DELETE: 'Select the word you want to delete:',
    ENTER_WORDS_PER_LEVEL: 'Enter how many words you want to have in each level:',
    WORDS_PER_LEVEL_SET: (count: number) =>
      `✅ Successfully set ${count} words per level. Your words have been reorganized into levels.`
  }
} as const;

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
} as const;
