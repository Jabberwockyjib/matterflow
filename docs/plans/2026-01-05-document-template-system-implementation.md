# Document Template System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a document template system that allows lawyers to upload Word templates, auto-fill client data, apply conditional logic, and generate PDFs with fillable fields for therapist clients.

**Architecture:** Upload Word docs → AI parses into structured templates → map fields to intake/profile data → generate PDFs with merge fields (locked) and fillable fields (for patients). All integrated with existing matter system.

**Tech Stack:** Next.js, Supabase (Postgres), mammoth.js (DOCX parsing), pdf-lib (PDF generation), Claude API (AI parsing), Supabase Storage (file storage)

---

## Phase 1: Database Schema & Core Types

### Task 1: Create Document Templates Migration

**Files:**
- Create: `supabase/migrations/20260105000001_document_templates.sql`

**Step 1: Write the migration**

```sql
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
```

**Step 2: Apply the migration**

Run: `supabase db push` or `supabase migration up`
Expected: Migration applies successfully

**Step 3: Generate TypeScript types**

Run: `supabase gen types typescript --local > src/types/database.types.ts`
Expected: Types file updated with new tables

**Step 4: Commit**

```bash
git add supabase/migrations/20260105000001_document_templates.sql src/types/database.types.ts
git commit -m "feat(db): add document template system schema"
```

---

### Task 2: Create TypeScript Types for Document Templates

**Files:**
- Create: `src/lib/document-templates/types.ts`

**Step 1: Write the types file**

```typescript
// Document Template System Types

export type FieldType = 'text' | 'multi_line' | 'date' | 'currency' | 'number' | 'select' | 'multi_select' | 'checkbox';
export type SourceType = 'intake' | 'profile' | 'matter' | 'manual';
export type OutputType = 'merge' | 'fillable';
export type TemplateStatus = 'draft' | 'active' | 'archived';
export type DocumentType = 'template' | 'custom';
export type DocumentSource = 'generated' | 'uploaded_lawyer' | 'uploaded_client';
export type DocumentStatus = 'draft' | 'review' | 'final' | 'delivered' | 'needs_update';
export type PackageType = 'base' | 'custom' | 'review';
export type PackageStatus = 'pending_info' | 'ready' | 'generating' | 'delivered';

// Condition rule types
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export interface SimpleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface CompoundCondition {
  all?: SimpleCondition[];
  any?: SimpleCondition[];
}

export type ConditionRules = SimpleCondition | CompoundCondition;

// Core entities
export interface TemplateField {
  id: string;
  name: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  sourceType: SourceType;
  intakeQuestionId: string | null;
  outputType: OutputType;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSection {
  id: string;
  templateId: string;
  name: string;
  content: string;
  sortOrder: number;
  isConditional: boolean;
  conditionRules: ConditionRules | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  version: string;
  status: TemplateStatus;
  originalFileUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  sections?: TemplateSection[];
  fields?: TemplateField[];
}

export interface MatterDocumentPackage {
  id: string;
  matterId: string;
  packageType: PackageType;
  selectedTemplateIds: string[];
  status: PackageStatus;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatterDocument {
  id: string;
  matterId: string;
  name: string;
  documentType: DocumentType;
  source: DocumentSource;
  templateId: string | null;
  templateVersion: string | null;
  status: DocumentStatus;
  pdfUrl: string | null;
  customizations: Record<string, unknown> | null;
  fieldValues: Record<string, unknown> | null;
  notes: string | null;
  generatedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatterDocumentHistory {
  id: string;
  matterDocumentId: string;
  action: 'generated' | 'edited' | 'regenerated' | 'delivered' | 'status_changed';
  changedBy: string | null;
  changedAt: string;
  details: Record<string, unknown> | null;
  previousPdfUrl: string | null;
}

// AI Parsing types
export interface ParsedPlaceholder {
  original: string;
  suggestedFieldName: string;
  suggestedLabel: string;
  suggestedType: FieldType;
  suggestedOutputType: OutputType;
  context: string; // surrounding text for context
}

export interface ParsedSection {
  name: string;
  content: string;
  suggestedConditional: boolean;
  suggestedConditionField?: string;
  placeholders: ParsedPlaceholder[];
}

export interface ParsedTemplate {
  suggestedName: string;
  suggestedCategory: string;
  sections: ParsedSection[];
  allPlaceholders: ParsedPlaceholder[];
}

// Gap detection types
export interface FieldGap {
  field: TemplateField;
  templateNames: string[];
  currentValue: unknown | null;
  source: SourceType;
}

export interface GapCheckResult {
  ready: TemplateField[];
  missing: FieldGap[];
  templateReadiness: Record<string, { ready: boolean; missingFields: string[] }>;
}
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/types.ts
git commit -m "feat(types): add document template system types"
```

---

### Task 3: Create Template Queries

**Files:**
- Create: `src/lib/document-templates/queries.ts`

**Step 1: Write the queries file**

```typescript
import { supabaseAdmin, supabaseEnvReady } from '@/lib/supabase/server';
import type {
  DocumentTemplate,
  TemplateSection,
  TemplateField,
  MatterDocument,
  MatterDocumentPackage
} from './types';

// ============================================================================
// Template Queries
// ============================================================================

export async function getDocumentTemplates(status?: 'draft' | 'active' | 'archived'): Promise<DocumentTemplate[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  let query = supabase
    .from('document_templates')
    .select('*')
    .order('name');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return (data || []).map(mapTemplateFromDb);
}

export async function getDocumentTemplate(id: string): Promise<DocumentTemplate | null> {
  if (!supabaseEnvReady()) return null;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('document_templates')
    .select(`
      *,
      template_sections(*),
      template_field_mappings(
        template_fields(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching template:', error);
    return null;
  }

  return {
    ...mapTemplateFromDb(data),
    sections: (data.template_sections || [])
      .map(mapSectionFromDb)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    fields: (data.template_field_mappings || [])
      .map((m: { template_fields: unknown }) => mapFieldFromDb(m.template_fields))
      .filter(Boolean),
  };
}

export async function getTemplateSections(templateId: string): Promise<TemplateSection[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('template_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order');

  if (error) {
    console.error('Error fetching sections:', error);
    return [];
  }

  return (data || []).map(mapSectionFromDb);
}

// ============================================================================
// Field Queries
// ============================================================================

export async function getTemplateFields(): Promise<TemplateField[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('template_fields')
    .select('*')
    .order('label');

  if (error) {
    console.error('Error fetching fields:', error);
    return [];
  }

  return (data || []).map(mapFieldFromDb);
}

export async function getFieldsForTemplate(templateId: string): Promise<TemplateField[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('template_field_mappings')
    .select('template_fields(*)')
    .eq('template_id', templateId);

  if (error) {
    console.error('Error fetching template fields:', error);
    return [];
  }

  return (data || [])
    .map((m: { template_fields: unknown }) => mapFieldFromDb(m.template_fields))
    .filter(Boolean);
}

// ============================================================================
// Matter Document Queries
// ============================================================================

