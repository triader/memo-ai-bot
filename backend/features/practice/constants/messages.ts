export const MESSAGES = {
  ERRORS: {
    NO_PRACTICE_WORDS: `All words are well learned.`,
    NO_WORDS_CATEGORY: (categoryName: string) =>
      `You don't have any words in category "${categoryName}" yet.\nAdd some words first to start practicing!`,
    NO_MORE_WORDS: 'No more words available for practice in this category.',
    INVALID_PRACTICE_TYPE: '❌ Please select a valid practice type or cancel.',
    PRACTICE: '❌ Failed to process practice. Please try again.',
    PRACTICE_SUMMARY:
      '❌ Sorry, there was an error creating your practice summary. Please try again.'
  },
  PRACTICE_SUMMARY: {
    HEADER: '🎉 Practice session complete!\n\n',
    OVERALL_RESULTS: 'Overall Results:',
    CORRECT: (count: number) => `✅ Correct: ${count}`,
    WRONG: (count: number) => `❌ Wrong: ${count}`,
    SKIPPED: (count: number) => `⏭️ Skipped: ${count}`,
    SUCCESS_RATE: (emoji: string, percentage: number) => `${emoji} Success rate: ${percentage}%`,
    PRACTICED_WORDS: 'Practiced words: \n\n',
    FOOTER: 'Keep practicing to improve your vocabulary!'
  },
  PROMPTS: {
    CORRECT_ANSWER: '✅ Correct!',
    WRONG_ANSWER: (correctAnswer: string) => `❌ Wrong. The correct answer is: ${correctAnswer}`,
    TRANSLATE_WORD: (word: string) => `Translate: ${word}`,
    TRANSLATE_REVERSE: (translation: string) => `What word means: ${translation}?`,
    CHOOSE_TRANSLATION: (word: string) => `${word}`,
    CHOOSE_WORD: (translation: string) => `Choose the word that means: ${translation}`,
    CHOOSE_PRACTICE_TYPE: 'Choose practice type:',
    WORD_SKIPPED: (answer: string, hasNextWord: boolean) => {
      const continueMsg = hasNextWord ? '\n\nNext word coming up...' : '';
      return `Skipped. The answer was "${answer}"${continueMsg}`;
    }
  }
} as const;
