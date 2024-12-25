/*
  # Add categories support

  1. Changes
    - Add categories table for organizing flashcards
    - Add category_id to words table
    - Create default English category for existing words
    - Set up RLS policies

  2. Security
    - Enable RLS on categories table
    - Add policies for authenticated users to manage their categories
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Add category support to words table
ALTER TABLE words 
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for categories
CREATE POLICY "Users can manage their own categories"
  ON categories
  FOR ALL
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

-- Create a function to safely convert text to UUID
CREATE OR REPLACE FUNCTION try_cast_uuid(p_text text) 
RETURNS uuid AS $$
BEGIN
  BEGIN
    RETURN p_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create default English categories only for users who have words
INSERT INTO categories (user_id, name)
SELECT DISTINCT try_cast_uuid(w.user_id), 'English'
FROM words w
WHERE try_cast_uuid(w.user_id) IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.user_id = try_cast_uuid(w.user_id)
  AND c.name = 'English'
);

-- Update existing words to use the English category
UPDATE words w
SET category_id = c.id
FROM categories c
WHERE try_cast_uuid(w.user_id) = c.user_id
  AND c.name = 'English'
  AND w.category_id IS NULL;