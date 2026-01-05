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