export async function getMatterDocumentPackage(matterId: string): Promise<MatterDocumentPackage | null> {
  if (!supabaseEnvReady()) return null;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('matter_document_packages')
    .select('*')
    .eq('matter_id', matterId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching document package:', error);
    }
    return null;
  }

  return mapPackageFromDb(data);
}

export async function getMatterDocuments(matterId: string): Promise<MatterDocument[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('matter_documents')
    .select('*')
    .eq('matter_id', matterId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching matter documents:', error);
    return [];
  }

  return (data || []).map(mapDocumentFromDb);
}

export async function getDocumentsNeedingUpdate(templateId: string, currentVersion: string): Promise<MatterDocument[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('matter_documents')
    .select('*')
    .eq('template_id', templateId)
    .neq('template_version', currentVersion)
    .in('status', ['final', 'delivered']);

  if (error) {
    console.error('Error fetching documents needing update:', error);
    return [];
  }

  return (data || []).map(mapDocumentFromDb);
}

// ============================================================================
// Mappers (DB snake_case → TypeScript camelCase)
// ============================================================================

function mapTemplateFromDb(row: Record<string, unknown>): DocumentTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    category: row.category as string | null,
    version: row.version as string,
    status: row.status as DocumentTemplate['status'],
    originalFileUrl: row.original_file_url as string | null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSectionFromDb(row: Record<string, unknown>): TemplateSection {
  return {
    id: row.id as string,
    templateId: row.template_id as string,
    name: row.name as string,
    content: row.content as string,
    sortOrder: row.sort_order as number,
    isConditional: row.is_conditional as boolean,
    conditionRules: row.condition_rules as TemplateSection['conditionRules'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapFieldFromDb(row: unknown): TemplateField | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    label: r.label as string,
    fieldType: r.field_type as TemplateField['fieldType'],
    isRequired: r.is_required as boolean,
    defaultValue: r.default_value as string | null,
    options: r.options as string[] | null,
    sourceType: r.source_type as TemplateField['sourceType'],
    intakeQuestionId: r.intake_question_id as string | null,
    outputType: r.output_type as TemplateField['outputType'],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapPackageFromDb(row: Record<string, unknown>): MatterDocumentPackage {
  return {
    id: row.id as string,
    matterId: row.matter_id as string,
    packageType: row.package_type as MatterDocumentPackage['packageType'],
    selectedTemplateIds: row.selected_template_ids as string[],
    status: row.status as MatterDocumentPackage['status'],
    deliveredAt: row.delivered_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDocumentFromDb(row: Record<string, unknown>): MatterDocument {
  return {
    id: row.id as string,
    matterId: row.matter_id as string,
    name: row.name as string,
    documentType: row.document_type as MatterDocument['documentType'],
    source: row.source as MatterDocument['source'],
    templateId: row.template_id as string | null,
    templateVersion: row.template_version as string | null,
    status: row.status as MatterDocument['status'],
    pdfUrl: row.pdf_url as string | null,
    customizations: row.customizations as Record<string, unknown> | null,
    fieldValues: row.field_values as Record<string, unknown> | null,
    notes: row.notes as string | null,
    generatedAt: row.generated_at as string | null,
    deliveredAt: row.delivered_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/queries.ts
git commit -m "feat(queries): add document template queries"
```

---

### Task 4: Create Template Actions (Server Actions)

**Files:**
- Create: `src/lib/document-templates/actions.ts`

**Step 1: Write the actions file**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import type {
  DocumentTemplate,
  TemplateSection,
  TemplateField,
  ConditionRules,
  PackageType
} from "./types";

type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

const ensureStaffOrAdmin = async () => {
  const { profile, session } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" } as const;
  }
  if (profile?.role === "client") {
    return { error: "Forbidden: clients cannot perform this action" } as const;
  }
  return { session, profile } as const;
};

// ============================================================================
// Template Actions
// ============================================================================

export async function createDocumentTemplate(data: {
  name: string;
  description?: string;
  category?: string;
  originalFileUrl?: string;
}): Promise<ActionResult<DocumentTemplate>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: template, error } = await supabase
    .from("document_templates")
    .insert({
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      original_file_url: data.originalFileUrl || null,
      created_by: auth.session.user.id,
      status: "draft",
      version: "1.0",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating template:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return {
    success: true,
    data: {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      version: template.version,
      status: template.status,
      originalFileUrl: template.original_file_url,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    }
  };
}

export async function updateDocumentTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    status?: "draft" | "active" | "archived";
  }
): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("document_templates")
    .update({
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating template:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);
  return { success: true };
}

export async function incrementTemplateVersion(id: string): Promise<ActionResult<string>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();

  // Get current version
  const { data: current, error: fetchError } = await supabase
    .from("document_templates")
    .select("version")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { success: false, error: "Template not found" };
  }

  // Increment version
  const parts = current.version.split(".");
  const major = parseInt(parts[0]) || 1;
  const minor = (parseInt(parts[1]) || 0) + 1;
  const newVersion = `${major}.${minor}`;

  const { error } = await supabase
    .from("document_templates")
    .update({ version: newVersion })
    .eq("id", id);

  if (error) {
    console.error("Error incrementing version:", error);
    return { success: false, error: error.message };
  }

  // Mark existing documents as needing update
  await supabase
    .from("matter_documents")
    .update({ status: "needs_update" })
    .eq("template_id", id)
    .in("status", ["final", "delivered"]);

  revalidatePath("/admin/templates");
  return { success: true, data: newVersion };
}

// ============================================================================
// Section Actions
// ============================================================================

export async function createTemplateSection(data: {
  templateId: string;
  name: string;
  content: string;
  sortOrder: number;
  isConditional?: boolean;
  conditionRules?: ConditionRules;
}): Promise<ActionResult<TemplateSection>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: section, error } = await supabase
    .from("template_sections")
    .insert({
      template_id: data.templateId,
      name: data.name,
      content: data.content,
      sort_order: data.sortOrder,
      is_conditional: data.isConditional || false,
      condition_rules: data.conditionRules || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating section:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/templates/${data.templateId}`);
  return {
    success: true,
    data: {
      id: section.id,
      templateId: section.template_id,
      name: section.name,
      content: section.content,
      sortOrder: section.sort_order,
      isConditional: section.is_conditional,
      conditionRules: section.condition_rules,
      createdAt: section.created_at,
      updatedAt: section.updated_at,
    }
  };
}

export async function updateTemplateSection(
  id: string,
  data: {
    name?: string;
    content?: string;
    sortOrder?: number;
    isConditional?: boolean;
    conditionRules?: ConditionRules | null;
  }
): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("template_sections")
    .update({
      name: data.name,
      content: data.content,
      sort_order: data.sortOrder,
      is_conditional: data.isConditional,
      condition_rules: data.conditionRules,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating section:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

export async function deleteTemplateSection(id: string): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("template_sections")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting section:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

// ============================================================================
// Field Actions
// ============================================================================

export async function createTemplateField(data: {
  name: string;
  label: string;
  fieldType: TemplateField["fieldType"];
  isRequired?: boolean;
  defaultValue?: string;
  options?: string[];
  sourceType?: TemplateField["sourceType"];
  intakeQuestionId?: string;
  outputType?: TemplateField["outputType"];
}): Promise<ActionResult<TemplateField>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: field, error } = await supabase
    .from("template_fields")
    .insert({
      name: data.name,
      label: data.label,
      field_type: data.fieldType,
      is_required: data.isRequired || false,
      default_value: data.defaultValue || null,
      options: data.options || null,
      source_type: data.sourceType || "manual",
      intake_question_id: data.intakeQuestionId || null,
      output_type: data.outputType || "merge",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating field:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return {
    success: true,
    data: {
      id: field.id,
      name: field.name,
      label: field.label,
      fieldType: field.field_type,
      isRequired: field.is_required,
      defaultValue: field.default_value,
      options: field.options,
      sourceType: field.source_type,
      intakeQuestionId: field.intake_question_id,
      outputType: field.output_type,
      createdAt: field.created_at,
      updatedAt: field.updated_at,
    }
  };
}

export async function mapFieldToTemplate(templateId: string, fieldId: string): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("template_field_mappings")
    .insert({
      template_id: templateId,
      field_id: fieldId,
    });

  if (error) {
    if (error.code === "23505") { // Unique constraint
      return { success: true }; // Already mapped
    }
    console.error("Error mapping field:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/templates/${templateId}`);
  return { success: true };
}

// ============================================================================
// Matter Document Package Actions
// ============================================================================

export async function createOrUpdateDocumentPackage(
  matterId: string,
  data: {
    packageType?: PackageType;
    selectedTemplateIds?: string[];
  }
): Promise<ActionResult<{ id: string }>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: pkg, error } = await supabase
    .from("matter_document_packages")
    .upsert({
      matter_id: matterId,
      package_type: data.packageType || "base",
      selected_template_ids: data.selectedTemplateIds || [],
      status: "pending_info",
    }, {
      onConflict: "matter_id",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating/updating document package:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/matters/${matterId}`);
  return { success: true, data: { id: pkg.id } };
}

// ============================================================================
// Matter Document Actions
// ============================================================================

export async function createMatterDocument(data: {
  matterId: string;
  name: string;
  documentType: "template" | "custom";
  source?: "generated" | "uploaded_lawyer" | "uploaded_client";
  templateId?: string;
  templateVersion?: string;
  pdfUrl?: string;
  fieldValues?: Record<string, unknown>;
}): Promise<ActionResult<{ id: string }>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: doc, error } = await supabase
    .from("matter_documents")
    .insert({
      matter_id: data.matterId,
      name: data.name,
      document_type: data.documentType,
      source: data.source || "generated",
      template_id: data.templateId || null,
      template_version: data.templateVersion || null,
      pdf_url: data.pdfUrl || null,
      field_values: data.fieldValues || null,
      status: "draft",
      generated_at: data.documentType === "template" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating matter document:", error);
    return { success: false, error: error.message };
  }

  // Log history
  await supabase.from("matter_document_history").insert({
    matter_document_id: doc.id,
    action: "generated",
    changed_by: auth.session.user.id,
    details: { source: data.source, templateVersion: data.templateVersion },
  });

  revalidatePath(`/matters/${data.matterId}`);
  return { success: true, data: { id: doc.id } };
}

export async function updateMatterDocumentStatus(
  id: string,
  status: "draft" | "review" | "final" | "delivered" | "needs_update"
): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();

  const updateData: Record<string, unknown> = { status };
  if (status === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  }

  const { data: doc, error } = await supabase
    .from("matter_documents")
    .update(updateData)
    .eq("id", id)
    .select("matter_id")
    .single();

  if (error) {
    console.error("Error updating document status:", error);
    return { success: false, error: error.message };
  }

  // Log history
  await supabase.from("matter_document_history").insert({
    matter_document_id: id,
    action: "status_changed",
    changed_by: auth.session.user.id,
    details: { newStatus: status },
  });

  revalidatePath(`/matters/${doc.matter_id}`);
  return { success: true };
}
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/actions.ts
git commit -m "feat(actions): add document template server actions"
```

---

### Task 5: Create Index File

**Files:**
- Create: `src/lib/document-templates/index.ts`

**Step 1: Write the index file**

```typescript
// Document Template System
// Re-export all public APIs

export * from './types';
export * from './queries';
export * from './actions';
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/index.ts
git commit -m "feat(document-templates): add module index"
```

---

## Phase 2: DOCX Parsing & AI Integration

### Task 6: Install Dependencies

**Step 1: Install mammoth.js for DOCX parsing**

Run: `pnpm add mammoth`
Expected: Package added to dependencies

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add mammoth.js for DOCX parsing"
```

---

### Task 7: Create DOCX Parser

**Files:**
- Create: `src/lib/document-templates/parser.ts`

**Step 1: Write the parser**

```typescript
import mammoth from 'mammoth';
import type { ParsedTemplate, ParsedSection, ParsedPlaceholder, FieldType, OutputType } from './types';

// Regex patterns for placeholder detection
const BRACKET_PLACEHOLDER = /\[([A-Z][A-Z0-9_\s]+)\]/g;
const MUSTACHE_PLACEHOLDER = /\{\{([a-z][a-z0-9_]*(?::[a-z]+)?)\}\}/g;

interface ExtractedPlaceholder {
  original: string;
  name: string;
  outputType?: string;
}

/**
 * Parse a DOCX file buffer into structured content
 */
export async function parseDocxBuffer(buffer: Buffer): Promise<{
  html: string;
  text: string;
  messages: string[];
}> {
  const result = await mammoth.convertToHtml({ buffer });
  const textResult = await mammoth.extractRawText({ buffer });

  return {
    html: result.value,
    text: textResult.value,
    messages: result.messages.map(m => m.message),
  };
}

/**
 * Extract placeholders from text content
 */
export function extractPlaceholders(text: string): ExtractedPlaceholder[] {
  const placeholders: ExtractedPlaceholder[] = [];
  const seen = new Set<string>();

  // Find bracket placeholders like [PRACTICE NAME]
  let match;
  while ((match = BRACKET_PLACEHOLDER.exec(text)) !== null) {
    const original = match[0];
    if (!seen.has(original)) {
      seen.add(original);
      placeholders.push({
        original,
        name: match[1].toLowerCase().replace(/\s+/g, '_'),
      });
    }
  }

  // Find mustache placeholders like {{practice_name}} or {{patient_name:fillable}}
  while ((match = MUSTACHE_PLACEHOLDER.exec(text)) !== null) {
    const original = match[0];
    if (!seen.has(original)) {
      seen.add(original);
      const parts = match[1].split(':');
      placeholders.push({
        original,
        name: parts[0],
        outputType: parts[1],
      });
    }
  }

  return placeholders;
}

/**
 * Guess field type based on name and context
 */
export function guessFieldType(name: string, context: string): FieldType {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('date') || nameLower.includes('_at')) {
    return 'date';
  }
  if (nameLower.includes('rate') || nameLower.includes('fee') || nameLower.includes('price') || nameLower.includes('amount')) {
    return 'currency';
  }
  if (nameLower.includes('phone') || nameLower.includes('zip') || nameLower.includes('number')) {
    return 'text';
  }
  if (nameLower.includes('address') || nameLower.includes('description') || nameLower.includes('notes')) {
    return 'multi_line';
  }
  if (nameLower.includes('agree') || nameLower.includes('consent') || nameLower.includes('acknowledge')) {
    return 'checkbox';
  }

  return 'text';
}

/**
 * Guess output type based on name
 */
export function guessOutputType(name: string, explicitType?: string): OutputType {
  if (explicitType === 'fillable' || explicitType === 'merge') {
    return explicitType;
  }

  const nameLower = name.toLowerCase();

  // Patient-facing fields should be fillable
  if (
    nameLower.includes('patient') ||
    nameLower.includes('signature') ||
    nameLower.includes('sign_date') ||
    nameLower.includes('client_signature')
  ) {
    return 'fillable';
  }

  return 'merge';
}

/**
 * Generate a human-readable label from field name
 */
export function generateLabel(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Split HTML content into sections based on headings
 */
export function splitIntoSections(html: string): { name: string; content: string }[] {
  const sections: { name: string; content: string }[] = [];

  // Split by h1, h2, h3 headings
  const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  const parts = html.split(headingRegex);

  if (parts.length === 1) {
    // No headings found, treat as single section
    return [{ name: 'Main Content', content: html }];
  }

  let currentSection = { name: 'Introduction', content: '' };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Check if this is a heading level number
    if (/^[1-3]$/.test(part)) {
      // Next part is the heading text
      if (currentSection.content) {
        sections.push(currentSection);
      }
      currentSection = { name: parts[i + 1] || 'Section', content: '' };
      i++; // Skip heading text
    } else {
      currentSection.content += part;
    }
  }

  if (currentSection.content) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Suggest if a section might be conditional based on its name
 */
export function suggestConditional(sectionName: string): { conditional: boolean; fieldSuggestion?: string } {
  const nameLower = sectionName.toLowerCase();

  const conditionalKeywords: Record<string, string> = {
    'telehealth': 'offers_telehealth',
    'tele-health': 'offers_telehealth',
    'virtual': 'offers_telehealth',
    'online': 'offers_telehealth',
    'insurance': 'accepts_insurance',
    'sliding scale': 'offers_sliding_scale',
    'couples': 'practice_type_couples',
    'group': 'practice_type_group',
    'minor': 'treats_minors',
    'child': 'treats_minors',
  };

  for (const [keyword, field] of Object.entries(conditionalKeywords)) {
    if (nameLower.includes(keyword)) {
      return { conditional: true, fieldSuggestion: field };
    }
  }

  return { conditional: false };
}

/**
 * Full parsing pipeline: DOCX buffer → ParsedTemplate
 */
export async function parseDocxToTemplate(
  buffer: Buffer,
  suggestedName?: string
): Promise<ParsedTemplate> {
  const { html, text } = await parseDocxBuffer(buffer);

  // Extract all placeholders from full text
  const allPlaceholders = extractPlaceholders(text);

  // Split into sections
  const rawSections = splitIntoSections(html);

  // Process each section
  const sections: ParsedSection[] = rawSections.map((section, index) => {
    const sectionPlaceholders = extractPlaceholders(section.content);
    const conditional = suggestConditional(section.name);

    return {
      name: section.name,
      content: section.content,
      suggestedConditional: conditional.conditional,
      suggestedConditionField: conditional.fieldSuggestion,
      placeholders: sectionPlaceholders.map(p => ({
        original: p.original,
        suggestedFieldName: p.name,
        suggestedLabel: generateLabel(p.name),
        suggestedType: guessFieldType(p.name, section.content),
        suggestedOutputType: guessOutputType(p.name, p.outputType),
        context: extractContext(section.content, p.original),
      })),
    };
  });

  // Guess category from content
  const textLower = text.toLowerCase();
  let category = 'general';
  if (textLower.includes('consent') || textLower.includes('informed consent')) {
    category = 'consent';
  } else if (textLower.includes('privacy') || textLower.includes('hipaa')) {
    category = 'privacy';
  } else if (textLower.includes('fee') || textLower.includes('payment') || textLower.includes('billing')) {
    category = 'billing';
  }

  return {
    suggestedName: suggestedName || guessTemplateName(text),
    suggestedCategory: category,
    sections,
    allPlaceholders: allPlaceholders.map(p => ({
      original: p.original,
      suggestedFieldName: p.name,
      suggestedLabel: generateLabel(p.name),
      suggestedType: guessFieldType(p.name, text),
      suggestedOutputType: guessOutputType(p.name, p.outputType),
      context: extractContext(text, p.original),
    })),
  };
}

/**
 * Extract surrounding context for a placeholder
 */
function extractContext(text: string, placeholder: string): string {
  const index = text.indexOf(placeholder);
  if (index === -1) return '';

  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + placeholder.length + 50);

  return '...' + text.slice(start, end).replace(/\s+/g, ' ') + '...';
}

/**
 * Guess template name from content
 */
function guessTemplateName(text: string): string {
  const firstLine = text.split('\n')[0]?.trim() || '';
  if (firstLine.length > 5 && firstLine.length < 100) {
    return firstLine;
  }

  if (text.toLowerCase().includes('informed consent')) {
    return 'Informed Consent';
  }
  if (text.toLowerCase().includes('privacy policy')) {
    return 'Privacy Policy';
  }
  if (text.toLowerCase().includes('fee structure') || text.toLowerCase().includes('fee schedule')) {
    return 'Fee Structure';
  }

  return 'Untitled Template';
}
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/parser.ts
git commit -m "feat(parser): add DOCX parsing with placeholder detection"
```

---

### Task 8: Create AI Enhancement Service

**Files:**
- Create: `src/lib/document-templates/ai-parser.ts`

**Step 1: Write the AI parser**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { ParsedTemplate, ParsedSection, ParsedPlaceholder } from './types';

const anthropic = new Anthropic();

interface AIEnhancedSection extends ParsedSection {
  aiSuggestedConditional: boolean;
  aiSuggestedConditionField?: string;
  aiSuggestedConditionReason?: string;
}

interface AIEnhancedTemplate extends ParsedTemplate {
  sections: AIEnhancedSection[];
  aiSuggestions: string[];
}

/**
 * Enhance a parsed template with AI suggestions for:
 * - Additional placeholder detection
 * - Conditional section recommendations
 * - Field type refinements
 */
export async function enhanceTemplateWithAI(
  parsedTemplate: ParsedTemplate,
  originalText: string
): Promise<AIEnhancedTemplate> {
  const prompt = buildEnhancementPrompt(parsedTemplate, originalText);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return { ...parsedTemplate, aiSuggestions: [] };
    }

    return parseAIResponse(parsedTemplate, content.text);
  } catch (error) {
    console.error('AI enhancement failed:', error);
    return { ...parsedTemplate, aiSuggestions: [] };
  }
}

function buildEnhancementPrompt(template: ParsedTemplate, text: string): string {
  return `You are analyzing a legal document template for a therapy practice management system. The document will be used to generate customized legal documents for therapist clients.

## Document Text (first 3000 chars):
${text.slice(0, 3000)}

## Already Detected Placeholders:
${template.allPlaceholders.map(p => `- ${p.original} → field: ${p.suggestedFieldName}, type: ${p.suggestedType}`).join('\n')}

## Already Detected Sections:
${template.sections.map(s => `- "${s.name}" (conditional: ${s.suggestedConditional})`).join('\n')}

## Your Task:
Analyze this document and provide suggestions in JSON format:

{
  "additionalPlaceholders": [
    {
      "textToReplace": "exact text that should be a placeholder",
      "suggestedFieldName": "snake_case_name",
      "suggestedLabel": "Human Readable Label",
      "suggestedType": "text|date|currency|checkbox|multi_line",
      "suggestedOutputType": "merge|fillable",
      "reason": "why this should be a placeholder"
    }
  ],
  "conditionalSections": [
    {
      "sectionName": "name of section",
      "shouldBeConditional": true,
      "conditionField": "field_name_to_check",
      "conditionReason": "why this section should be conditional"
    }
  ],
  "generalSuggestions": [
    "Any other suggestions for improving the template structure"
  ]
}

Focus on:
1. Text that varies per practice (practice name, address, rates, policies)
2. Patient-facing fields (signature, date, acknowledgments) should be "fillable"
3. Sections about specific services (telehealth, insurance, couples therapy) should be conditional
4. Look for implicit placeholders like "Your Therapist" or "the Practice"

Return ONLY valid JSON, no markdown or explanation.`;
}

function parseAIResponse(template: ParsedTemplate, responseText: string): AIEnhancedTemplate {
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ...template, aiSuggestions: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Merge AI suggestions with existing parsed template
    const additionalPlaceholders: ParsedPlaceholder[] = (parsed.additionalPlaceholders || []).map(
      (p: Record<string, string>) => ({
        original: p.textToReplace,
        suggestedFieldName: p.suggestedFieldName,
        suggestedLabel: p.suggestedLabel,
        suggestedType: p.suggestedType || 'text',
        suggestedOutputType: p.suggestedOutputType || 'merge',
        context: p.reason || '',
      })
    );

    // Enhance sections with AI conditional suggestions
    const enhancedSections: AIEnhancedSection[] = template.sections.map(section => {
      const aiSuggestion = (parsed.conditionalSections || []).find(
        (c: Record<string, unknown>) => c.sectionName === section.name
      );

      return {
        ...section,
        aiSuggestedConditional: aiSuggestion?.shouldBeConditional || section.suggestedConditional,
        aiSuggestedConditionField: aiSuggestion?.conditionField || section.suggestedConditionField,
        aiSuggestedConditionReason: aiSuggestion?.conditionReason,
      };
    });

    return {
      ...template,
      sections: enhancedSections,
      allPlaceholders: [...template.allPlaceholders, ...additionalPlaceholders],
      aiSuggestions: parsed.generalSuggestions || [],
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return { ...template, aiSuggestions: [] };
  }
}

/**
 * Detect potential placeholders in text that weren't caught by regex
 */
export async function detectImplicitPlaceholders(text: string): Promise<ParsedPlaceholder[]> {
  const prompt = `Analyze this legal document text and identify phrases that should be replaced with placeholders (variable fields). Look for:
- Practice/business names
- Addresses
- Phone numbers
- Dollar amounts/rates
- Specific policy details that vary per practice
- Any text that would need to be customized per client

Text:
${text.slice(0, 4000)}

Return a JSON array of objects with:
- "textToReplace": the exact text to replace
- "suggestedFieldName": snake_case field name
- "suggestedLabel": human readable label
- "suggestedType": text|date|currency|number|multi_line

Return ONLY the JSON array, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((p: Record<string, string>) => ({
      original: p.textToReplace,
      suggestedFieldName: p.suggestedFieldName,
      suggestedLabel: p.suggestedLabel,
      suggestedType: p.suggestedType || 'text',
      suggestedOutputType: 'merge' as const,
      context: '',
    }));
  } catch (error) {
    console.error('Implicit placeholder detection failed:', error);
    return [];
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/ai-parser.ts
git commit -m "feat(ai-parser): add AI-enhanced template parsing"
```

---

## Phase 3: Gap Detection & Field Mapping

### Task 9: Create Gap Detection Service

**Files:**
- Create: `src/lib/document-templates/gap-detection.ts`

**Step 1: Write the gap detection service**

```typescript
import type {
  TemplateField,
  GapCheckResult,
  FieldGap,
  DocumentTemplate
} from './types';
import { getFieldsForTemplate, getDocumentTemplate } from './queries';
import { supabaseAdmin, supabaseEnvReady } from '@/lib/supabase/server';

interface ClientData {
  profile: Record<string, unknown>;
  intakeResponses: Record<string, unknown>;
  matterDetails: Record<string, unknown>;
}

/**
 * Check what fields are missing to generate documents for a matter
 */
export async function checkFieldGaps(
  matterId: string,
  templateIds: string[]
): Promise<GapCheckResult> {
  if (!supabaseEnvReady()) {
    return { ready: [], missing: [], templateReadiness: {} };
  }

  // Get client data sources
  const clientData = await getClientData(matterId);

  // Get all fields for selected templates
  const templateFields = await getFieldsForTemplates(templateIds);

  // Check each field
  const ready: TemplateField[] = [];
  const missing: FieldGap[] = [];
  const templateReadiness: Record<string, { ready: boolean; missingFields: string[] }> = {};

  for (const [templateId, fields] of Object.entries(templateFields)) {
    const template = await getDocumentTemplate(templateId);
    const templateMissing: string[] = [];

    for (const field of fields) {
      const value = getFieldValue(field, clientData);

      if (value !== null && value !== undefined && value !== '') {
        if (!ready.find(f => f.id === field.id)) {
          ready.push(field);
        }
      } else if (field.isRequired) {
        templateMissing.push(field.name);
        if (!missing.find(m => m.field.id === field.id)) {
          missing.push({
            field,
            templateNames: [template?.name || templateId],
            currentValue: null,
            source: field.sourceType,
          });
        } else {
          const existing = missing.find(m => m.field.id === field.id);
          if (existing && template?.name) {
            existing.templateNames.push(template.name);
          }
        }
      }
    }

    templateReadiness[templateId] = {
      ready: templateMissing.length === 0,
      missingFields: templateMissing,
    };
  }

  return { ready, missing, templateReadiness };
}

/**
 * Get all data sources for a matter's client
 */
async function getClientData(matterId: string): Promise<ClientData> {
  const supabase = supabaseAdmin();

  // Get matter with client
  const { data: matter } = await supabase
    .from('matters')
    .select(`
      *,
      client:profiles!matters_client_id_fkey(*)
    `)
    .eq('id', matterId)
    .single();

  // Get intake responses
  const { data: intakeResponses } = await supabase
    .from('intake_responses')
    .select('responses')
    .eq('matter_id', matterId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    profile: (matter?.client as Record<string, unknown>) || {},
    intakeResponses: (intakeResponses?.responses as Record<string, unknown>) || {},
    matterDetails: matter || {},
  };
}

/**
 * Get fields for multiple templates
 */
async function getFieldsForTemplates(
  templateIds: string[]
): Promise<Record<string, TemplateField[]>> {
  const result: Record<string, TemplateField[]> = {};

  for (const templateId of templateIds) {
    result[templateId] = await getFieldsForTemplate(templateId);
  }

  return result;
}

/**
 * Get the value of a field from available data sources
 */
function getFieldValue(field: TemplateField, data: ClientData): unknown {
  switch (field.sourceType) {
    case 'profile':
      return getNestedValue(data.profile, field.name);

    case 'intake':
      // Try direct match first
      if (field.intakeQuestionId && data.intakeResponses[field.intakeQuestionId]) {
        return data.intakeResponses[field.intakeQuestionId];
      }
      // Try field name match
      return getNestedValue(data.intakeResponses, field.name);

    case 'matter':
      return getNestedValue(data.matterDetails, field.name);

    case 'manual':
    default:
      return null;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return null;
    if (typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Collect all field values for document generation
 */
export async function collectFieldValues(
  matterId: string,
  templateIds: string[],
  manualOverrides?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const clientData = await getClientData(matterId);
  const templateFields = await getFieldsForTemplates(templateIds);

  const values: Record<string, unknown> = {};

  // Collect from all templates
  for (const fields of Object.values(templateFields)) {
    for (const field of fields) {
      if (manualOverrides && field.name in manualOverrides) {
        values[field.name] = manualOverrides[field.name];
      } else {
        const value = getFieldValue(field, clientData);
        if (value !== null && value !== undefined) {
          values[field.name] = value;
        } else if (field.defaultValue) {
          values[field.name] = field.defaultValue;
        }
      }
    }
  }

  return values;
}
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/gap-detection.ts
git commit -m "feat(gap-detection): add field gap detection service"
```

---

## Phase 4: PDF Generation

### Task 10: Install PDF Dependencies

**Step 1: Install pdf-lib**

Run: `pnpm add pdf-lib`
Expected: Package added

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add pdf-lib for PDF generation"
```

---

### Task 11: Create PDF Generator

**Files:**
- Create: `src/lib/document-templates/pdf-generator.ts`

**Step 1: Write the PDF generator**

```typescript
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type {
  DocumentTemplate,
  TemplateSection,
  TemplateField,
  ConditionRules,
  SimpleCondition,
  CompoundCondition
} from './types';

interface GenerationOptions {
  fieldValues: Record<string, unknown>;
  sectionOverrides?: {
    skip?: string[];      // Section IDs to skip
    forceInclude?: string[]; // Section IDs to force include
    customContent?: Record<string, string>; // Section ID → custom content
  };
}

interface GeneratedPDF {
  buffer: Buffer;
  metadata: {
    pageCount: number;
    fieldsUsed: string[];
    sectionsIncluded: string[];
    fillableFields: string[];
  };
}

const MARGIN = 50;
const LINE_HEIGHT = 14;
const FONT_SIZE = 11;
const HEADING_SIZE = 14;

/**
 * Generate a PDF from a template with field values
 */
export async function generatePDF(
  template: DocumentTemplate,
  options: GenerationOptions
): Promise<GeneratedPDF> {
  const { fieldValues, sectionOverrides } = options;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage();
  let y = page.getHeight() - MARGIN;

  const fieldsUsed: string[] = [];
  const sectionsIncluded: string[] = [];
  const fillableFields: string[] = [];

  // Filter and order sections
  const sections = (template.sections || [])
    .filter(section => shouldIncludeSection(section, fieldValues, sectionOverrides))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const section of sections) {
    sectionsIncluded.push(section.id);

    // Get content (custom override or original)
    let content = sectionOverrides?.customContent?.[section.id] || section.content;

    // Replace placeholders
    const { text, usedFields, fillable } = replacePlaceholders(content, fieldValues, template.fields || []);
    fieldsUsed.push(...usedFields);
    fillableFields.push(...fillable);

    // Draw section heading
    ({ page, y } = drawText(pdfDoc, page, section.name, {
      x: MARGIN,
      y,
      font: boldFont,
      size: HEADING_SIZE,
      maxWidth: page.getWidth() - MARGIN * 2,
    }));
    y -= LINE_HEIGHT;

    // Draw section content
    const lines = wrapText(stripHtml(text), font, FONT_SIZE, page.getWidth() - MARGIN * 2);
    for (const line of lines) {
      if (y < MARGIN + LINE_HEIGHT) {
        page = pdfDoc.addPage();
        y = page.getHeight() - MARGIN;
      }

      page.drawText(line, {
        x: MARGIN,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
    }

    y -= LINE_HEIGHT; // Extra space between sections
  }

  // Add fillable form fields
  const form = pdfDoc.getForm();
  for (const fieldName of fillableFields) {
    // Create a text field at the bottom of the last page
    // In practice, you'd position these based on where {{field:fillable}} appears
    const textField = form.createTextField(fieldName);
    textField.setText('');
    textField.addToPage(page, {
      x: MARGIN,
      y: MARGIN,
      width: 200,
      height: 20,
    });
  }

  const pdfBytes = await pdfDoc.save();

  return {
    buffer: Buffer.from(pdfBytes),
    metadata: {
      pageCount: pdfDoc.getPageCount(),
      fieldsUsed: [...new Set(fieldsUsed)],
      sectionsIncluded,
      fillableFields: [...new Set(fillableFields)],
    },
  };
}

/**
 * Determine if a section should be included based on conditions
 */
function shouldIncludeSection(
  section: TemplateSection,
  fieldValues: Record<string, unknown>,
  overrides?: GenerationOptions['sectionOverrides']
): boolean {
  // Check overrides first
  if (overrides?.skip?.includes(section.id)) {
    return false;
  }
  if (overrides?.forceInclude?.includes(section.id)) {
    return true;
  }

  // If not conditional, include it
  if (!section.isConditional || !section.conditionRules) {
    return true;
  }

  // Evaluate condition
  return evaluateCondition(section.conditionRules, fieldValues);
}

/**
 * Evaluate a condition rule against field values
 */
function evaluateCondition(
  rules: ConditionRules,
  fieldValues: Record<string, unknown>
): boolean {
  // Compound condition with "all"
  if ('all' in rules && Array.isArray((rules as CompoundCondition).all)) {
    return (rules as CompoundCondition).all!.every(c => evaluateSimpleCondition(c, fieldValues));
  }

  // Compound condition with "any"
  if ('any' in rules && Array.isArray((rules as CompoundCondition).any)) {
    return (rules as CompoundCondition).any!.some(c => evaluateSimpleCondition(c, fieldValues));
  }

  // Simple condition
  return evaluateSimpleCondition(rules as SimpleCondition, fieldValues);
}

function evaluateSimpleCondition(
  condition: SimpleCondition,
  fieldValues: Record<string, unknown>
): boolean {
  const value = fieldValues[condition.field];

  switch (condition.operator) {
    case 'equals':
      return value === condition.value;
    case 'not_equals':
      return value !== condition.value;
    case 'contains':
      if (Array.isArray(value)) {
        return value.includes(condition.value);
      }
      if (typeof value === 'string') {
        return value.includes(String(condition.value));
      }
      return false;
    case 'not_contains':
      if (Array.isArray(value)) {
        return !value.includes(condition.value);
      }
      if (typeof value === 'string') {
        return !value.includes(String(condition.value));
      }
      return true;
    case 'greater_than':
      return Number(value) > Number(condition.value);
    case 'less_than':
      return Number(value) < Number(condition.value);
    case 'is_empty':
      return value === null || value === undefined || value === '';
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '';
    default:
      return true;
  }
}

/**
 * Replace placeholders in content with values
 */
function replacePlaceholders(
  content: string,
  fieldValues: Record<string, unknown>,
  fields: TemplateField[]
): { text: string; usedFields: string[]; fillable: string[] } {
  const usedFields: string[] = [];
  const fillable: string[] = [];

  let text = content;

  // Replace bracket placeholders [FIELD_NAME]
  text = text.replace(/\[([A-Z][A-Z0-9_\s]+)\]/g, (match, name) => {
    const fieldName = name.toLowerCase().replace(/\s+/g, '_');
    const value = fieldValues[fieldName];
    if (value !== undefined && value !== null) {
      usedFields.push(fieldName);
      return String(value);
    }
    return match; // Keep original if no value
  });

  // Replace mustache placeholders {{field_name}} or {{field_name:fillable}}
  text = text.replace(/\{\{([a-z][a-z0-9_]*)(:[a-z]+)?\}\}/g, (match, name, modifier) => {
    const field = fields.find(f => f.name === name);
    const isFillable = modifier === ':fillable' || field?.outputType === 'fillable';

    if (isFillable) {
      fillable.push(name);
      return `[${name.toUpperCase()}]`; // Placeholder for fillable field
    }

    const value = fieldValues[name];
    if (value !== undefined && value !== null) {
      usedFields.push(name);
      return String(value);
    }
    return match;
  });

  return { text, usedFields, fillable };
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Wrap text to fit within a max width
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Draw text with automatic page breaks
 */
function drawText(
  pdfDoc: PDFDocument,
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    font: PDFFont;
    size: number;
    maxWidth: number;
  }
): { page: PDFPage; y: number } {
  let { y } = options;
  let currentPage = page;

  const lines = wrapText(text, options.font, options.size, options.maxWidth);

  for (const line of lines) {
    if (y < MARGIN + LINE_HEIGHT) {
      currentPage = pdfDoc.addPage();
      y = currentPage.getHeight() - MARGIN;
    }

    currentPage.drawText(line, {
      x: options.x,
      y,
      size: options.size,
      font: options.font,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT;
  }

  return { page: currentPage, y };
}
```

**Step 2: Commit**

```bash
git add src/lib/document-templates/pdf-generator.ts
git commit -m "feat(pdf): add PDF generator with fillable fields"
```

---

### Task 12: Create Document Generation Service

**Files:**
- Create: `src/lib/document-templates/generator.ts`

**Step 1: Write the generation service**

```typescript
import { supabaseAdmin, supabaseEnvReady } from '@/lib/supabase/server';
import { getDocumentTemplate } from './queries';
import { collectFieldValues } from './gap-detection';
import { generatePDF } from './pdf-generator';
import { createMatterDocument } from './actions';
import type { MatterDocument } from './types';

interface GenerateDocumentOptions {
  matterId: string;
  templateId: string;
  manualFieldValues?: Record<string, unknown>;
  sectionOverrides?: {
    skip?: string[];
    forceInclude?: string[];
    customContent?: Record<string, string>;
  };
}

interface GenerationResult {
  success: boolean;
  error?: string;
  document?: MatterDocument;
  pdfUrl?: string;
}

/**
 * Generate a document from a template for a specific matter
 */
export async function generateDocument(
  options: GenerateDocumentOptions
): Promise<GenerationResult> {
  const { matterId, templateId, manualFieldValues, sectionOverrides } = options;

  if (!supabaseEnvReady()) {
    return { success: false, error: 'Service unavailable' };
  }

  try {
    // Get the template with sections and fields
    const template = await getDocumentTemplate(templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Collect all field values
    const fieldValues = await collectFieldValues(
      matterId,
      [templateId],
      manualFieldValues
    );

    // Generate PDF
    const { buffer, metadata } = await generatePDF(template, {
      fieldValues,
      sectionOverrides,
    });

    // Upload to storage
    const supabase = supabaseAdmin();
    const fileName = `documents/${matterId}/${template.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('matter-documents')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload PDF' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('matter-documents')
      .getPublicUrl(fileName);

    // Create document record
    const docResult = await createMatterDocument({
      matterId,
      name: template.name,
      documentType: 'template',
      source: 'generated',
      templateId: template.id,
      templateVersion: template.version,
      pdfUrl: urlData.publicUrl,
      fieldValues,
    });

    if (!docResult.success) {
      return { success: false, error: docResult.error };
    }

    return {
      success: true,
      pdfUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Document generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    };
  }
}

/**
 * Generate all selected documents for a matter
 */
export async function generateAllDocuments(
  matterId: string,
  templateIds: string[],
  manualFieldValues?: Record<string, unknown>
): Promise<{ success: boolean; results: GenerationResult[] }> {
  const results: GenerationResult[] = [];

  for (const templateId of templateIds) {
    const result = await generateDocument({
      matterId,
      templateId,
      manualFieldValues,
    });
    results.push(result);
  }

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

/**
 * Regenerate a document (new version)
 */
export async function regenerateDocument(
  matterDocumentId: string,
  manualFieldValues?: Record<string, unknown>
): Promise<GenerationResult> {
  if (!supabaseEnvReady()) {
    return { success: false, error: 'Service unavailable' };
  }

  const supabase = supabaseAdmin();

  // Get existing document
  const { data: existingDoc, error } = await supabase
    .from('matter_documents')
    .select('*')
    .eq('id', matterDocumentId)
    .single();

  if (error || !existingDoc) {
    return { success: false, error: 'Document not found' };
  }

  if (!existingDoc.template_id) {
    return { success: false, error: 'Cannot regenerate custom documents' };
  }

  // Generate new version
  const result = await generateDocument({
    matterId: existingDoc.matter_id,
    templateId: existingDoc.template_id,
    manualFieldValues: {
      ...(existingDoc.field_values as Record<string, unknown> || {}),
      ...manualFieldValues,
    },
  });

  if (result.success) {
    // Update status of old document
    await supabase
      .from('matter_documents')
      .update({ status: 'draft' })
      .eq('id', matterDocumentId);
  }

  return result;
}
```

**Step 2: Update index to export new modules**

```typescript
// In src/lib/document-templates/index.ts - add exports:
export * from './parser';
export * from './ai-parser';
export * from './gap-detection';
export * from './pdf-generator';
export * from './generator';
```

**Step 3: Commit**

```bash
git add src/lib/document-templates/generator.ts src/lib/document-templates/index.ts
git commit -m "feat(generator): add document generation service"
```

---

## Phase 5: API Routes & UI

### Task 13: Create Template Upload API Route

**Files:**
- Create: `src/app/api/templates/upload/route.ts`

**Step 1: Write the upload route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionWithProfile } from '@/lib/auth/server';
import { supabaseAdmin, supabaseEnvReady } from '@/lib/supabase/server';
import { parseDocxToTemplate } from '@/lib/document-templates/parser';
import { enhanceTemplateWithAI } from '@/lib/document-templates/ai-parser';

export async function POST(request: NextRequest) {
  // Auth check
  const { session, profile } = await getSessionWithProfile();
  if (!session || profile?.role === 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseEnvReady()) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const enhanceWithAI = formData.get('enhanceWithAI') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the document
    let parsedTemplate = await parseDocxToTemplate(buffer, file.name.replace('.docx', ''));

    // Optionally enhance with AI
    if (enhanceWithAI) {
      const { text } = await import('mammoth').then(m => m.extractRawText({ buffer }));
      parsedTemplate = await enhanceTemplateWithAI(parsedTemplate, text.value);
    }

    // Upload original file to storage
    const supabase = supabaseAdmin();
    const fileName = `templates/originals/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('matter-documents')
      .upload(fileName, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
    }

    const { data: urlData } = supabase.storage
      .from('matter-documents')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      parsedTemplate,
      originalFileUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Template upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/templates/upload/route.ts
git commit -m "feat(api): add template upload endpoint"
```

---

### Task 14: Create Storage Bucket Migration

**Files:**
- Create: `supabase/migrations/20260105000002_document_storage_bucket.sql`

**Step 1: Write the migration**

```sql
-- Create storage bucket for matter documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('matter-documents', 'matter-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'matter-documents');

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'matter-documents');

-- Allow staff/admin to delete documents
CREATE POLICY "Staff and admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'matter-documents' AND
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'staff')
);
```

**Step 2: Apply migration**

Run: `supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/20260105000002_document_storage_bucket.sql
git commit -m "feat(storage): add matter-documents storage bucket"
```

---

### Task 15: Create Admin Templates Page

**Files:**
- Create: `src/app/admin/templates/page.tsx`

**Step 1: Write the templates list page**

```typescript
import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, FileText, Upload } from 'lucide-react';
import { getDocumentTemplates } from '@/lib/document-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function TemplatesPage() {
  const templates = await getDocumentTemplates();

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground">
            Manage legal document templates for client packages
          </p>
        </div>
        <Link href="/admin/templates/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Link key={template.id} href={`/admin/templates/${template.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                    {template.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                <CardDescription>{template.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>v{template.version}</span>
                  <span>{template.category || 'Uncategorized'}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {templates.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first document template to get started
              </p>
              <Link href="/admin/templates/upload">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Template
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/admin/templates/page.tsx
git commit -m "feat(ui): add admin templates list page"
```

---

### Task 16: Create Template Upload Page

**Files:**
- Create: `src/app/admin/templates/upload/page.tsx`

**Step 1: Write the upload page**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/lib/toast';
import type { ParsedTemplate } from '@/lib/document-templates/types';

export default function UploadTemplatePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [enhanceWithAI, setEnhanceWithAI] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedTemplate, setParsedTemplate] = useState<ParsedTemplate | null>(null);
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.docx')) {
        showError('Please select a .docx file');
        return;
      }
      setFile(selectedFile);
      setParsedTemplate(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('enhanceWithAI', String(enhanceWithAI));

      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setParsedTemplate(data.parsedTemplate);
      setOriginalFileUrl(data.originalFileUrl);
      showSuccess('Template parsed successfully!');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = () => {
    if (!parsedTemplate || !originalFileUrl) return;

    // Store in session storage for the review page
    sessionStorage.setItem('parsedTemplate', JSON.stringify(parsedTemplate));
    sessionStorage.setItem('originalFileUrl', originalFileUrl);
    router.push('/admin/templates/review');
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Upload Document Template</h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Word Document</CardTitle>
          <CardDescription>
            Upload a .docx file to parse it into a structured template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input
              type="file"
              accept=".docx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div className="flex flex-col items-center">
                  <FileText className="h-12 w-12 text-primary mb-2" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="font-medium">Drop a .docx file here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* AI Enhancement Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enhance">AI-Enhanced Parsing</Label>
              <p className="text-sm text-muted-foreground">
                Use AI to detect additional placeholders and suggest conditions
              </p>
            </div>
            <Switch
              id="ai-enhance"
              checked={enhanceWithAI}
              onCheckedChange={setEnhanceWithAI}
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Parse Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Parsing Results */}
      {parsedTemplate && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Template Parsed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{parsedTemplate.suggestedName}</p>
              <p className="text-sm text-muted-foreground">
                Category: {parsedTemplate.suggestedCategory}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                {parsedTemplate.sections.length} Sections Detected
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {parsedTemplate.sections.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span>• {s.name}</span>
                    {s.suggestedConditional && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                        conditional
                      </span>
                    )}
                  </li>
                ))}
                {parsedTemplate.sections.length > 5 && (
                  <li className="text-muted-foreground">
                    +{parsedTemplate.sections.length - 5} more...
                  </li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                {parsedTemplate.allPlaceholders.length} Placeholders Found
              </p>
              <div className="flex flex-wrap gap-1">
                {parsedTemplate.allPlaceholders.slice(0, 8).map((p, i) => (
                  <span
                    key={i}
                    className="text-xs bg-muted px-2 py-0.5 rounded"
                  >
                    {p.suggestedFieldName}
                  </span>
                ))}
                {parsedTemplate.allPlaceholders.length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{parsedTemplate.allPlaceholders.length - 8} more
                  </span>
                )}
              </div>
            </div>

            <Button onClick={handleContinue} className="w-full">
              Continue to Review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/admin/templates/upload/page.tsx
git commit -m "feat(ui): add template upload page with AI parsing"
```

---

This plan covers the core implementation. Due to the size of this feature, I'm breaking here with the foundational pieces. The remaining tasks would include:

- **Task 17-20**: Template review/editor UI pages
- **Task 21-24**: Matter documents tab integration
- **Task 25-28**: Document generation workflow UI
- **Task 29-32**: Gap detection UI and field entry forms
- **Task 33-36**: Tests for all modules

---

**Plan saved to:** `docs/plans/2026-01-05-document-template-system-implementation.md`

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**