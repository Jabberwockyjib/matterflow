/**
 * Email Template Query Functions
 *
 * Read-only data fetching for email templates and versions.
 * Used in Server Components and API routes.
 *
 * Note: These functions use type assertions because the email_templates
 * and email_template_versions tables are new and may not be in the
 * generated database types yet. Once the migration is applied and types
 * are regenerated, the assertions can be removed.
 */

import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  EmailTemplate,
  EmailTemplateRow,
  EmailTemplateType,
  EmailTemplateVersion,
  EmailTemplateVersionRowWithProfile,
} from "./types";
import { toEmailTemplate, toEmailTemplateVersion } from "./types";

// Helper to get untyped access to new tables until database types are regenerated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => supabaseAdmin() as any;

/**
 * Fetch all email templates ordered by name
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching email templates:", error);
    return [];
  }

  return (data as EmailTemplateRow[]).map(toEmailTemplate);
}

/**
 * Fetch a single email template by its type
 * @returns The template or null if not found
 */
export async function getEmailTemplateByType(
  emailType: EmailTemplateType
): Promise<EmailTemplate | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("email_type", emailType)
    .single();

  // PGRST116 = "The result contains 0 rows" - not an error, just not found
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching email template by type:", error);
    return null;
  }

  return toEmailTemplate(data as EmailTemplateRow);
}

/**
 * Fetch a single email template by ID
 * @returns The template or null if not found
 */
export async function getEmailTemplateById(
  id: string
): Promise<EmailTemplate | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  // PGRST116 = "The result contains 0 rows" - not an error, just not found
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching email template by ID:", error);
    return null;
  }

  return toEmailTemplate(data as EmailTemplateRow);
}

/**
 * Fetch all versions of a template with creator profile data
 * @returns Array of versions ordered by version DESC (newest first)
 */
export async function getEmailTemplateVersions(
  templateId: string
): Promise<EmailTemplateVersion[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("email_template_versions")
    .select(
      `
      *,
      profiles:created_by (
        full_name
      )
    `
    )
    .eq("template_id", templateId)
    .order("version", { ascending: false });

  if (error) {
    console.error("Error fetching email template versions:", error);
    return [];
  }

  return (data as EmailTemplateVersionRowWithProfile[]).map(
    toEmailTemplateVersion
  );
}

/**
 * Fetch a specific version of a template
 * @returns The version or null if not found
 */
export async function getEmailTemplateVersion(
  templateId: string,
  version: number
): Promise<EmailTemplateVersion | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("email_template_versions")
    .select(
      `
      *,
      profiles:created_by (
        full_name
      )
    `
    )
    .eq("template_id", templateId)
    .eq("version", version)
    .single();

  // PGRST116 = "The result contains 0 rows" - not an error, just not found
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching email template version:", error);
    return null;
  }

  return toEmailTemplateVersion(data as EmailTemplateVersionRowWithProfile);
}

/**
 * Check if email templates have been seeded
 * Uses efficient count query without fetching actual data
 * @returns true if at least one template exists
 */
export async function areTemplatesSeeded(): Promise<boolean> {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from("email_templates")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error checking if templates are seeded:", error);
    return false;
  }

  return (count ?? 0) > 0;
}
