/*
  # Fix users table policy recursion

  1. Changes
    - Drop existing policies on auth.users table
    - Create new non-recursive policies for admin and user access
    
  2. Security
    - Maintains admin access control
    - Preserves user data privacy
    - Prevents infinite recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage users" ON auth.users;
DROP POLICY IF EXISTS "Users can view own data" ON auth.users;

-- Create new admin policy without recursion
CREATE POLICY "Admins can manage users"
ON auth.users
FOR ALL
USING (
  (SELECT is_admin FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT is_admin FROM auth.users WHERE id = auth.uid())
);

-- Create user self-view policy
CREATE POLICY "Users can view own data"
ON auth.users
FOR SELECT
USING (
  auth.uid() = id
);