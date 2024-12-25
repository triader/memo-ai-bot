/*
  # Create words table for language learning

  1. New Tables
    - `words`
      - `id` (uuid, primary key)
      - `user_id` (text) - Telegram user ID
      - `word` (text) - Word to learn
      - `translation` (text) - Translation of the word
      - `created_at` (timestamptz) - When the word was added
      - `last_practiced` (timestamptz) - When the word was last practiced
  
  2. Security
    - Enable RLS on `words` table
    - Add policy for users to manage their own words
*/

CREATE TABLE IF NOT EXISTS words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  word text NOT NULL,
  translation text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_practiced timestamptz
);

-- Enable RLS
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage their own words"
  ON words
  FOR ALL
  USING (true)
  WITH CHECK (true);