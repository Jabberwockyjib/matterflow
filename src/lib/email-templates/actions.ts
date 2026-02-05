"use server";

/**
 * Email Template Server Actions
 *
 * Server actions for managing email templates: save, toggle, restore versions, send test.
 * All mutations require admin role and are logged to audit_logs.
 */

import { revalidatePath } from "next/cache";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import type {
  EmailTemplateType,
  JSONContent,
  EmailTemplateRow,
} from "./types";
import { PLACEHOLDER_AVAILABILITY } from "./placeholders";
import { getPracticeSettings, getFirmSettings } from "@/lib/data/queries";

// ============================================================================
// Types
// ============================================================================

type ActionResult = {
  success: boolean;
  error?: string;
};

type SaveEmailTemplateParams = {
  emailType: EmailTemplateType;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
};

// ============================================================================
// Helpers
// ============================================================================

// Helper to get untyped access to new tables until database types are regenerated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => supabaseAdmin() as any;

/**
 * Log action to audit_logs table
 * Silently fails to not block primary operations
 */
async function logAudit(params: {
  actorId: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from("audit_logs").insert({
      actor_id: params.actorId,
      event_type: params.eventType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: (params.metadata || null) as Json | null,
    });
  } catch (error) {
    // Do not block primary flow on audit failure
    console.error("Failed to log audit event:", error);
  }
}

/**
 * Check if user is authenticated and has admin role
 * Returns session info or null if unauthorized
 */
