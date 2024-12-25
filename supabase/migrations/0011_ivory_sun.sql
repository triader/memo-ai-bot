/*
  # Update Category Policies

  1. Changes
    - Drop existing policies
    - Create new policy for user access based on user_id match
    - Maintain admin access
  
  2. Security
    - Enable RLS
    - Ensure proper user isolation
    - Maintain admin privileges
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
DROP POLICY IF EXISTS "Admins can access all categories" ON categories;

-- Create new comprehensive policy for user access
CREATE POLICY "Users can manage their own categories"
ON categories
FOR ALL
USING (
  auth.uid()::text = user_id::text OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.is_admin = true
  )
)
WITH CHECK (
  auth.uid()::text = user_id::text OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.is_admin = true
  )
);

-- Ensure RLS is enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;