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
      .filter(Boolean) as TemplateField[],
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

  return (data || []).map(mapFieldFromDb).filter(Boolean) as TemplateField[];
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
    .filter(Boolean) as TemplateField[];
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
