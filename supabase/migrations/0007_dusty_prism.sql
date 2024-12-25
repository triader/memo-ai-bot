/*
  # Add admin functionality
  
  1. Schema Changes
    - Add admin columns to auth.users table
    - Add admin-specific policies
  
  2. Security
    - Create admin access policies for words and categories tables
    - Allow admins to view and manage all content
*/

-- Add admin columns to auth.users
ALTER TABLE auth.users 
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Set specific user as admin
DO $$ 
BEGIN
  UPDATE auth.users 
  SET is_admin = true 
  WHERE id = (
    SELECT DISTINCT try_cast_uuid(user_id) 
    FROM words 
    WHERE user_id = '29559383' 
    LIMIT 1
  );
END $$;

-- Create admin access policy for words
CREATE POLICY "Admins can access all words"
  ON words
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.is_admin = true
    )
  );

-- Create admin access policy for categories
CREATE POLICY "Admins can access all categories"
  ON categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.is_admin = true
    )
  );