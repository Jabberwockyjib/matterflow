-- Firm settings for email branding and other firm-wide configuration
CREATE TABLE firm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(user_id)
);

-- Initial settings with defaults
INSERT INTO firm_settings (key, value) VALUES
  ('firm_name', 'MatterFlow'),
  ('tagline', 'Workflow-first legal practice system'),
  ('logo_url', NULL),
  ('primary_color', '#1e293b'),
  ('reply_to_email', NULL),
  ('footer_text', NULL);

-- RLS: Only admins can read/write
ALTER TABLE firm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read firm settings"
  ON firm_settings FOR SELECT
  TO authenticated
  USING (current_user_role() = 'admin');

CREATE POLICY "Admins can update firm settings"
  ON firm_settings FOR UPDATE
  TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Staff can read settings (needed for email sending)
CREATE POLICY "Staff can read firm settings"
  ON firm_settings FOR SELECT
  TO authenticated
  USING (current_user_role() = 'staff');

-- Trigger to update updated_at
CREATE TRIGGER update_firm_settings_updated_at
  BEFORE UPDATE ON firm_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
