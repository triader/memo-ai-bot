import { PRACTICE_TYPES } from '../constants';

export const isReverseType = (practiceType: PRACTICE_TYPES): boolean => {
  if (
    practiceType === PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE ||
    practiceType === PRACTICE_TYPES.TRANSLATE_REVERSE
  ) {
    return true;
  }
  return false;
};
