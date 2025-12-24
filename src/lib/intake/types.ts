/**
 * Intake Form Types
 *
 * TypeScript interfaces for dynamic intake form system.
 * Supports flexible form schemas per matter type.
 */

export type IntakeFormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "file"
  | "section_header";

export interface IntakeFormField {
  id: string;
  type: IntakeFormFieldType;
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean | string[];

  // For select, multiselect, radio
  options?: Array<{
    value: string;
    label: string;
  }>;

  // For text, textarea, number
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternMessage?: string;
  };

  // For file uploads
  fileConfig?: {
    maxSize?: number; // in bytes
    acceptedTypes?: string[]; // MIME types
    maxFiles?: number;
  };

  // Conditional display
  conditionalDisplay?: {
    field: string; // Field ID to check
    value: string | string[]; // Show if field equals this value
  };
}

export interface IntakeFormSection {
  id: string;
  title: string;
  description?: string;
  fields: IntakeFormField[];
}

export interface IntakeFormTemplate {
  id: string;
  name: string;
  matterType: string; // Links to matter.matter_type
  description?: string;
  sections: IntakeFormSection[];
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntakeFormResponse {
  id: string;
  matterId: string;
  formType: string;
  responses: Record<string, any>; // JSONB field
  status: "draft" | "submitted" | "approved";
  submittedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IntakeFileUpload {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  driveFileId?: string; // Google Drive file ID
  uploadedAt: string;
}

export type FormValidationError = {
  field: string;
  message: string;
};

export type FormValidationResult = {
  valid: boolean;
  errors: FormValidationError[];
};

export interface IntakeFormSubmission {
  formType: string;
  matterId: string;
  responses: Record<string, any>;
  files?: IntakeFileUpload[];
}

export type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
