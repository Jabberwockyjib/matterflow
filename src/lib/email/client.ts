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
