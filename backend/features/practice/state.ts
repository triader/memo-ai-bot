import { Category } from '../../services';
import { PRACTICE_MODES, PRACTICE_TYPES } from './constants';

export interface PracticeState {
  wordId?: string;
  word?: string;
  correctAnswer?: string;
  practiceType?: PRACTICE_TYPES;
  isWaitingForAnswer?: boolean;
  sessionProgress?: number;
  practicedWords?: string[];
  currentCategory?: Category;
  selectedType?: PRACTICE_TYPES;
  sessionResults?: Record<string, boolean | 'skipped'>;
  currentLevel?: number;
  practiceMode?: PRACTICE_MODES;
  isReverse?: boolean;
}
