import { PRACTICE_TYPES } from '../constants';

export const getRandomPracticeType = () => {
  const types = [
    PRACTICE_TYPES.TRANSLATE,
    PRACTICE_TYPES.TRANSLATE_REVERSE,
    PRACTICE_TYPES.MULTIPLE_CHOICE,
    PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE
  ];
  return types[Math.floor(Math.random() * types.length)];
};
