/**
 * Email Template Editor Route
 *
 * Server component page for editing individual email templates.
 * Validates the email type, checks admin authorization, seeds templates
 * if needed, and renders the editor component with all required data.
 */

import { notFound, redirect } from "next/navigation";
import { getSessionWithProfile } from "@/lib/auth/server";
import {
  getEmailTemplateByType,
  getEmailTemplateVersions,
} from "@/lib/email-templates/queries";
import { seedEmailTemplates } from "@/lib/email-templates/seed";
import { getFirmSettings } from "@/lib/data/queries";
import { TemplateEditorPage } from "@/components/email-templates/template-editor-page";
import { EMAIL_TEMPLATE_TYPES, type EmailTemplateType } from "@/lib/email-templates/types";

// ============================================================================
// Types
// ============================================================================

interface PageProps {
  params: Promise<{ emailType: string }>;
}

// ============================================================================
// Page Component
// ============================================================================

export default async function EmailTemplateEditorRoute({ params }: PageProps) {
  const { emailType } = await params;

  // Validate emailType is one of the 16 valid types
  if (!EMAIL_TEMPLATE_TYPES.includes(emailType as EmailTemplateType)) {
    notFound();
  }

  const validEmailType = emailType as EmailTemplateType;

  // Check authentication - must be admin
  const { profile } = await getSessionWithProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/settings");
  }

  // Seed templates if they don't exist yet
  await seedEmailTemplates();

  // Fetch the template by type
  const template = await getEmailTemplateByType(validEmailType);
  if (!template) {
    notFound();
  }

  // Fetch version history for this template
  const versions = await getEmailTemplateVersions(template.id);

  // Get firm settings for practice name in preview
  const firmSettings = await getFirmSettings();

  return (
    <TemplateEditorPage
      template={template}
      versions={versions}
      practiceName={firmSettings.firm_name}
    />
  );
}
