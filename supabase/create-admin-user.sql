-- ============================================
-- Create Admin User Template
-- ============================================
-- Run this AFTER production-init.sql
-- Replace email and password as needed
-- ============================================

-- Create user in auth.users with all required fields
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',  -- CHANGE THIS
  crypt('YourSecurePassword123', gen_salt('bf')),  -- CHANGE THIS
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email_verified": true}',
  'authenticated',
  'authenticated',
  '',  -- confirmation_token
  '',  -- recovery_token
  '',  -- email_change_token_new
  '',  -- email_change
  '',  -- phone_change
  '',  -- phone_change_token
  ''   -- reauthentication_token
);

-- Update profile to admin (trigger creates it as 'client')
UPDATE profiles
SET role = 'admin', full_name = 'Admin User'  -- CHANGE THIS
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');  -- CHANGE THIS
