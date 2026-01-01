-- Add contact fields to profiles table for client management
-- Some fields may already exist, so we use IF NOT EXISTS pattern

-- Phone secondary and phone type fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary_type text;

-- Company name
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;

-- Address fields (address column already exists, add structured fields)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country text;

-- Emergency contact fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Contact preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_contact_method text;

-- Internal notes (client_notes already exists, add internal_notes for staff-only notes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS internal_notes text;

-- Add check constraints for enum-like fields
-- Drop existing constraints first if they exist (to make migration idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_type_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_type_check
      CHECK (phone_type IS NULL OR phone_type IN ('mobile', 'business', 'home'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_secondary_type_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_secondary_type_check
      CHECK (phone_secondary_type IS NULL OR phone_secondary_type IN ('mobile', 'business', 'home'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_contact_method_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_contact_method_check
      CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'text'));
  END IF;
END$$;

-- Add column comments for documentation
COMMENT ON COLUMN profiles.phone IS 'Primary phone number';
COMMENT ON COLUMN profiles.phone_secondary IS 'Secondary phone number';
COMMENT ON COLUMN profiles.phone_type IS 'Type of primary phone: mobile, business, or home';
COMMENT ON COLUMN profiles.phone_secondary_type IS 'Type of secondary phone: mobile, business, or home';
COMMENT ON COLUMN profiles.company_name IS 'Client company or organization name';
COMMENT ON COLUMN profiles.address_street IS 'Street address';
COMMENT ON COLUMN profiles.address_city IS 'City';
COMMENT ON COLUMN profiles.address_state IS 'State or province';
COMMENT ON COLUMN profiles.address_zip IS 'ZIP or postal code';
COMMENT ON COLUMN profiles.address_country IS 'Country';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'Emergency contact full name';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN profiles.preferred_contact_method IS 'Preferred contact method: email, phone, or text';
COMMENT ON COLUMN profiles.internal_notes IS 'Private notes visible only to staff/admin';
