/*
  # Update word categories

  1. Changes
    - Updates all words to use category_id 'e5389e11-e618-4008-a933-06f719de4330'
  
  2. Safety
    - Uses safe update operation
    - Validates UUID format
*/

-- Update all words to use the specified category
UPDATE words
SET category_id = 'e5389e11-e618-4008-a933-06f719de4330'::uuid
WHERE category_id IS NULL OR category_id != 'e5389e11-e618-4008-a933-06f719de4330'::uuid;