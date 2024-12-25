/*
  # Add user roles and set admin user

  1. New Tables
    - `user_roles` table to store role information
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add role_id column to auth.users table
    - Create default roles (admin, user)
    - Set specific user as admin

  3. Security
    - Enable RLS on user_roles table
    - Add policies for role access
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Add role_id to auth.users
ALTER TABLE auth.users 
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES user_roles(id);

-- Insert default roles
INSERT INTO user_roles (name, description)
VALUES 
  ('admin', 'Full system access'),
  ('user', 'Standard user access')
ON CONFLICT (name) DO NOTHING;

-- Set user as admin
DO $$ 
DECLARE
  admin_role_id uuid;
BEGIN
  -- Get admin role id
  SELECT id INTO admin_role_id FROM user_roles WHERE name = 'admin';
  
  -- Update user's role
  UPDATE auth.users 
  SET 
    role_id = admin_role_id,
    is_admin = true
  WHERE id = (
    SELECT DISTINCT try_cast_uuid(user_id)
    FROM words 
    WHERE user_id = '29559383'
    LIMIT 1
  );
END $$;

-- Create policies for user_roles
CREATE POLICY "Users can view roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify roles"
  ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.is_admin = true
    )
  );