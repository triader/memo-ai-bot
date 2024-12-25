/*
  # Fix User Policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create new policies using a more efficient approach
    - Add admin check function for better performance
  
  2. Security
    - Maintains row level security
    - Preserves admin and user access controls
    - Prevents infinite recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage users" ON auth.users;
DROP POLICY IF EXISTS "Users can view own data" ON auth.users;

-- Create function for admin check
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create new admin policy
CREATE POLICY "Admins can manage users"
ON auth.users
FOR ALL
USING (
  auth.is_admin()
)
WITH CHECK (
  auth.is_admin()
);

-- Create user self-view policy
CREATE POLICY "Users can view own data"
ON auth.users
FOR SELECT
USING (
  id = auth.uid()
);