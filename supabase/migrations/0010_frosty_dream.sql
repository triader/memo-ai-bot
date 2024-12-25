/*
  # Fix Categories Table Permissions

  1. Changes
    - Update RLS policies for categories table
    - Add proper authentication checks
    - Ensure compatibility with auth.users admin status
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
DROP POLICY IF EXISTS "Admins can access all categories" ON categories;

-- Create new comprehensive policy
CREATE POLICY "Users can manage their own categories"
ON categories
FOR ALL
USING (
  (user_id::text = auth.uid()::text) OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.is_admin = true
  )
)
WITH CHECK (
  (user_id::text = auth.uid()::text) OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.is_admin = true
  )
);

-- Ensure RLS is enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;