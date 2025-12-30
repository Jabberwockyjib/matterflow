import { Resend } from "resend";

/**
 * Resend email client for transactional emails
 * Requires RESEND_API_KEY environment variable
 */

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey && process.env.NODE_ENV !== "test") {
  console.warn(
    "RESEND_API_KEY is not set. Email sending will fail. Add it to .env.local",
  );
}

export const resend = new Resend(resendApiKey || "re_test_key");

/**
 * Default "from" address for system emails
 * Override with RESEND_FROM_EMAIL environment variable
 */
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "MatterFlow <noreply@matterflow.app>";

/**
 * Check if Resend is configured
 */
export const isResendConfigured = () => Boolean(resendApiKey);

/**
 * Send invitation email to client
 */
export interface SendInvitationEmailParams {
  to: string;
  clientName: string;
  inviteCode: string;
  inviteLink: string;
  lawyerName: string;
  message?: string;
}

export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  // Validate required parameters
  if (!params.to?.trim()) {
    return { ok: false, error: "Recipient email is required" };
  }

  if (!params.clientName?.trim()) {
    return { ok: false, error: "Client name is required" };
  }

  if (!params.inviteCode?.trim()) {
    return { ok: false, error: "Invite code is required" };
  }

  if (!params.inviteLink?.trim()) {
    return { ok: false, error: "Invite link is required" };
  }

  if (!params.lawyerName?.trim()) {
    return { ok: false, error: "Lawyer name is required" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.to)) {
    return { ok: false, error: "Invalid email address format" };
  }

  // Validate URL format (basic check)
  if (!params.inviteLink.startsWith("http://") && !params.inviteLink.startsWith("https://")) {
    return { ok: false, error: "Invite link must be a valid URL" };
  }

  // Dynamic import to avoid bundling email template in client-side code
  const { default: InvitationEmail } = await import(
    "./templates/invitation-email"
  );

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: "Complete Your Intake Form for MatterFlow",
      react: InvitationEmail(params),
    });

    if (error) {
      console.error("Resend API error:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Email sending error:", message);
    return { ok: false, error: message };
  }
}
