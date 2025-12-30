-- Create practice_settings table for firm-wide configuration
CREATE TABLE practice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name text NOT NULL DEFAULT 'My Law Firm',
  contact_email text,
  contact_phone text,
  address text,
  default_hourly_rate numeric(10,2),
  payment_terms_days integer DEFAULT 30,
  late_fee_percentage numeric(5,2) DEFAULT 0,
  auto_reminders_enabled boolean DEFAULT true,
  matter_types jsonb DEFAULT '["Contract Review", "Employment Agreement", "Policy Review", "Litigation", "Estate Planning", "Real Estate", "Business Formation"]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one row exists (singleton pattern)
CREATE UNIQUE INDEX idx_practice_settings_singleton ON practice_settings ((true));

-- Insert default row
INSERT INTO practice_settings (firm_name) VALUES ('My Law Firm');

-- Enable RLS
ALTER TABLE practice_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read and update practice settings
CREATE POLICY "Admin can manage practice settings"
  ON practice_settings
  FOR ALL
  USING (current_user_role() = 'admin');

-- Staff and client can read practice settings
CREATE POLICY "Staff and client can read practice settings"
  ON practice_settings
  FOR SELECT
  USING (current_user_role() IN ('staff', 'client'));

-- Add comment
COMMENT ON TABLE practice_settings IS 'Singleton table for firm-wide practice settings and configuration';
