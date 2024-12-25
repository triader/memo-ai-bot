/*
  # Update RLS policies for UUID-based access

  1. Changes
    - Update RLS policies to use user_uuid instead of user_id
    - Add new policies for categories table
    - Add new policies for words table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;

-- Create new policies using user_uuid
CREATE POLICY "Users can manage their own categories"
  ON categories
  FOR ALL
  USING (user_uuid = auth.uid()::uuid)
  WITH CHECK (user_uuid = auth.uid()::uuid);

-- Update words table policies
DROP POLICY IF EXISTS "Users can manage their own words" ON words;

CREATE POLICY "Users can manage their own words"
  ON words
  FOR ALL
  USING (user_uuid = auth.uid()::uuid)
  WITH CHECK (user_uuid = auth.uid()::uuid);