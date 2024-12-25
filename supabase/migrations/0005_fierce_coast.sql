/*
  # Add UUID support for users

  1. New Columns
    - Add user_uuid column to words table
    - Add user_uuid column to categories table
  
  2. Functions
    - Create function to get or create user UUID with proper type casting
  
  3. Data Migration
    - Update existing records with generated UUIDs
*/

-- Add user_uuid column to words and categories tables
ALTER TABLE words ADD COLUMN IF NOT EXISTS user_uuid uuid;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_uuid uuid;

-- Create function to get or create user UUID
CREATE OR REPLACE FUNCTION get_or_create_user_uuid(p_user_id text)
RETURNS uuid AS $$
DECLARE
  v_user_uuid uuid;
BEGIN
  -- First try to get existing UUID from words table
  SELECT DISTINCT user_uuid INTO v_user_uuid
  FROM words
  WHERE user_id::text = p_user_id AND user_uuid IS NOT NULL
  LIMIT 1;
  
  -- If not found, try categories table
  IF v_user_uuid IS NULL THEN
    SELECT DISTINCT user_uuid INTO v_user_uuid
    FROM categories
    WHERE user_id::text = p_user_id AND user_uuid IS NOT NULL
    LIMIT 1;
  END IF;
  
  -- If still not found, generate new UUID
  IF v_user_uuid IS NULL THEN
    v_user_uuid := gen_random_uuid();
  END IF;
  
  RETURN v_user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Update existing records with generated UUIDs
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Update words table
  FOR r IN SELECT DISTINCT user_id FROM words WHERE user_uuid IS NULL LOOP
    UPDATE words
    SET user_uuid = get_or_create_user_uuid(r.user_id::text)
    WHERE user_id::text = r.user_id::text;
  END LOOP;
  
  -- Update categories table
  FOR r IN SELECT DISTINCT user_id FROM categories WHERE user_uuid IS NULL LOOP
    UPDATE categories
    SET user_uuid = get_or_create_user_uuid(r.user_id::text)
    WHERE user_id::text = r.user_id::text;
  END LOOP;
END $$;