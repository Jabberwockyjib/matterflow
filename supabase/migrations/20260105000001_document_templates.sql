-- Document Template System Schema
-- Stores templates, sections, fields, and client document records

-- ============================================================================
-- Template Fields (shared across templates)
-- ============================================================================
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'multi_line', 'date', 'currency', 'number', 'select', 'multi_select', 'checkbox')),
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  options JSONB,
  source_type TEXT CHECK (source_type IN ('intake', 'profile', 'matter', 'manual')) DEFAULT 'manual',
  intake_question_id TEXT,
  output_type TEXT CHECK (output_type IN ('merge', 'fillable')) DEFAULT 'merge',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Document Templates
-- ============================================================================
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'draft',
  original_file_url TEXT,
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Template Sections
-- ============================================================================
CREATE TABLE template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_conditional BOOLEAN DEFAULT FALSE,
  condition_rules JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Template Field Mappings (which fields used in which templates)
-- ============================================================================
CREATE TABLE template_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES template_fields(id) ON DELETE CASCADE,
  UNIQUE(template_id, field_id)
);

-- ============================================================================
-- Matter Document Packages (optional per matter)
-- ============================================================================
CREATE TABLE matter_document_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  package_type TEXT CHECK (package_type IN ('base', 'custom', 'review')) DEFAULT 'base',
  selected_template_ids UUID[] DEFAULT '{}',
  status TEXT CHECK (status IN ('pending_info', 'ready', 'generating', 'delivered')) DEFAULT 'pending_info',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(matter_id)
);

-- ============================================================================
-- Matter Documents (generated or uploaded)
-- ============================================================================
CREATE TABLE matter_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('template', 'custom')),
  source TEXT CHECK (source IN ('generated', 'uploaded_lawyer', 'uploaded_client')) DEFAULT 'generated',
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  template_version TEXT,
  status TEXT CHECK (status IN ('draft', 'review', 'final', 'delivered', 'needs_update')) DEFAULT 'draft',
  pdf_url TEXT,
  customizations JSONB,
  field_values JSONB,
  notes TEXT,
  generated_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Document History
-- ============================================================================
CREATE TABLE matter_document_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_document_id UUID NOT NULL REFERENCES matter_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('generated', 'edited', 'regenerated', 'delivered', 'status_changed')),
  changed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB,
  previous_pdf_url TEXT
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_document_templates_status ON document_templates(status);
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_sort_order ON template_sections(template_id, sort_order);
CREATE INDEX idx_matter_documents_matter_id ON matter_documents(matter_id);
CREATE INDEX idx_matter_documents_template_id ON matter_documents(template_id);
CREATE INDEX idx_matter_documents_status ON matter_documents(status);
CREATE INDEX idx_matter_document_history_document_id ON matter_document_history(matter_document_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_document_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_document_history ENABLE ROW LEVEL SECURITY;

-- Staff and admins can manage templates
CREATE POLICY "Staff and admins can view templates"
  ON document_templates FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage templates"
  ON document_templates FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view template sections"
  ON template_sections FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage template sections"
  ON template_sections FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view template fields"
  ON template_fields FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage template fields"
  ON template_fields FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view field mappings"
  ON template_field_mappings FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage field mappings"
  ON template_field_mappings FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

-- Matter documents follow matter access rules
CREATE POLICY "Staff and admins can view matter document packages"
  ON matter_document_packages FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage matter document packages"
  ON matter_document_packages FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view matter documents"
  ON matter_documents FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage matter documents"
  ON matter_documents FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view document history"
  ON matter_document_history FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage document history"
  ON matter_document_history FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

-- Triggers for updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_sections_updated_at
  BEFORE UPDATE ON template_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_fields_updated_at
  BEFORE UPDATE ON template_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matter_document_packages_updated_at
  BEFORE UPDATE ON matter_document_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matter_documents_updated_at
  BEFORE UPDATE ON matter_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE document_templates IS 'Master template records for legal documents';
COMMENT ON TABLE template_sections IS 'Sections within templates, with optional conditional logic';
COMMENT ON TABLE template_fields IS 'Field definitions used across templates';
COMMENT ON TABLE matter_documents IS 'Documents generated or uploaded for specific matters';
