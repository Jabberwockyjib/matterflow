/**
 * Email client - re-exports from Gmail implementation
 *
 * This file previously used Resend but has been migrated to Gmail API.
 * Kept for backwards compatibility with existing imports.
 */

export { sendGmailEmail, isGmailConfigured } from "./gmail-client";
export { sendEmail, sendTemplateEmail } from "./service";
