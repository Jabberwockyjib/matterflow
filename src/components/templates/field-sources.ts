/**
 * Field Source Definitions
 *
 * Defines available data sources for template field mapping.
 * Used to auto-fill document templates from profiles, matters, and intake forms.
 */

import type { SourceType } from "@/lib/document-templates/types";

export interface SourceField {
  id: string;
  label: string;
  description?: string;
  sampleValue: string;
}

export interface SourceDefinition {
  type: SourceType;
  label: string;
  description: string;
  fields: SourceField[];
}

/**
 * Profile fields - from profiles table
 */
export const PROFILE_SOURCE_FIELDS: SourceField[] = [
  {
    id: "full_name",
    label: "Full Name",
    description: "Client's full name",
    sampleValue: "Jane Doe",
  },
  {
    id: "email",
    label: "Email Address",
    description: "Client's email",
    sampleValue: "jane@example.com",
  },
  {
    id: "phone",
    label: "Phone Number",
    description: "Client's phone number",
    sampleValue: "(555) 123-4567",
  },
];

/**
 * Matter fields - from matters table
 */
export const MATTER_SOURCE_FIELDS: SourceField[] = [
  {
    id: "title",
    label: "Matter Title",
    description: "Title of the matter",
    sampleValue: "Services Agreement - Jane Doe",
  },
  {
    id: "matter_type",
    label: "Matter Type",
    description: "Type of legal matter",
    sampleValue: "Contract Review",
  },
  {
    id: "stage",
    label: "Current Stage",
    description: "Current pipeline stage",
    sampleValue: "Under Review",
  },
  {
    id: "created_at",
    label: "Date Created",
    description: "When the matter was created",
    sampleValue: new Date().toLocaleDateString(),
  },
];

/**
 * All source definitions
 */
export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    type: "profile",
    label: "Client Profile",
    description: "Data from the client's profile",
    fields: PROFILE_SOURCE_FIELDS,
  },
  {
    type: "matter",
    label: "Matter",
    description: "Data from the current matter",
    fields: MATTER_SOURCE_FIELDS,
  },
  {
    type: "intake",
    label: "Intake Form",
    description: "Responses from the intake form",
    fields: [], // Populated dynamically based on template category
  },
  {
    type: "manual",
    label: "Manual Entry",
    description: "Entered manually when generating the document",
    fields: [],
  },
];

/**
 * Get source definition by type
 */
export function getSourceDefinition(type: SourceType): SourceDefinition | undefined {
  return SOURCE_DEFINITIONS.find((s) => s.type === type);
}

/**
 * Get available fields for a source type
 */
export function getSourceFields(type: SourceType): SourceField[] {
  const source = getSourceDefinition(type);
  return source?.fields || [];
}

/**
 * Get sample value for a field
 */
export function getSampleValue(sourceType: SourceType, fieldId: string): string {
  const fields = getSourceFields(sourceType);
  const field = fields.find((f) => f.id === fieldId);
  return field?.sampleValue || `{{${fieldId}}}`;
}

/**
 * Get all intake field IDs from a template category
 * This would be populated dynamically based on the intake template
 */
export function getIntakeFieldsForCategory(category: string | null): SourceField[] {
  // Common intake fields that appear in most templates
  const commonFields: SourceField[] = [
    { id: "client_name", label: "Client Name", sampleValue: "Jane Doe" },
    { id: "client_email", label: "Client Email", sampleValue: "jane@example.com" },
    { id: "client_phone", label: "Client Phone", sampleValue: "(555) 123-4567" },
  ];

  // Category-specific fields
  if (category === "Contract Review") {
    return [
      ...commonFields,
      { id: "contract_type", label: "Contract Type", sampleValue: "Employment Agreement" },
      { id: "other_party", label: "Other Party", sampleValue: "Acme Corp" },
      { id: "contract_value", label: "Contract Value", sampleValue: "$50,000" },
      { id: "deadline", label: "Deadline", sampleValue: "2026-02-15" },
    ];
  }

  if (category === "Employment Agreement") {
    return [
      ...commonFields,
      { id: "practice_name", label: "Practice Name", sampleValue: "ABC Therapy" },
      { id: "position_title", label: "Position Title", sampleValue: "Licensed Therapist" },
      { id: "employee_type", label: "Employment Type", sampleValue: "Full-Time Employee" },
      { id: "compensation_amount", label: "Compensation", sampleValue: "$65,000" },
      { id: "start_date", label: "Start Date", sampleValue: "2026-02-01" },
    ];
  }

  if (category === "Policy Review") {
    return [
      ...commonFields,
      { id: "practice_name", label: "Practice Name", sampleValue: "ABC Therapy" },
      { id: "practice_type", label: "Practice Type", sampleValue: "Mental Health Practice" },
    ];
  }

  return commonFields;
}
