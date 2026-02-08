/**
 * Email types and interfaces for MatterFlow email system
 */

export type EmailType =
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
  | "matter_stage_changed"
  | "info_request"
  | "info_request_response"
  | "account_creation"
  | "user_invitation"
  | "client_invitation";

export interface EmailMetadata {
  type: EmailType;
  matterId?: string;
  invoiceId?: string;
  taskId?: string;
  recipientRole?: "client" | "lawyer" | "staff";
  actorId?: string; // User ID who triggered the email
  [key: string]: unknown;
}

export interface EmailSendRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  metadata?: EmailMetadata;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Gmail API types
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body: { data?: string };
  };
  internalDate: string;
}

export interface GmailDraft {
  id: string;
  message: GmailMessage;
}

/**
 * Communication log entry for timeline
 */
export interface CommunicationLog {
  id: string;
  matterId: string;
  direction: "inbound" | "outbound";
  emailType: EmailType;
  subject: string;
  from: string;
  to: string;
  sentAt: string;
  gmailMessageId?: string;
  metadata?: Record<string, unknown>;
}
