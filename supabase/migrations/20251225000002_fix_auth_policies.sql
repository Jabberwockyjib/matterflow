-- Fix RLS policies to use helper function and restore staff permissions

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Users can view own profile OR admins/staff can view all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR current_user_role() IN ('admin', 'staff'));

-- Users can update own profile (basic fields only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins and staff can manage all profiles
CREATE POLICY "Admins and staff can manage all profiles"
  ON profiles FOR ALL
  USING (current_user_role() IN ('admin', 'staff'))
  WITH CHECK (current_user_role() IN ('admin', 'staff'));

-- Fix status column to be NOT NULL
ALTER TABLE profiles
  ALTER COLUMN status SET NOT NULL;
