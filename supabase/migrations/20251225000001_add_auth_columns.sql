-- Add authentication management columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'inactive')),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Create index on last_login for sorting
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login);

-- Update RLS policies for admin user management
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR
         (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- Users can update own profile (basic fields only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- Update audit_logs with new event types
COMMENT ON TABLE audit_logs IS 'Audit trail for all system events including: user.invited, user.first_login, user.password_changed, user.password_reset_requested, user.password_reset_completed, user.role_changed, user.deactivated, user.reactivated, auth.failed_login';
