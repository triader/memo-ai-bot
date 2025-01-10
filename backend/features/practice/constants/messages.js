export const MESSAGES = {
  ERRORS: {
    NO_PRACTICE_WORDS: `All words are well learned.`,
    NO_WORDS_CATEGORY: (categoryName) =>
      `You don't have any words in category "${categoryName}" yet.\nAdd some words first to start practicing!`,
    NO_MORE_WORDS: 'No more words available for practice in this category.',
    INVALID_PRACTICE_TYPE: '❌ Please select a valid practice type or cancel.'
  },
  PRACTICE_SUMMARY: {
    HEADER: '🎉 Practice session complete!\n\n',
    OVERALL_RESULTS: 'Overall Results:',
    CORRECT: (count) => `✅ Correct: ${count}`,
    WRONG: (count) => `❌ Wrong: ${count}`,
    SKIPPED: (count) => `⏭️ Skipped: ${count}`,
    SUCCESS_RATE: (emoji, percentage) => `${emoji} Success rate: ${percentage}%`,
    PRACTICED_WORDS: 'Practiced words:',
    FOOTER: 'Keep practicing to improve your vocabulary!'
  },
  PROMPTS: {
    CORRECT_ANSWER: '✅ Correct!',
    WRONG_ANSWER: (correctAnswer) => `❌ Wrong. The correct answer is: ${correctAnswer}`,
    TRANSLATE_WORD: (word) => `Translate: ${word}`,
    TRANSLATE_REVERSE: (translation) => `What word means: ${translation}?`,
    CHOOSE_TRANSLATION: (word) => `${word}`,
    CHOOSE_WORD: (translation) => `Choose the word that means: ${translation}`,
    CHOOSE_PRACTICE_TYPE: 'Choose practice type:',
    WORD_SKIPPED: (answer, hasNextWord) => {
      const continueMsg = hasNextWord ? '\n\nNext word coming up...' : '';
      return `Skipped. The answer was "${answer}"${continueMsg}`;
    }
  }
};
