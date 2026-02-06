"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { renderEmailWithPlaceholders, type PlaceholderData } from "./renderer";
import { sendEmail } from "@/lib/email/service";
import type { EmailTemplateType, EmailTemplateRow } from "./types";
import type { EmailMetadata, EmailType } from "@/lib/email/types";

/**
 * Parameters for sending a templated email
 */
export interface SendTemplatedEmailParams {
  /** The type of email template to use */
  emailType: EmailTemplateType;
  /** Recipient email address(es) */
  to: string | string[];
  /** Placeholder data to substitute into the template */
  data: PlaceholderData;
  /** Optional email metadata (matterId, invoiceId, etc.) */
  metadata?: Omit<EmailMetadata, "type">;
}

/**
 * Result of sending a templated email
 */
export interface SendResult {
  success: boolean;
  /** True if email was not sent because template is disabled */
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send an email using a database template.
 *
 * This function:
 * 1. Fetches the template from the email_templates table
 * 2. Checks if the template is enabled
 * 3. Renders placeholders in subject and body
 * 4. Wraps body in base email layout HTML
 * 5. Sends via the existing email service
 *
 * @example
 * ```ts
 * const result = await sendTemplatedEmail({
 *   emailType: "matter_created",
 *   to: "client@example.com",
 *   data: {
 *     clientName: "John Doe",
 *     matterTitle: "Contract Review",
 *     practiceName: "Smith Law",
 *   },
 *   metadata: { matterId: "123" },
 * });
 * ```
 */
export async function sendTemplatedEmail(
  params: SendTemplatedEmailParams
): Promise<SendResult> {
  const supabase = supabaseAdmin();

  // Get template from database
  // Note: email_templates table may not be in generated types yet, using type assertion
  const { data: template, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{ data: EmailTemplateRow | null; error: unknown }>;
        };
      };
    };
  })
    .from("email_templates")
    .select("*")
    .eq("email_type", params.emailType)
    .single();

  if (error || !template) {
    console.error(`Email template not found: ${params.emailType}`, error);
    return { success: false, error: "Template not found" };
  }

  // Check if enabled
  if (!template.is_enabled) {
    console.log(`Email template disabled: ${params.emailType}`);
    return { success: true, skipped: true };
  }

  // Render subject and body with placeholders
  const subject = renderEmailWithPlaceholders(template.subject, params.data);
  const html = wrapInBaseLayout(
    renderEmailWithPlaceholders(template.body_html, params.data),
    params.data
  );

  // Send email using existing service
  // Cast emailType to EmailType - the types are nearly identical
  // EmailTemplateType has user_invitation which EmailType lacks
  const result = await sendEmail({
    to: params.to,
    subject,
    html,
    metadata: {
      ...params.metadata,
      type: params.emailType as EmailType,
    },
  });

  return {
    success: result.success,
    error: result.error,
    messageId: result.messageId,
  };
}

/**
 * Wrap email body content in the base email layout HTML.
 *
 * Provides consistent branding across all emails:
 * - Responsive layout with max-width container
 * - Practice logo or name header
 * - Styled body content area
 * - Footer with copyright
 */
function wrapInBaseLayout(bodyHtml: string, data: PlaceholderData): string {
  const year = data.currentYear || new Date().getFullYear().toString();
  const practiceName = data.practiceName || "MatterFlow";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
    ${data.practiceLogo ? `<img src="${data.practiceLogo}" alt="${practiceName}" style="max-width: 200px; height: auto; margin-bottom: 24px;">` : `<h1 style="color: #1e293b; font-size: 24px; margin: 0 0 24px;">${practiceName}</h1>`}

    <div style="color: #334155; font-size: 14px; line-height: 24px;">
      ${bodyHtml}
    </div>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        &copy; ${year} ${practiceName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
