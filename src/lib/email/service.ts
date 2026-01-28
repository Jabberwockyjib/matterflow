"use server";

import { render } from "@react-email/components";
import { sendGmailEmail, isGmailConfigured } from "./gmail-client";
import { getGmailCredentials } from "@/lib/data/queries";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { EmailMetadata, EmailSendRequest, EmailSendResult } from "./types";

/**
 * Send an email using Gmail API
 * Logs the send to audit logs
 */
export async function sendEmail(request: EmailSendRequest): Promise<EmailSendResult> {
  // Check if Gmail OAuth is configured
  if (!isGmailConfigured()) {
    console.error("Cannot send email: Google OAuth not configured");
    return {
      success: false,
      error: "Email service not configured - Google OAuth credentials missing",
    };
  }

  // Get Gmail credentials from practice_settings
  const credentials = await getGmailCredentials();
  if (!credentials) {
    console.error("Cannot send email: Gmail not connected in practice settings");
    return {
      success: false,
      error: "Email service not configured - connect Gmail in Settings > Integrations",
    };
  }

  try {
    // Gmail API only supports single recipient per call, so send to each
    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    let lastMessageId: string | undefined;

    for (const recipient of recipients) {
      const result = await sendGmailEmail({
        to: recipient,
        subject: request.subject,
        html: request.html,
        refreshToken: credentials.refreshToken,
        fromEmail: credentials.fromEmail,
        fromName: credentials.fromName,
      });

      if (!result.ok) {
        console.error("Gmail API error:", result.error);
        return {
          success: false,
          error: result.error || "Failed to send email",
        };
      }

      lastMessageId = result.messageId;
    }

    // Log to audit_logs for compliance and debugging
    try {
      const supabase = supabaseAdmin();
      await supabase.from("audit_logs").insert({
        actor_id: request.metadata?.actorId || null,
        event_type: "email_sent",
        entity_type: "email",
        entity_id: request.metadata?.matterId || null,
        metadata: {
          emailType: request.metadata?.type,
          to: recipients,
          subject: request.subject,
          messageId: lastMessageId,
          recipientRole: request.metadata?.recipientRole,
          invoiceId: request.metadata?.invoiceId,
          taskId: request.metadata?.taskId,
          provider: "gmail",
        },
      });
    } catch (auditError) {
      // Don't fail email send if audit logging fails
      console.error("Failed to log email to audit_logs:", auditError);
    }

    return {
      success: true,
      messageId: lastMessageId,
    };
  } catch (err) {
    console.error("Email send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Render a React Email component to HTML string
 */
async function renderEmailTemplate(component: React.ReactElement): Promise<string> {
  return await render(component);
}

/**
 * Send an email with a React Email template
 */
export async function sendTemplateEmail(
  to: string | string[],
  subject: string,
  template: React.ReactElement,
  metadata?: EmailMetadata,
  replyTo?: string,
): Promise<EmailSendResult> {
  const html = await renderEmailTemplate(template);

  return sendEmail({
    to,
    subject,
    html,
    metadata,
    replyTo,
  });
}
