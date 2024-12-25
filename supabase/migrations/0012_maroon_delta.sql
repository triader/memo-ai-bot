/*
  # Update category policies for dual ID support

  1. Changes
    - Drop existing policies
    - Create new policy that handles both Telegram user IDs and Supabase auth
    - Add admin access support
  
  2. Security
    - Maintains RLS protection
    - Ensures proper access control for both auth types
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;

-- Create new comprehensive policy
CREATE POLICY "Users can manage their own categories"
ON categories
FOR ALL
USING (
  -- Allow access if either:
  -- 1. User ID matches (handles both Telegram and Supabase IDs)
  -- 2. User is an admin
  user_id::text = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.is_admin = true
  )
)
WITH CHECK (
  user_id::text = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.is_admin = true
  )
);