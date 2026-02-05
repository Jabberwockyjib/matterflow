/**
 * Email Template Seeding
 *
 * Seeds the default email templates into the database on first run.
 * This should be called during app initialization or via a setup script.
 */

import { supabaseAdmin } from "@/lib/supabase/server";
import { areTemplatesSeeded } from "./queries";
import { DEFAULT_TEMPLATES } from "./defaults";
import type { Json } from "@/types/database.types";

// ============================================================================
// Types
// ============================================================================

export interface SeedResult {
  success: boolean;
  count: number;
  error?: string;
}

// ============================================================================
// Seed Function
// ============================================================================

/**
 * Seed default email templates into the database
 *
 * This function is idempotent - it will only seed templates if none exist.
 * Returns the number of templates inserted.
 *
 * @returns SeedResult with success status and count of inserted templates
 */
export async function seedEmailTemplates(): Promise<SeedResult> {
  try {
    // Check if templates are already seeded
    const alreadySeeded = await areTemplatesSeeded();

    if (alreadySeeded) {
      console.log("Email templates already seeded, skipping...");
      return { success: true, count: 0 };
    }

    console.log("Seeding default email templates...");

    // Use supabaseAdmin for service role access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin() as any;

    // Prepare template rows for insertion
    const templateRows = DEFAULT_TEMPLATES.map((template) => ({
      email_type: template.emailType,
      name: template.name,
      subject: template.subject,
      body_html: template.bodyHtml,
      body_json: template.bodyJson as Json,
      is_enabled: true,
    }));

    // Insert all templates
    const { data, error } = await supabase
      .from("email_templates")
      .insert(templateRows)
      .select("id, email_type");

    if (error) {
      console.error("Error seeding email templates:", error);
      return {
        success: false,
        count: 0,
        error: error.message || "Failed to insert templates",
      };
    }

    const insertedCount = data?.length ?? 0;
    console.log(`Successfully seeded ${insertedCount} email templates`);

    return { success: true, count: insertedCount };
  } catch (error) {
    console.error("Error in seedEmailTemplates:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Force reseed all email templates (dangerous - deletes existing templates)
 *
 * Use with caution - this will delete all existing templates and their versions,
 * then insert fresh defaults. Any customizations will be lost.
 *
 * @returns SeedResult with success status and count of inserted templates
 */
export async function forceReseedEmailTemplates(): Promise<SeedResult> {
  try {
    console.log("Force reseeding email templates - deleting existing...");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin() as any;

    // Delete all existing versions first (due to FK constraint)
    const { error: versionsError } = await supabase
      .from("email_template_versions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (versionsError) {
      console.error("Error deleting template versions:", versionsError);
      return {
        success: false,
        count: 0,
        error: versionsError.message || "Failed to delete versions",
      };
    }

    // Delete all existing templates
    const { error: templatesError } = await supabase
      .from("email_templates")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (templatesError) {
      console.error("Error deleting templates:", templatesError);
      return {
        success: false,
        count: 0,
        error: templatesError.message || "Failed to delete templates",
      };
    }

    // Now seed fresh templates
    return await seedEmailTemplates();
  } catch (error) {
    console.error("Error in forceReseedEmailTemplates:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
