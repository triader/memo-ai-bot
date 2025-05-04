import { PRACTICE_TYPES } from '../constants';

export const getPracticeTypeBasedOnProgress = (masteryLevel: number): PRACTICE_TYPES => {
  if (masteryLevel >= 0 && masteryLevel <= 29) {
    return PRACTICE_TYPES.MULTIPLE_CHOICE;
  } else if (masteryLevel >= 30 && masteryLevel <= 59) {
    return PRACTICE_TYPES.TRANSLATE;
  } else if (masteryLevel >= 60 && masteryLevel <= 79) {
    return PRACTICE_TYPES.REVERSE_MULTIPLE_CHOICE;
  } else {
    return PRACTICE_TYPES.TRANSLATE_REVERSE;
  }
};
