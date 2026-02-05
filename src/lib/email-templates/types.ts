/**
 * Email Template Types
 *
 * TypeScript interfaces for the email template editor system.
 * Includes both camelCase application types and snake_case database row types.
 */

// ============================================================================
// TipTap JSON Content Type
// ============================================================================

/**
 * TipTap document JSON structure
 * Defined here to avoid dependency on @tiptap/core before it's installed
 */
export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  text?: string;
}

// ============================================================================
// Email Template Type Enum
// ============================================================================

/**
 * All supported email template types in the system
 */
export type EmailTemplateType =
  | "matter_created"
  | "invoice_sent"
  | "invoice_reminder"
  | "task_assigned"
  | "task_response_submitted"
  | "task_approved"
  | "task_revision_requested"
  | "intake_reminder"
  | "intake_submitted"
  | "intake_declined"
  | "client_activity_reminder"
  | "lawyer_activity_reminder"
  | "payment_received"
  | "info_request"
  | "info_request_response"
  | "user_invitation";

/**
 * Array of all email template types for iteration
 */
export const EMAIL_TEMPLATE_TYPES: EmailTemplateType[] = [
  "matter_created",
  "invoice_sent",
  "invoice_reminder",
  "task_assigned",
  "task_response_submitted",
  "task_approved",
  "task_revision_requested",
  "intake_reminder",
  "intake_submitted",
  "intake_declined",
  "client_activity_reminder",
  "lawyer_activity_reminder",
  "payment_received",
  "info_request",
  "info_request_response",
  "user_invitation",
];

// ============================================================================
// Application Types (camelCase)
// ============================================================================

/**
 * Email template - application format
 */
export interface EmailTemplate {
  id: string;
  emailType: EmailTemplateType;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email template version - application format
 */
export interface EmailTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
  createdAt: string;
  createdBy: string | null;
  createdByName?: string;
}

// ============================================================================
// Database Row Types (snake_case)
// ============================================================================

/**
 * Email template - database row format
 */
export interface EmailTemplateRow {
  id: string;
  email_type: string;
  name: string;
  subject: string;
  body_html: string;
  body_json: JSONContent;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Email template version - database row format
 */
export interface EmailTemplateVersionRow {
  id: string;
  template_id: string;
  version: number;
  subject: string;
  body_html: string;
  body_json: JSONContent;
  created_at: string;
  created_by: string | null;
}

/**
 * Email template version row with joined profile data
 */
export interface EmailTemplateVersionRowWithProfile extends EmailTemplateVersionRow {
  profiles?: {
    full_name: string | null;
  } | null;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to application EmailTemplate
 */
export function toEmailTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    emailType: row.email_type as EmailTemplateType,
    name: row.name,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyJson: row.body_json,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transform database row to application EmailTemplateVersion
 */
export function toEmailTemplateVersion(
  row: EmailTemplateVersionRow | EmailTemplateVersionRowWithProfile
): EmailTemplateVersion {
  const version: EmailTemplateVersion = {
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyJson: row.body_json,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };

  // Add creator name if available from joined profile
  if ("profiles" in row && row.profiles?.full_name) {
    version.createdByName = row.profiles.full_name;
  }

  return version;
}

// ============================================================================
// Input Types for Server Actions
// ============================================================================

/**
 * Input for creating a new email template
 */
export interface CreateEmailTemplateInput {
  emailType: EmailTemplateType;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
  isEnabled?: boolean;
}

/**
 * Input for updating an existing email template
 */
export interface UpdateEmailTemplateInput {
  id: string;
  name?: string;
  subject?: string;
  bodyHtml?: string;
  bodyJson?: JSONContent;
  isEnabled?: boolean;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Generic result type for operations
 */
export type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Human-readable display names for email template types
 */
export const EMAIL_TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  matter_created: "Matter Created",
  invoice_sent: "Invoice Sent",
  invoice_reminder: "Invoice Reminder",
  task_assigned: "Task Assigned",
  task_response_submitted: "Task Response Submitted",
  task_approved: "Task Approved",
  task_revision_requested: "Task Revision Requested",
  intake_reminder: "Intake Reminder",
  intake_submitted: "Intake Submitted",
  intake_declined: "Intake Declined",
  client_activity_reminder: "Client Activity Reminder",
  lawyer_activity_reminder: "Lawyer Activity Reminder",
  payment_received: "Payment Received",
  info_request: "Information Request",
  info_request_response: "Information Request Response",
  user_invitation: "User Invitation",
};

/**
 * Category groupings for email template types
 */
export const EMAIL_TEMPLATE_CATEGORIES = {
  matters: ["matter_created"] as EmailTemplateType[],
  billing: ["invoice_sent", "invoice_reminder", "payment_received"] as EmailTemplateType[],
  tasks: [
    "task_assigned",
    "task_response_submitted",
    "task_approved",
    "task_revision_requested",
  ] as EmailTemplateType[],
  intake: ["intake_reminder", "intake_submitted", "intake_declined"] as EmailTemplateType[],
  reminders: ["client_activity_reminder", "lawyer_activity_reminder"] as EmailTemplateType[],
  info_requests: ["info_request", "info_request_response"] as EmailTemplateType[],
  users: ["user_invitation"] as EmailTemplateType[],
} as const;

export type EmailTemplateCategory = keyof typeof EMAIL_TEMPLATE_CATEGORIES;
