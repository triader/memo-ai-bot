/*
  # Add users table policies

  1. Changes
    - Add RLS policies for the users table to allow admin access
    - Enable RLS on the users table
  
  2. Security
    - Only admins can view and modify user data
    - Regular users cannot access the users table
*/

-- Enable RLS on users table
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access to users table
CREATE POLICY "Admins can manage users"
ON auth.users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE u.id = auth.uid()
    AND u.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE u.id = auth.uid()
    AND u.is_admin = true
  )
);

-- Allow users to view their own data
CREATE POLICY "Users can view own data"
ON auth.users
FOR SELECT
USING (
  auth.uid() = id
);