async function requireAdmin(): Promise<{
  userId: string;
  email: string | undefined;
} | null> {
  const { session, profile } = await getSessionWithProfile();

  if (!session) {
    return null;
  }

  if (profile?.role !== "admin") {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
  };
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Save or update an email template
 * Creates a new version in email_template_versions and updates the main template row.
 *
 * @param params - Template data including emailType, subject, bodyHtml, bodyJson
 * @returns ActionResult with success status
 */
export async function saveEmailTemplate(
  params: SaveEmailTemplateParams
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const { emailType, subject, bodyHtml, bodyJson } = params;
  const supabase = getSupabase();

  try {
    // Get the template by email_type
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("id")
      .eq("email_type", emailType)
      .single();

    if (templateError) {
      console.error("Error fetching template:", templateError);
      return { success: false, error: "Template not found" };
    }

    const templateId = template.id;

    // Get the latest version number
    const { data: latestVersion, error: versionError } = await supabase
      .from("email_template_versions")
      .select("version")
      .eq("template_id", templateId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      console.error("Error fetching latest version:", versionError);
      return { success: false, error: "Failed to fetch version history" };
    }

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Insert new version row
    const { error: insertVersionError } = await supabase
      .from("email_template_versions")
      .insert({
        template_id: templateId,
        version: nextVersion,
        subject,
        body_html: bodyHtml,
        body_json: bodyJson,
        created_by: admin.userId,
      });

    if (insertVersionError) {
      console.error("Error inserting version:", insertVersionError);
      return { success: false, error: "Failed to save version" };
    }

    // Update main template row
    const { error: updateError } = await supabase
      .from("email_templates")
      .update({
        subject,
        body_html: bodyHtml,
        body_json: bodyJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    if (updateError) {
      console.error("Error updating template:", updateError);
      return { success: false, error: "Failed to update template" };
    }

    // Log to audit_logs
    await logAudit({
      actorId: admin.userId,
      eventType: "email_template_updated",
      entityType: "email_template",
      entityId: templateId,
      metadata: {
        emailType,
        version: nextVersion,
        updatedBy: admin.email,
      },
    });

    // Revalidate settings page
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("saveEmailTemplate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Toggle the is_enabled state of an email template
 *
 * @param emailType - The type of email template to toggle
 * @returns ActionResult with success status
 */
export async function toggleEmailTemplate(
  emailType: EmailTemplateType
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const supabase = getSupabase();

  try {
    // Get current template state
    const { data: template, error: fetchError } = await supabase
      .from("email_templates")
      .select("id, is_enabled")
      .eq("email_type", emailType)
      .single();

    if (fetchError || !template) {
      console.error("Error fetching template:", fetchError);
      return { success: false, error: "Template not found" };
    }

    const newEnabledState = !template.is_enabled;

    // Update the is_enabled state
    const { error: updateError } = await supabase
      .from("email_templates")
      .update({
        is_enabled: newEnabledState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id);

    if (updateError) {
      console.error("Error toggling template:", updateError);
      return { success: false, error: "Failed to toggle template" };
    }

    // Log to audit_logs
    await logAudit({
      actorId: admin.userId,
      eventType: newEnabledState
        ? "email_template_enabled"
        : "email_template_disabled",
      entityType: "email_template",
      entityId: template.id,
      metadata: {
        emailType,
        newState: newEnabledState,
        updatedBy: admin.email,
      },
    });

    // Revalidate settings page
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("toggleEmailTemplate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Restore an email template to a previous version
 * Creates a new version with the content from the specified historical version.
 *
 * @param templateId - The ID of the template
 * @param version - The version number to restore
 * @returns ActionResult with success status
 */
export async function restoreEmailTemplateVersion(
  templateId: string,
  version: number
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const supabase = getSupabase();

  try {
    // Fetch the version to restore
    const { data: versionData, error: versionError } = await supabase
      .from("email_template_versions")
      .select("subject, body_html, body_json")
      .eq("template_id", templateId)
      .eq("version", version)
      .single();

    if (versionError || !versionData) {
      console.error("Error fetching version:", versionError);
      return { success: false, error: "Version not found" };
    }

    // Get the template's email_type
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("email_type")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      console.error("Error fetching template:", templateError);
      return { success: false, error: "Template not found" };
    }

    // Call saveEmailTemplate with the restored content
    const result = await saveEmailTemplate({
      emailType: template.email_type as EmailTemplateType,
      subject: versionData.subject,
      bodyHtml: versionData.body_html,
      bodyJson: versionData.body_json,
    });

    if (!result.success) {
      return result;
    }

    // Log the restore action specifically
    await logAudit({
      actorId: admin.userId,
      eventType: "email_template_version_restored",
      entityType: "email_template",
      entityId: templateId,
      metadata: {
        emailType: template.email_type,
        restoredVersion: version,
        restoredBy: admin.email,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("restoreEmailTemplateVersion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a test email to the current user
 * Uses the template with sample data for all placeholders.
 *
 * @param emailType - The type of email template to test
 * @returns ActionResult with success status
 */
export async function sendTestEmail(
  emailType: EmailTemplateType
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  if (!admin.email) {
    return { success: false, error: "No email address found for current user" };
  }

  const supabase = getSupabase();

  try {
    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("email_type", emailType)
      .single();

    if (templateError || !template) {
      console.error("Error fetching template:", templateError);
      return { success: false, error: "Template not found" };
    }

    const templateData = template as EmailTemplateRow;

    // Get practice and firm settings for sample data
    const [practiceResult, firmSettings] = await Promise.all([
      getPracticeSettings(),
      getFirmSettings(),
    ]);
    const practiceSettings = practiceResult.data;

    // Build sample data object with all placeholders
    const sampleData: Record<string, string> = {
      // Practice tokens
      practiceName: practiceSettings?.firmName || firmSettings.firm_name || "Your Law Practice",
      practiceLogo: firmSettings.logo_url
        ? `<img src="${firmSettings.logo_url}" alt="Logo" style="max-height:60px" />`
        : "",
      practiceEmail: practiceSettings?.contactEmail || "contact@example.com",
      practicePhone: practiceSettings?.contactPhone || "(555) 123-4567",
      practiceAddress:
        practiceSettings?.address || "123 Main St, Suite 100\nCity, ST 12345",

      // Client tokens
      clientName: "John Smith",
      clientEmail: admin.email,

      // Matter tokens
      matterTitle: "Sample Matter - Contract Review",
      matterType: "Contract Review",
      lawyerName: "Jane Doe, Esq.",

      // Invoice tokens
      invoiceAmount: "$1,500.00",
      invoiceNumber: "INV-2024-001",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      paymentLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://matterflow.local"}/pay/sample`,

      // Task tokens
      taskTitle: "Review Contract Draft",
      taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://matterflow.local"}/tasks/sample`,
      intakeLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://matterflow.local"}/intake/sample`,

      // System tokens
      currentYear: new Date().getFullYear().toString(),
    };

    // Render placeholders in subject and body
    const availableTokens = PLACEHOLDER_AVAILABILITY[emailType];
    let renderedSubject = templateData.subject;
    let renderedBody = templateData.body_html;

    for (const token of availableTokens) {
      const value = sampleData[token] || `[${token}]`;
      const regex = new RegExp(`\\{\\{${token}\\}\\}`, "g");
      renderedSubject = renderedSubject.replace(regex, value);
      renderedBody = renderedBody.replace(regex, value);
    }

    // Prefix subject with [TEST]
    const testSubject = `[TEST] ${renderedSubject}`;

    // Dynamically import sendEmail to avoid circular dependencies
    const { sendEmail } = await import("@/lib/email/service");

    // Send the test email
    // Note: We use a type assertion here because "test_email" is not in the standard EmailType union,
    // but this is intentional for test emails to distinguish them in audit logs
    const result = await sendEmail({
      to: admin.email,
      subject: testSubject,
      html: renderedBody,
      metadata: {
        type: "matter_created" as const, // Use a valid type for the email system
        actorId: admin.userId,
      },
    });

    if (!result.success) {
      return { success: false, error: result.error || "Failed to send email" };
    }

    // Log to audit_logs
    await logAudit({
      actorId: admin.userId,
      eventType: "email_template_test_sent",
      entityType: "email_template",
      entityId: templateData.id,
      metadata: {
        emailType,
        sentTo: admin.email,
        messageId: result.messageId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("sendTestEmail error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
