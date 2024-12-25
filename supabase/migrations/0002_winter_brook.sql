/*
  # Add word progress tracking

  1. Changes
    - Add progress tracking columns to words table:
      - correct_answers (integer): Count of correct answers
      - incorrect_answers (integer): Count of incorrect answers
      - mastery_level (integer): 0-100 indicating word mastery
      - last_result (boolean): Result of last practice
  
  2. Notes
    - mastery_level is calculated based on correct/incorrect answers ratio
    - Words with mastery_level >= 90 are considered "learned"
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'words' AND column_name = 'correct_answers'
  ) THEN
    ALTER TABLE words 
      ADD COLUMN correct_answers integer DEFAULT 0,
      ADD COLUMN incorrect_answers integer DEFAULT 0,
      ADD COLUMN mastery_level integer DEFAULT 0,
      ADD COLUMN last_result boolean;
  END IF;
END $$;