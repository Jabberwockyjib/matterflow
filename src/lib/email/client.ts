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
