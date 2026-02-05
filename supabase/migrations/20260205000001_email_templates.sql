-- Email Templates System Schema
-- Stores customizable email templates and version history for the WYSIWYG editor

-- ============================================================================
-- Email Templates Table
-- ============================================================================
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_json JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_templates IS 'Customizable email templates for transactional emails';
COMMENT ON COLUMN email_templates.email_type IS 'Unique identifier for the email type (e.g., matter_created, invoice_sent)';
COMMENT ON COLUMN email_templates.name IS 'Human-readable display name for the template';
COMMENT ON COLUMN email_templates.subject IS 'Email subject line with placeholder support (e.g., {{client_name}})';
COMMENT ON COLUMN email_templates.body_html IS 'Rendered HTML content of the email';
COMMENT ON COLUMN email_templates.body_json IS 'TipTap document JSON for the WYSIWYG editor';
COMMENT ON COLUMN email_templates.is_enabled IS 'Whether this template is active and should be used';

-- ============================================================================
-- Email Template Versions Table (History)
-- ============================================================================
CREATE TABLE email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE email_template_versions IS 'Version history for email templates';
COMMENT ON COLUMN email_template_versions.template_id IS 'Reference to the parent email template';
COMMENT ON COLUMN email_template_versions.version IS 'Version number (incremented on each save)';
COMMENT ON COLUMN email_template_versions.subject IS 'Email subject at this version';
COMMENT ON COLUMN email_template_versions.body_html IS 'Rendered HTML at this version';
COMMENT ON COLUMN email_template_versions.body_json IS 'TipTap document JSON at this version';
COMMENT ON COLUMN email_template_versions.created_by IS 'User who created this version';

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_email_template_versions_template_id ON email_template_versions(template_id);
CREATE INDEX idx_email_template_versions_template_version ON email_template_versions(template_id, version DESC);
CREATE INDEX idx_email_templates_email_type ON email_templates(email_type);
CREATE INDEX idx_email_templates_is_enabled ON email_templates(is_enabled) WHERE is_enabled = TRUE;

-- ============================================================================
-- Enable RLS
-- ============================================================================
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies (Admin-only access)
-- ============================================================================

-- Email Templates Policies
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT TO authenticated
  USING (current_user_role() = 'admin');

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admins can delete email templates"
  ON email_templates FOR DELETE TO authenticated
  USING (current_user_role() = 'admin');

-- Email Template Versions Policies
CREATE POLICY "Admins can view email template versions"
  ON email_template_versions FOR SELECT TO authenticated
  USING (current_user_role() = 'admin');

CREATE POLICY "Admins can insert email template versions"
  ON email_template_versions FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admins can update email template versions"
  ON email_template_versions FOR UPDATE TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "Admins can delete email template versions"
  ON email_template_versions FOR DELETE TO authenticated
  USING (current_user_role() = 'admin');

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at on email_templates
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
