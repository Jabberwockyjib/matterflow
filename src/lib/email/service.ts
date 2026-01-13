"use server";

import { render } from "@react-email/components";
import { FROM_EMAIL, isResendConfigured, resend } from "./client";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { EmailMetadata, EmailSendRequest, EmailSendResult } from "./types";

/**
 * Send an email using Resend
 * Logs the send to audit logs
 */
export async function sendEmail(request: EmailSendRequest): Promise<EmailSendResult> {
  // Check if Resend is configured
  if (!isResendConfigured()) {
    console.error("Cannot send email: RESEND_API_KEY not configured");
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(request.to) ? request.to : [request.to],
      subject: request.subject,
      html: request.html,
      text: request.text,
      replyTo: request.replyTo,
      tags: request.metadata
        ? [
            { name: "type", value: request.metadata.type },
            ...(request.metadata.matterId
              ? [{ name: "matterId", value: request.metadata.matterId }]
              : []),
          ]
        : undefined,
    });

    if (error) {
      console.error("Resend error:", error);
      return {
        success: false,
        error: error.message,
      };
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
          to: Array.isArray(request.to) ? request.to : [request.to],
          subject: request.subject,
          messageId: data?.id,
          recipientRole: request.metadata?.recipientRole,
          invoiceId: request.metadata?.invoiceId,
          taskId: request.metadata?.taskId,
        },
      });
    } catch (auditError) {
      // Don't fail email send if audit logging fails
      console.error("Failed to log email to audit_logs:", auditError);
    }

    return {
      success: true,
      messageId: data?.id,
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
