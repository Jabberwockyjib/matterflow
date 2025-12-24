/**
 * Email types and interfaces for MatterFlow email system
 */

export type EmailType =
  | "matter_created"
  | "invoice_sent"
  | "invoice_reminder"
  | "task_assigned"
  | "intake_reminder"
  | "intake_submitted"
  | "client_activity_reminder"
  | "lawyer_activity_reminder"
  | "payment_received"
  | "matter_stage_changed";

export interface EmailMetadata {
  type: EmailType;
  matterId?: string;
  invoiceId?: string;
  taskId?: string;
  recipientRole?: "client" | "lawyer" | "staff";
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
