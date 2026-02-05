# Email Template Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admins to edit email templates via a WYSIWYG editor with draggable placeholder tokens, enable/disable emails per action, and view version history.

**Architecture:** Database-stored templates with TipTap WYSIWYG editor. Templates are seeded from existing React Email `.tsx` files. The email service checks the DB first, falls back to hardcoded templates. Version history tracks all edits.

**Tech Stack:** TipTap editor, Supabase (production), Next.js Server Actions, React Email for preview rendering.

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260205000001_email_templates.sql`

**Step 1: Write the migration SQL**

```sql
-- Email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_json JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email template versions for history
CREATE TABLE email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(user_id)
);

-- Index for fast version lookups
CREATE INDEX idx_email_template_versions_template_id ON email_template_versions(template_id);
CREATE INDEX idx_email_template_versions_version ON email_template_versions(template_id, version DESC);

-- RLS policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;

-- Admin-only access for templates
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  USING (current_user_role() = 'admin');

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

-- Admin-only access for versions
CREATE POLICY "Admins can view email template versions"
  ON email_template_versions FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "Admins can insert email template versions"
  ON email_template_versions FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

-- Updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE email_templates IS 'Customizable email templates for system notifications';
COMMENT ON TABLE email_template_versions IS 'Version history for email template edits';
```

**Step 2: Apply migration to production Supabase**

Run via MCP: `mcp__supabase-therapy__apply_migration`

**Step 3: Verify tables exist**

Run via MCP: `mcp__supabase-therapy__list_tables` and confirm `email_templates` and `email_template_versions` appear.

**Step 4: Commit**

```bash
git add supabase/migrations/20260205000001_email_templates.sql
git commit -m "feat(db): add email_templates and email_template_versions tables"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/lib/email-templates/types.ts`
- Modify: `src/types/database.types.ts` (regenerate)

**Step 1: Create types file**

```typescript
// src/lib/email-templates/types.ts

import type { JSONContent } from "@tiptap/core";

/**
 * Email types that can be customized
 */
export type EmailTemplateType =
  | "matter_created"
  | "invoice_sent"
  | "invoice_reminder"
  | "task_assigned"
  | "task_response_submitted"
  | "task_approved"
  | "task_revision_requested"
  | "intake_reminder"
  | "intake_submitted"
  | "intake_declined"
  | "client_activity_reminder"
  | "lawyer_activity_reminder"
  | "payment_received"
  | "info_request"
  | "info_request_response"
  | "user_invitation";

/**
 * Email template from database
 */
export interface EmailTemplate {
  id: string;
  emailType: EmailTemplateType;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email template version for history
 */
export interface EmailTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
  createdAt: string;
  createdBy: string | null;
  createdByName?: string;
}

/**
 * Row from database (snake_case)
 */
export interface EmailTemplateRow {
  id: string;
  email_type: string;
  name: string;
  subject: string;
  body_html: string;
  body_json: JSONContent;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Version row from database (snake_case)
 */
export interface EmailTemplateVersionRow {
  id: string;
  template_id: string;
  version: number;
  subject: string;
  body_html: string;
  body_json: JSONContent;
  created_at: string;
  created_by: string | null;
}

/**
 * Transform DB row to app type
 */
export function toEmailTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    emailType: row.email_type as EmailTemplateType,
    name: row.name,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyJson: row.body_json,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transform version row to app type
 */
export function toEmailTemplateVersion(row: EmailTemplateVersionRow): EmailTemplateVersion {
  return {
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyJson: row.body_json,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/email-templates/types.ts
git commit -m "feat: add email template TypeScript types"
```

---

## Task 3: Placeholder Definitions

**Files:**
- Create: `src/lib/email-templates/placeholders.ts`

**Step 1: Create placeholders file**

```typescript
// src/lib/email-templates/placeholders.ts

import type { EmailTemplateType } from "./types";

/**
 * Placeholder token definition
 */
export interface PlaceholderToken {
  token: string;
  label: string;
  description: string;
  category: "practice" | "client" | "matter" | "invoice" | "task" | "system";
}

/**
 * All available placeholder tokens
 */
export const PLACEHOLDER_TOKENS: PlaceholderToken[] = [
  // Practice
  { token: "practiceName", label: "Practice Name", description: "Your firm name", category: "practice" },
  { token: "practiceLogo", label: "Practice Logo", description: "Your firm logo image", category: "practice" },
  { token: "practiceEmail", label: "Practice Email", description: "Contact email address", category: "practice" },
  { token: "practicePhone", label: "Practice Phone", description: "Contact phone number", category: "practice" },
  { token: "practiceAddress", label: "Practice Address", description: "Office address", category: "practice" },

  // Client
  { token: "clientName", label: "Client Name", description: "Client's full name", category: "client" },
  { token: "clientEmail", label: "Client Email", description: "Client's email address", category: "client" },

  // Matter
  { token: "matterTitle", label: "Matter Title", description: "Name of the matter", category: "matter" },
  { token: "matterType", label: "Matter Type", description: "Type of matter (e.g., Contract Review)", category: "matter" },
  { token: "lawyerName", label: "Lawyer Name", description: "Assigned lawyer's name", category: "matter" },

  // Invoice
  { token: "invoiceAmount", label: "Invoice Amount", description: "Total invoice amount formatted", category: "invoice" },
  { token: "invoiceNumber", label: "Invoice Number", description: "Invoice reference number", category: "invoice" },
  { token: "dueDate", label: "Due Date", description: "Payment or task due date", category: "invoice" },
  { token: "paymentLink", label: "Payment Link", description: "Square payment URL", category: "invoice" },

  // Task
  { token: "taskTitle", label: "Task Title", description: "Name of the task", category: "task" },
  { token: "taskLink", label: "Task Link", description: "Link to view the task", category: "task" },
  { token: "intakeLink", label: "Intake Link", description: "Link to intake form", category: "task" },

  // System
  { token: "currentYear", label: "Current Year", description: "Current year (e.g., 2026)", category: "system" },
];

/**
 * Which placeholders are available for each email type
 */
export const PLACEHOLDER_AVAILABILITY: Record<EmailTemplateType, string[]> = {
  matter_created: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "matterType", "lawyerName", "intakeLink", "currentYear"
  ],
  invoice_sent: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "invoiceAmount", "invoiceNumber", "dueDate", "paymentLink", "currentYear"
  ],
  invoice_reminder: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "invoiceAmount", "invoiceNumber", "dueDate", "paymentLink", "currentYear"
  ],
  task_assigned: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "taskTitle", "taskLink", "dueDate", "currentYear"
  ],
  task_response_submitted: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "matterTitle", "taskTitle", "lawyerName", "currentYear"
  ],
  task_approved: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "taskTitle", "currentYear"
  ],
  task_revision_requested: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "taskTitle", "taskLink", "currentYear"
  ],
  intake_reminder: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "intakeLink", "currentYear"
  ],
  intake_submitted: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "matterTitle", "lawyerName", "currentYear"
  ],
  intake_declined: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "lawyerName", "currentYear"
  ],
  client_activity_reminder: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "currentYear"
  ],
  lawyer_activity_reminder: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "lawyerName", "matterTitle", "currentYear"
  ],
  payment_received: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "matterTitle", "invoiceAmount", "invoiceNumber", "currentYear"
  ],
  info_request: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "lawyerName", "currentYear"
  ],
  info_request_response: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "matterTitle", "lawyerName", "currentYear"
  ],
  user_invitation: [
    "practiceName", "practiceLogo", "practiceEmail", "practicePhone", "practiceAddress",
    "clientName", "clientEmail", "lawyerName", "currentYear"
  ],
};

/**
 * Get available placeholders for an email type
 */
export function getAvailablePlaceholders(emailType: EmailTemplateType): PlaceholderToken[] {
  const available = PLACEHOLDER_AVAILABILITY[emailType] || [];
  return PLACEHOLDER_TOKENS.filter((p) => available.includes(p.token));
}

/**
 * Get unavailable (grayed out) placeholders for an email type
 */
export function getUnavailablePlaceholders(emailType: EmailTemplateType): PlaceholderToken[] {
  const available = PLACEHOLDER_AVAILABILITY[emailType] || [];
  return PLACEHOLDER_TOKENS.filter((p) => !available.includes(p.token));
}

/**
 * Group placeholders by category
 */
export function groupPlaceholdersByCategory(tokens: PlaceholderToken[]): Record<string, PlaceholderToken[]> {
  return tokens.reduce((acc, token) => {
    if (!acc[token.category]) {
      acc[token.category] = [];
    }
    acc[token.category].push(token);
    return acc;
  }, {} as Record<string, PlaceholderToken[]>);
}
```

**Step 2: Commit**

```bash
git add src/lib/email-templates/placeholders.ts
git commit -m "feat: add placeholder token definitions for email templates"
```

---

## Task 4: Database Queries

**Files:**
- Create: `src/lib/email-templates/queries.ts`

**Step 1: Create queries file**

```typescript
// src/lib/email-templates/queries.ts

import { supabaseAdmin } from "@/lib/supabase/server";
import type { EmailTemplate, EmailTemplateVersion, EmailTemplateType, EmailTemplateRow, EmailTemplateVersionRow } from "./types";
import { toEmailTemplate, toEmailTemplateVersion } from "./types";

/**
 * Get all email templates
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching email templates:", error);
    return [];
  }

  return (data as EmailTemplateRow[]).map(toEmailTemplate);
}

/**
 * Get a single email template by type
 */
export async function getEmailTemplateByType(emailType: EmailTemplateType): Promise<EmailTemplate | null> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("email_type", emailType)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching email template:", error);
    return null;
  }

  return toEmailTemplate(data as EmailTemplateRow);
}

/**
 * Get a single email template by ID
 */
export async function getEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching email template:", error);
    return null;
  }

  return toEmailTemplate(data as EmailTemplateRow);
}

/**
 * Get version history for a template
 */
export async function getEmailTemplateVersions(templateId: string): Promise<EmailTemplateVersion[]> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("email_template_versions")
    .select(`
      *,
      profiles:created_by (full_name)
    `)
    .eq("template_id", templateId)
    .order("version", { ascending: false });

  if (error) {
    console.error("Error fetching template versions:", error);
    return [];
  }

  return data.map((row: any) => ({
    ...toEmailTemplateVersion(row as EmailTemplateVersionRow),
    createdByName: row.profiles?.full_name || null,
  }));
}

/**
 * Get a specific version
 */
export async function getEmailTemplateVersion(
  templateId: string,
  version: number
): Promise<EmailTemplateVersion | null> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("email_template_versions")
    .select(`
      *,
      profiles:created_by (full_name)
    `)
    .eq("template_id", templateId)
    .eq("version", version)
    .single();

  if (error) {
    console.error("Error fetching template version:", error);
    return null;
  }

  return {
    ...toEmailTemplateVersion(data as EmailTemplateVersionRow),
    createdByName: (data as any).profiles?.full_name || null,
  };
}

/**
 * Check if templates have been seeded
 */
export async function areTemplatesSeeded(): Promise<boolean> {
  const supabase = supabaseAdmin();

  const { count, error } = await supabase
    .from("email_templates")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error checking templates:", error);
    return false;
  }

  return (count || 0) > 0;
}
```

**Step 2: Commit**

```bash
git add src/lib/email-templates/queries.ts
git commit -m "feat: add email template query functions"
```

---

## Task 5: Server Actions

**Files:**
- Create: `src/lib/email-templates/actions.ts`

**Step 1: Create actions file**

```typescript
// src/lib/email-templates/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import type { EmailTemplateType } from "./types";
import type { JSONContent } from "@tiptap/core";

interface SaveTemplateParams {
  emailType: EmailTemplateType;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Save/update an email template (creates version history)
 */
export async function saveEmailTemplate(params: SaveTemplateParams): Promise<ActionResult> {
  const { profile } = await getSessionWithProfile();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = supabaseAdmin();

  // Get current template
  const { data: existing } = await supabase
    .from("email_templates")
    .select("id")
    .eq("email_type", params.emailType)
    .single();

  if (!existing) {
    return { success: false, error: "Template not found" };
  }

  // Get latest version number
  const { data: latestVersion } = await supabase
    .from("email_template_versions")
    .select("version")
    .eq("template_id", existing.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latestVersion?.version || 0) + 1;

  // Insert new version
  const { error: versionError } = await supabase
    .from("email_template_versions")
    .insert({
      template_id: existing.id,
      version: nextVersion,
      subject: params.subject,
      body_html: params.bodyHtml,
      body_json: params.bodyJson,
      created_by: profile.user_id,
    });

  if (versionError) {
    console.error("Error creating version:", versionError);
    return { success: false, error: "Failed to save version" };
  }

  // Update main template
  const { error: updateError } = await supabase
    .from("email_templates")
    .update({
      subject: params.subject,
      body_html: params.bodyHtml,
      body_json: params.bodyJson,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    console.error("Error updating template:", updateError);
    return { success: false, error: "Failed to update template" };
  }

  // Log to audit
  await supabase.from("audit_logs").insert({
    actor_id: profile.user_id,
    event_type: "email_template_updated",
    entity_type: "email_template",
    entity_id: existing.id,
    metadata: {
      email_type: params.emailType,
      version: nextVersion,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Toggle email template enabled/disabled
 */
export async function toggleEmailTemplate(emailType: EmailTemplateType): Promise<ActionResult> {
  const { profile } = await getSessionWithProfile();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = supabaseAdmin();

  // Get current state
  const { data: existing } = await supabase
    .from("email_templates")
    .select("id, is_enabled")
    .eq("email_type", emailType)
    .single();

  if (!existing) {
    return { success: false, error: "Template not found" };
  }

  // Toggle
  const { error } = await supabase
    .from("email_templates")
    .update({
      is_enabled: !existing.is_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    console.error("Error toggling template:", error);
    return { success: false, error: "Failed to toggle template" };
  }

  // Log to audit
  await supabase.from("audit_logs").insert({
    actor_id: profile.user_id,
    event_type: existing.is_enabled ? "email_template_disabled" : "email_template_enabled",
    entity_type: "email_template",
    entity_id: existing.id,
    metadata: { email_type: emailType },
  });

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Restore a previous version
 */
export async function restoreEmailTemplateVersion(
  templateId: string,
  version: number
): Promise<ActionResult> {
  const { profile } = await getSessionWithProfile();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = supabaseAdmin();

  // Get the version to restore
  const { data: versionData } = await supabase
    .from("email_template_versions")
    .select("*")
    .eq("template_id", templateId)
    .eq("version", version)
    .single();

  if (!versionData) {
    return { success: false, error: "Version not found" };
  }

  // Get template info
  const { data: template } = await supabase
    .from("email_templates")
    .select("email_type")
    .eq("id", templateId)
    .single();

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Save as new version (restore = save current state first, then apply old)
  return saveEmailTemplate({
    emailType: template.email_type as EmailTemplateType,
    subject: versionData.subject,
    bodyHtml: versionData.body_html,
    bodyJson: versionData.body_json,
  });
}

/**
 * Send a test email to the current user
 */
export async function sendTestEmail(emailType: EmailTemplateType): Promise<ActionResult> {
  const { session, profile } = await getSessionWithProfile();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = supabaseAdmin();

  // Get template
  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("email_type", emailType)
    .single();

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Import dynamically to avoid circular deps
  const { renderEmailWithPlaceholders } = await import("./renderer");
  const { sendEmail } = await import("@/lib/email/service");
  const { getFirmSettings, getPracticeSettings } = await import("@/lib/data/queries");

  const firmSettings = await getFirmSettings();
  const { data: practiceSettings } = await getPracticeSettings();

  // Sample data for test
  const sampleData = {
    practiceName: firmSettings.firm_name,
    practiceLogo: firmSettings.logo_url || "",
    practiceEmail: practiceSettings?.contact_email || "",
    practicePhone: practiceSettings?.contact_phone || "",
    practiceAddress: practiceSettings?.address || "",
    clientName: "Test Client",
    clientEmail: session?.user?.email || "test@example.com",
    matterTitle: "Sample Matter",
    matterType: "Contract Review",
    lawyerName: profile.full_name || "Your Name",
    invoiceAmount: "$1,500.00",
    invoiceNumber: "INV-001",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    paymentLink: "https://example.com/pay",
    taskTitle: "Sample Task",
    taskLink: "https://example.com/task",
    intakeLink: "https://example.com/intake",
    currentYear: new Date().getFullYear().toString(),
  };

  const html = renderEmailWithPlaceholders(template.body_html, sampleData);
  const subject = renderEmailWithPlaceholders(template.subject, sampleData);

  const result = await sendEmail({
    to: session?.user?.email || "",
    subject: `[TEST] ${subject}`,
    html,
    metadata: {
      type: emailType as any,
      recipientRole: "lawyer",
    },
  });

  if (!result.success) {
    return { success: false, error: result.error || "Failed to send test email" };
  }

  return { success: true };
}
```

**Step 2: Commit**

```bash
git add src/lib/email-templates/actions.ts
git commit -m "feat: add email template server actions"
```

---

## Task 6: Placeholder Renderer

**Files:**
- Create: `src/lib/email-templates/renderer.ts`

**Step 1: Create renderer file**

```typescript
// src/lib/email-templates/renderer.ts

/**
 * Data that can be passed to render placeholders
 */
export interface PlaceholderData {
  practiceName?: string;
  practiceLogo?: string;
  practiceEmail?: string;
  practicePhone?: string;
  practiceAddress?: string;
  clientName?: string;
  clientEmail?: string;
  matterTitle?: string;
  matterType?: string;
  lawyerName?: string;
  invoiceAmount?: string;
  invoiceNumber?: string;
  dueDate?: string;
  paymentLink?: string;
  taskTitle?: string;
  taskLink?: string;
  intakeLink?: string;
  currentYear?: string;
  [key: string]: string | undefined;
}

/**
 * Replace {{placeholder}} tokens with actual values
 * Returns empty string for missing values (as per design)
 */
export function renderEmailWithPlaceholders(
  template: string,
  data: PlaceholderData
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] ?? "";
  });
}

/**
 * Extract all placeholder tokens from a template string
 */
export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/**
 * Validate that all required placeholders have data
 */
export function validatePlaceholders(
  template: string,
  data: PlaceholderData
): { valid: boolean; missing: string[] } {
  const placeholders = extractPlaceholders(template);
  const missing = placeholders.filter((key) => !data[key]);
  return {
    valid: missing.length === 0,
    missing,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/email-templates/renderer.ts
git commit -m "feat: add placeholder renderer for email templates"
```

---

## Task 7: Default Template Seeding

**Files:**
- Create: `src/lib/email-templates/seed.ts`
- Create: `src/lib/email-templates/defaults/index.ts`

**Step 1: Create default templates data**

```typescript
// src/lib/email-templates/defaults/index.ts

import type { EmailTemplateType } from "../types";
import type { JSONContent } from "@tiptap/core";

interface DefaultTemplate {
  emailType: EmailTemplateType;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
}

/**
 * Helper to create a simple TipTap doc from paragraphs
 */
function createDoc(paragraphs: string[]): JSONContent {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    emailType: "matter_created",
    name: "Matter Created",
    subject: "Welcome! Your matter \"{{matterTitle}}\" has been created",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>Welcome! We're ready to start working on your {{matterType}}.</p>
<p>To get started, please complete your intake form. This helps us understand your situation and provide the best possible service.</p>
<p><strong>What to expect:</strong></p>
<ul>
<li>Takes about 10-15 minutes</li>
<li>You can save your progress anytime</li>
<li>We'll review it within 2 business days</li>
</ul>
<p><a href="{{intakeLink}}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Complete Intake Form</a></p>
<p>Questions? Reply to this email or contact {{lawyerName}} directly.</p>
<p>Thank you,<br/>{{lawyerName}}</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "Welcome! We're ready to start working on your {{matterType}}.",
      "To get started, please complete your intake form. This helps us understand your situation and provide the best possible service.",
      "",
      "Questions? Reply to this email or contact {{lawyerName}} directly.",
      "",
      "Thank you,",
      "{{lawyerName}}",
    ]),
  },
  {
    emailType: "invoice_sent",
    name: "Invoice Sent",
    subject: "Invoice for {{matterTitle}} - {{invoiceAmount}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>Please find your invoice for {{matterTitle}}.</p>
<p><strong>Invoice Details:</strong></p>
<ul>
<li>Amount: {{invoiceAmount}}</li>
<li>Due Date: {{dueDate}}</li>
<li>Invoice #: {{invoiceNumber}}</li>
</ul>
<p><a href="{{paymentLink}}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Pay Now</a></p>
<p>Thank you for your business.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "Please find your invoice for {{matterTitle}}.",
      "",
      "Thank you for your business.",
    ]),
  },
  {
    emailType: "invoice_reminder",
    name: "Invoice Reminder",
    subject: "Payment Reminder: {{matterTitle}} - {{invoiceAmount}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>This is a friendly reminder that your invoice for {{matterTitle}} is due.</p>
<p><strong>Invoice Details:</strong></p>
<ul>
<li>Amount: {{invoiceAmount}}</li>
<li>Due Date: {{dueDate}}</li>
</ul>
<p><a href="{{paymentLink}}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Pay Now</a></p>
<p>If you've already paid, please disregard this message.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "This is a friendly reminder that your invoice for {{matterTitle}} is due.",
      "",
      "If you've already paid, please disregard this message.",
    ]),
  },
  {
    emailType: "task_assigned",
    name: "Task Assigned",
    subject: "New task: {{taskTitle}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>You have a new task for {{matterTitle}}:</p>
<p><strong>{{taskTitle}}</strong></p>
<p>Due: {{dueDate}}</p>
<p><a href="{{taskLink}}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">View Task</a></p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "You have a new task for {{matterTitle}}:",
      "{{taskTitle}}",
      "Due: {{dueDate}}",
    ]),
  },
  {
    emailType: "task_response_submitted",
    name: "Task Response Submitted",
    subject: "Client response: {{taskTitle}}",
    bodyHtml: `
<p>Hi {{lawyerName}},</p>
<p>{{clientName}} has submitted a response for the task "{{taskTitle}}" on matter {{matterTitle}}.</p>
<p>Please review their submission at your earliest convenience.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{lawyerName}},",
      "{{clientName}} has submitted a response for the task \"{{taskTitle}}\" on matter {{matterTitle}}.",
      "Please review their submission at your earliest convenience.",
    ]),
  },
  {
    emailType: "task_approved",
    name: "Task Approved",
    subject: "Task completed: {{taskTitle}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>Great news! Your submission for "{{taskTitle}}" has been approved.</p>
<p>Thank you for completing this task for {{matterTitle}}.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "Great news! Your submission for \"{{taskTitle}}\" has been approved.",
      "Thank you for completing this task for {{matterTitle}}.",
    ]),
  },
  {
    emailType: "task_revision_requested",
    name: "Task Revision Requested",
    subject: "Action needed: {{taskTitle}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>We need some changes to your submission for "{{taskTitle}}" on {{matterTitle}}.</p>
<p><a href="{{taskLink}}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">View Details</a></p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "We need some changes to your submission for \"{{taskTitle}}\" on {{matterTitle}}.",
    ]),
  },
  {
    emailType: "intake_reminder",
    name: "Intake Reminder",
    subject: "Reminder: Complete your intake form for {{matterTitle}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>We noticed you haven't completed your intake form for {{matterTitle}} yet.</p>
<p>Please complete it at your earliest convenience so we can move forward with your matter.</p>
<p><a href="{{intakeLink}}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Complete Intake Form</a></p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "We noticed you haven't completed your intake form for {{matterTitle}} yet.",
      "Please complete it at your earliest convenience so we can move forward with your matter.",
    ]),
  },
  {
    emailType: "intake_submitted",
    name: "Intake Submitted",
    subject: "Intake Form Submitted - {{clientName}}",
    bodyHtml: `
<p>Hi {{lawyerName}},</p>
<p>{{clientName}} has submitted their intake form.</p>
<p>Please review their submission and take appropriate next steps.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{lawyerName}},",
      "{{clientName}} has submitted their intake form.",
      "Please review their submission and take appropriate next steps.",
    ]),
  },
  {
    emailType: "intake_declined",
    name: "Intake Declined",
    subject: "Update regarding {{matterTitle}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>Thank you for submitting your intake form for {{matterTitle}}.</p>
<p>After careful review, we are unable to take on this matter at this time.</p>
<p>If you have questions, please contact {{lawyerName}}.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "Thank you for submitting your intake form for {{matterTitle}}.",
      "After careful review, we are unable to take on this matter at this time.",
      "If you have questions, please contact {{lawyerName}}.",
    ]),
  },
  {
    emailType: "client_activity_reminder",
    name: "Client Activity Reminder",
    subject: "Reminder: {{matterTitle}} needs attention",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>Your matter "{{matterTitle}}" needs your attention.</p>
<p>Please log in to check for any pending tasks or updates.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "Your matter \"{{matterTitle}}\" needs your attention.",
      "Please log in to check for any pending tasks or updates.",
    ]),
  },
  {
    emailType: "lawyer_activity_reminder",
    name: "Lawyer Activity Reminder",
    subject: "Reminder: {{matterTitle}} needs attention",
    bodyHtml: `
<p>Hi {{lawyerName}},</p>
<p>The matter "{{matterTitle}}" has been idle and may need your attention.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{lawyerName}},",
      "The matter \"{{matterTitle}}\" has been idle and may need your attention.",
    ]),
  },
  {
    emailType: "payment_received",
    name: "Payment Received",
    subject: "Payment Received - Thank You!",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>We've received your payment of {{invoiceAmount}} for invoice {{invoiceNumber}}.</p>
<p>Thank you for your prompt payment!</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "We've received your payment of {{invoiceAmount}} for invoice {{invoiceNumber}}.",
      "Thank you for your prompt payment!",
    ]),
  },
  {
    emailType: "info_request",
    name: "Information Request",
    subject: "Additional Information Needed - {{lawyerName}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>{{lawyerName}} needs some additional information from you.</p>
<p>Please respond at your earliest convenience.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "{{lawyerName}} needs some additional information from you.",
      "Please respond at your earliest convenience.",
    ]),
  },
  {
    emailType: "info_request_response",
    name: "Info Response Received",
    subject: "Client Response Received - {{clientName}}",
    bodyHtml: `
<p>Hi {{lawyerName}},</p>
<p>{{clientName}} has responded to your information request for {{matterTitle}}.</p>
<p>Please review their response.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{lawyerName}},",
      "{{clientName}} has responded to your information request for {{matterTitle}}.",
      "Please review their response.",
    ]),
  },
  {
    emailType: "user_invitation",
    name: "User Invitation",
    subject: "You've been invited to {{practiceName}}",
    bodyHtml: `
<p>Hi {{clientName}},</p>
<p>You've been invited to join {{practiceName}} by {{lawyerName}}.</p>
<p>Click the button below to set up your account.</p>
    `.trim(),
    bodyJson: createDoc([
      "Hi {{clientName}},",
      "You've been invited to join {{practiceName}} by {{lawyerName}}.",
      "Click the button below to set up your account.",
    ]),
  },
];
```

**Step 2: Create seed function**

```typescript
// src/lib/email-templates/seed.ts

import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES } from "./defaults";
import { areTemplatesSeeded } from "./queries";

/**
 * Seed default email templates into the database
 * Only runs if templates haven't been seeded yet
 */
export async function seedEmailTemplates(): Promise<{ success: boolean; count: number }> {
  // Check if already seeded
  const seeded = await areTemplatesSeeded();
  if (seeded) {
    return { success: true, count: 0 };
  }

  const supabase = supabaseAdmin();

  // Insert all default templates
  const { error } = await supabase.from("email_templates").insert(
    DEFAULT_TEMPLATES.map((t) => ({
      email_type: t.emailType,
      name: t.name,
      subject: t.subject,
      body_html: t.bodyHtml,
      body_json: t.bodyJson,
      is_enabled: true,
    }))
  );

  if (error) {
    console.error("Error seeding templates:", error);
    return { success: false, count: 0 };
  }

  return { success: true, count: DEFAULT_TEMPLATES.length };
}
```

**Step 3: Commit**

```bash
git add src/lib/email-templates/defaults/index.ts src/lib/email-templates/seed.ts
git commit -m "feat: add default email templates and seeding function"
```

---

## Task 8: Install TipTap

**Step 1: Install TipTap packages**

```bash
cd /Users/brian/dev/therapy/.worktrees/email-template-editor
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-image
```

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install TipTap editor packages"
```

---

## Task 9: TipTap Placeholder Extension

**Files:**
- Create: `src/components/email-templates/tiptap/placeholder-extension.ts`

**Step 1: Create custom placeholder node extension**

```typescript
// src/components/email-templates/tiptap/placeholder-extension.ts

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PlaceholderNodeView } from "./placeholder-node-view";

export interface PlaceholderOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    placeholderToken: {
      insertPlaceholder: (token: string) => ReturnType;
    };
  }
}

export const PlaceholderToken = Node.create<PlaceholderOptions>({
  name: "placeholderToken",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      token: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-token"),
        renderHTML: (attributes) => ({
          "data-token": attributes.token,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="placeholder"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-type": "placeholder" },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `{{${node.attrs.token}}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PlaceholderNodeView);
  },

  addCommands() {
    return {
      insertPlaceholder:
        (token: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { token },
          });
        },
    };
  },
});
```

**Step 2: Commit**

```bash
git add src/components/email-templates/tiptap/placeholder-extension.ts
git commit -m "feat: add TipTap placeholder token extension"
```

---

## Task 10: Placeholder Node View Component

**Files:**
- Create: `src/components/email-templates/tiptap/placeholder-node-view.tsx`

**Step 1: Create the React node view**

```tsx
// src/components/email-templates/tiptap/placeholder-node-view.tsx
"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { PLACEHOLDER_TOKENS } from "@/lib/email-templates/placeholders";

interface PlaceholderNodeViewProps {
  node: {
    attrs: {
      token: string;
    };
  };
}

export function PlaceholderNodeView({ node }: PlaceholderNodeViewProps) {
  const token = node.attrs.token;
  const placeholder = PLACEHOLDER_TOKENS.find((p) => p.token === token);

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-default"
        title={placeholder?.description || token}
      >
        {placeholder?.label || token}
      </span>
    </NodeViewWrapper>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/email-templates/tiptap/placeholder-node-view.tsx
git commit -m "feat: add placeholder node view component"
```

---

## Task 11: TipTap Editor Component

**Files:**
- Create: `src/components/email-templates/tiptap-editor.tsx`

**Step 1: Create the editor component**

```tsx
// src/components/email-templates/tiptap-editor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { PlaceholderToken } from "./tiptap/placeholder-extension";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
} from "lucide-react";
import type { JSONContent, Editor } from "@tiptap/core";
import { useCallback } from "react";

interface TiptapEditorProps {
  content: JSONContent;
  onChange: (html: string, json: JSONContent) => void;
  placeholder?: string;
}

export function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Start typing...",
      }),
      PlaceholderToken,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-slate-200" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-slate-200" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-slate-200" : ""}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setLink}
          className={editor.isActive("link") ? "bg-slate-200" : ""}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-slate-200" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-slate-200" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

// Export editor ref for inserting placeholders
export function useTiptapEditor() {
  return useEditor;
}
```

**Step 2: Commit**

```bash
git add src/components/email-templates/tiptap-editor.tsx
git commit -m "feat: add TipTap WYSIWYG editor component"
```

---

## Task 12: Placeholder Sidebar Component

**Files:**
- Create: `src/components/email-templates/placeholder-sidebar.tsx`

**Step 1: Create sidebar component**

```tsx
// src/components/email-templates/placeholder-sidebar.tsx
"use client";

import {
  getAvailablePlaceholders,
  getUnavailablePlaceholders,
  groupPlaceholdersByCategory,
  type PlaceholderToken
} from "@/lib/email-templates/placeholders";
import type { EmailTemplateType } from "@/lib/email-templates/types";
import { cn } from "@/lib/utils";

interface PlaceholderSidebarProps {
  emailType: EmailTemplateType;
  onInsert: (token: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  practice: "Practice",
  client: "Client",
  matter: "Matter",
  invoice: "Invoice",
  task: "Task",
  system: "System",
};

export function PlaceholderSidebar({ emailType, onInsert }: PlaceholderSidebarProps) {
  const available = getAvailablePlaceholders(emailType);
  const unavailable = getUnavailablePlaceholders(emailType);

  const availableGrouped = groupPlaceholdersByCategory(available);
  const unavailableGrouped = groupPlaceholdersByCategory(unavailable);

  const renderToken = (token: PlaceholderToken, isAvailable: boolean) => (
    <button
      key={token.token}
      type="button"
      onClick={() => isAvailable && onInsert(token.token)}
      disabled={!isAvailable}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
        isAvailable
          ? "hover:bg-blue-50 cursor-pointer"
          : "opacity-50 cursor-not-allowed"
      )}
      title={isAvailable ? `Click to insert {{${token.token}}}` : "Not available for this email type"}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            isAvailable
              ? "bg-blue-100 text-blue-800"
              : "bg-slate-100 text-slate-500"
          )}
        >
          {token.label}
        </span>
      </div>
      <p className={cn(
        "text-xs mt-1",
        isAvailable ? "text-slate-500" : "text-slate-400"
      )}>
        {token.description}
      </p>
    </button>
  );

  const renderCategory = (
    category: string,
    tokens: PlaceholderToken[],
    isAvailable: boolean
  ) => {
    if (!tokens || tokens.length === 0) return null;

    return (
      <div key={category} className="space-y-1">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-1">
          {CATEGORY_LABELS[category] || category}
        </h4>
        {tokens.map((token) => renderToken(token, isAvailable))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="px-3">
        <h3 className="text-sm font-medium text-slate-900">Placeholders</h3>
        <p className="text-xs text-slate-500 mt-1">
          Click to insert at cursor position
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(availableGrouped).map(([category, tokens]) =>
          renderCategory(category, tokens, true)
        )}
      </div>

      {Object.keys(unavailableGrouped).length > 0 && (
        <>
          <div className="border-t border-slate-200 mx-3" />
          <div className="px-3">
            <p className="text-xs text-slate-400">
              Not available for this email:
            </p>
          </div>
          <div className="space-y-4 opacity-60">
            {Object.entries(unavailableGrouped).map(([category, tokens]) =>
              renderCategory(category, tokens, false)
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/email-templates/placeholder-sidebar.tsx
git commit -m "feat: add placeholder sidebar component"
```

---

## Task 13: Email Preview Component

**Files:**
- Create: `src/components/email-templates/email-preview.tsx`

**Step 1: Create preview component**

```tsx
// src/components/email-templates/email-preview.tsx
"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderEmailWithPlaceholders } from "@/lib/email-templates/renderer";
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  subject: string;
  bodyHtml: string;
  practiceName?: string;
}

const SAMPLE_DATA = {
  practiceName: "Acme Law Firm",
  practiceLogo: "",
  practiceEmail: "contact@acmelaw.com",
  practicePhone: "(555) 123-4567",
  practiceAddress: "123 Legal St, Suite 100, New York, NY 10001",
  clientName: "John Smith",
  clientEmail: "john.smith@example.com",
  matterTitle: "Contract Review - ABC Corp",
  matterType: "Contract Review",
  lawyerName: "Jane Attorney",
  invoiceAmount: "$2,500.00",
  invoiceNumber: "INV-2026-001",
  dueDate: "February 19, 2026",
  paymentLink: "#",
  taskTitle: "Review Draft Agreement",
  taskLink: "#",
  intakeLink: "#",
  currentYear: "2026",
};

export function EmailPreview({ subject, bodyHtml, practiceName }: EmailPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const sampleData = {
    ...SAMPLE_DATA,
    practiceName: practiceName || SAMPLE_DATA.practiceName,
  };

  const renderedSubject = renderEmailWithPlaceholders(subject, sampleData);
  const renderedBody = renderEmailWithPlaceholders(bodyHtml, sampleData);

  return (
    <div className="space-y-4">
      {/* Device Toggle */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDevice("desktop")}
          className={device === "desktop" ? "bg-slate-100" : ""}
        >
          <Monitor className="h-4 w-4 mr-1" />
          Desktop
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDevice("mobile")}
          className={device === "mobile" ? "bg-slate-100" : ""}
        >
          <Smartphone className="h-4 w-4 mr-1" />
          Mobile
        </Button>
      </div>

      {/* Preview Frame */}
      <div
        className={cn(
          "bg-slate-100 rounded-lg p-4 mx-auto transition-all",
          device === "mobile" ? "max-w-[375px]" : "max-w-full"
        )}
      >
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Email Header */}
          <div className="border-b border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Subject:</div>
            <div className="font-medium text-slate-900">{renderedSubject}</div>
          </div>

          {/* Email Body */}
          <div
            className="p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedBody }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/email-templates/email-preview.tsx
git commit -m "feat: add email preview component with device toggle"
```

---

## Task 14: Version History Drawer

**Files:**
- Create: `src/components/email-templates/version-drawer.tsx`

**Step 1: Create version drawer component**

```tsx
// src/components/email-templates/version-drawer.tsx
"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { restoreEmailTemplateVersion } from "@/lib/email-templates/actions";
import type { EmailTemplateVersion } from "@/lib/email-templates/types";
import { toast } from "sonner";

interface VersionDrawerProps {
  templateId: string;
  versions: EmailTemplateVersion[];
  currentVersion?: number;
}

export function VersionDrawer({ templateId, versions, currentVersion }: VersionDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  const handleRestore = (version: number) => {
    setRestoringVersion(version);
    startTransition(async () => {
      const result = await restoreEmailTemplateVersion(templateId, version);
      if (result.success) {
        toast.success(`Restored to version ${version}`);
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to restore version");
      }
      setRestoringVersion(null);
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Versions
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {versions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No version history yet. Save changes to create versions.
            </p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      Version {version.version}
                    </span>
                    {version.version === currentVersion && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatDistanceToNow(new Date(version.createdAt), {
                      addSuffix: true,
                    })}
                    {version.createdByName && ` by ${version.createdByName}`}
                  </div>
                </div>
                {version.version !== currentVersion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(version.version)}
                    disabled={isPending}
                  >
                    {isPending && restoringVersion === version.version ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/email-templates/version-drawer.tsx
git commit -m "feat: add version history drawer component"
```

---

## Task 15: Template List Component

**Files:**
- Create: `src/components/email-templates/template-list.tsx`

**Step 1: Create template list component**

```tsx
// src/components/email-templates/template-list.tsx
"use client";

import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toggleEmailTemplate } from "@/lib/email-templates/actions";
import type { EmailTemplate } from "@/lib/email-templates/types";
import { toast } from "sonner";

interface TemplateListProps {
  templates: EmailTemplate[];
}

export function TemplateList({ templates }: TemplateListProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (emailType: EmailTemplate["emailType"]) => {
    startTransition(async () => {
      const result = await toggleEmailTemplate(emailType);
      if (!result.success) {
        toast.error(result.error || "Failed to toggle template");
      }
    });
  };

  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <div
          key={template.id}
          className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Switch
              checked={template.isEnabled}
              onCheckedChange={() => handleToggle(template.emailType)}
              disabled={isPending}
            />
            <div>
              <h3 className="font-medium text-slate-900">{template.name}</h3>
              <p className="text-sm text-slate-500">
                {template.updatedAt
                  ? `Last edited ${formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}`
                  : "Never edited"}
              </p>
            </div>
          </div>
          <Link href={`/settings/email-templates/${template.emailType}`}>
            <Button variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/email-templates/template-list.tsx
git commit -m "feat: add email template list component"
```

---

## Task 16: Template Editor Page Component

**Files:**
- Create: `src/components/email-templates/template-editor-page.tsx`

**Step 1: Create the main editor page component**

```tsx
// src/components/email-templates/template-editor-page.tsx
"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "./tiptap-editor";
import { PlaceholderSidebar } from "./placeholder-sidebar";
import { EmailPreview } from "./email-preview";
import { VersionDrawer } from "./version-drawer";
import { saveEmailTemplate, sendTestEmail } from "@/lib/email-templates/actions";
import type { EmailTemplate, EmailTemplateVersion } from "@/lib/email-templates/types";
import type { JSONContent, Editor } from "@tiptap/core";
import { toast } from "sonner";

interface TemplateEditorPageProps {
  template: EmailTemplate;
  versions: EmailTemplateVersion[];
  practiceName?: string;
}

export function TemplateEditorPage({
  template,
  versions,
  practiceName,
}: TemplateEditorPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);

  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [bodyJson, setBodyJson] = useState<JSONContent>(template.bodyJson);
  const [isDirty, setIsDirty] = useState(false);

  const editorRef = useRef<Editor | null>(null);

  const handleEditorChange = useCallback((html: string, json: JSONContent) => {
    setBodyHtml(html);
    setBodyJson(json);
    setIsDirty(true);
  }, []);

  const handleSubjectChange = useCallback((value: string) => {
    setSubject(value);
    setIsDirty(true);
  }, []);

  const handleInsertPlaceholder = useCallback((token: string) => {
    if (editorRef.current) {
      editorRef.current.commands.insertPlaceholder(token);
    } else {
      // Fallback: insert into subject if editor not focused
      setSubject((prev) => `${prev}{{${token}}}`);
      setIsDirty(true);
    }
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveEmailTemplate({
        emailType: template.emailType,
        subject,
        bodyHtml,
        bodyJson,
      });

      if (result.success) {
        toast.success("Template saved");
        setIsDirty(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save template");
      }
    });
  };

  const handleSendTest = async () => {
    setIsSending(true);
    try {
      // Save first if dirty
      if (isDirty) {
        const saveResult = await saveEmailTemplate({
          emailType: template.emailType,
          subject,
          bodyHtml,
          bodyJson,
        });
        if (!saveResult.success) {
          toast.error("Failed to save before sending test");
          return;
        }
        setIsDirty(false);
      }

      const result = await sendTestEmail(template.emailType);
      if (result.success) {
        toast.success("Test email sent! Check your inbox.");
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    } finally {
      setIsSending(false);
    }
  };

  const currentVersion = versions.length > 0 ? versions[0].version : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings?tab=email-templates">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {template.name}
              </h1>
              {isDirty && (
                <span className="text-sm text-amber-600">Unsaved changes</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VersionDrawer
              templateId={template.id}
              versions={versions}
              currentVersion={currentVersion}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test
            </Button>
            <Button onClick={handleSave} disabled={isPending || !isDirty}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3 bg-white rounded-lg border border-slate-200 p-4 h-fit sticky top-24">
            <PlaceholderSidebar
              emailType={template.emailType}
              onInsert={handleInsertPlaceholder}
            />
          </div>

          {/* Editor */}
          <div className="col-span-5 space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <Label htmlFor="subject" className="text-sm font-medium">
                Subject Line
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="mt-2"
                placeholder="Enter email subject..."
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <Label className="text-sm font-medium mb-2 block">
                Email Body
              </Label>
              <TiptapEditor
                content={bodyJson}
                onChange={handleEditorChange}
                placeholder="Start writing your email..."
              />
            </div>
          </div>

          {/* Preview */}
          <div className="col-span-4 bg-white rounded-lg border border-slate-200 p-4 h-fit sticky top-24">
            <h3 className="text-sm font-medium text-slate-900 mb-4">Preview</h3>
            <EmailPreview
              subject={subject}
              bodyHtml={bodyHtml}
              practiceName={practiceName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/email-templates/template-editor-page.tsx
git commit -m "feat: add template editor page component"
```

---

## Task 17: Email Templates Tab in Settings

**Files:**
- Create: `src/app/settings/email-templates-panel.tsx`
- Modify: `src/app/settings/page.tsx`

**Step 1: Create email templates panel**

```tsx
// src/app/settings/email-templates-panel.tsx

import { getEmailTemplates } from "@/lib/email-templates/queries";
import { seedEmailTemplates } from "@/lib/email-templates/seed";
import { TemplateList } from "@/components/email-templates/template-list";

export async function EmailTemplatesPanel() {
  // Ensure templates are seeded
  await seedEmailTemplates();

  // Fetch templates
  const templates = await getEmailTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Email Templates</h2>
        <p className="text-sm text-slate-500 mt-1">
          Customize the emails sent to clients and staff. Toggle to enable/disable each email type.
        </p>
      </div>

      <TemplateList templates={templates} />
    </div>
  );
}
```

**Step 2: Update settings page to add Email Templates tab**

Modify `src/app/settings/page.tsx`:

```tsx
// Add import at top
import { EmailTemplatesPanel } from "./email-templates-panel";

// Update TabsList to add 4th tab (line ~28):
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="profile">Profile</TabsTrigger>
  {isAdmin && <TabsTrigger value="practice">Practice</TabsTrigger>}
  {isAdmin && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
  {isAdmin && <TabsTrigger value="email-templates">Email Templates</TabsTrigger>}
</TabsList>

// Add new TabsContent after integrations (before closing Tabs):
{isAdmin && (
  <TabsContent value="email-templates" className="space-y-4">
    <EmailTemplatesPanel />
  </TabsContent>
)}
```

**Step 3: Commit**

```bash
git add src/app/settings/email-templates-panel.tsx src/app/settings/page.tsx
git commit -m "feat: add Email Templates tab to settings page"
```

---

## Task 18: Template Editor Route

**Files:**
- Create: `src/app/settings/email-templates/[emailType]/page.tsx`

**Step 1: Create the route page**

```tsx
// src/app/settings/email-templates/[emailType]/page.tsx

import { notFound, redirect } from "next/navigation";
import { getSessionWithProfile } from "@/lib/auth/server";
import { getEmailTemplateByType, getEmailTemplateVersions } from "@/lib/email-templates/queries";
import { seedEmailTemplates } from "@/lib/email-templates/seed";
import { getFirmSettings } from "@/lib/data/queries";
import { TemplateEditorPage } from "@/components/email-templates/template-editor-page";
import type { EmailTemplateType } from "@/lib/email-templates/types";

interface PageProps {
  params: Promise<{ emailType: string }>;
}

const VALID_EMAIL_TYPES: EmailTemplateType[] = [
  "matter_created",
  "invoice_sent",
  "invoice_reminder",
  "task_assigned",
  "task_response_submitted",
  "task_approved",
  "task_revision_requested",
  "intake_reminder",
  "intake_submitted",
  "intake_declined",
  "client_activity_reminder",
  "lawyer_activity_reminder",
  "payment_received",
  "info_request",
  "info_request_response",
  "user_invitation",
];

export default async function EmailTemplateEditorPage({ params }: PageProps) {
  const { emailType } = await params;

  // Validate email type
  if (!VALID_EMAIL_TYPES.includes(emailType as EmailTemplateType)) {
    notFound();
  }

  // Check auth
  const { profile } = await getSessionWithProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/settings");
  }

  // Ensure templates are seeded
  await seedEmailTemplates();

  // Fetch template and versions
  const template = await getEmailTemplateByType(emailType as EmailTemplateType);
  if (!template) {
    notFound();
  }

  const versions = await getEmailTemplateVersions(template.id);
  const firmSettings = await getFirmSettings();

  return (
    <TemplateEditorPage
      template={template}
      versions={versions}
      practiceName={firmSettings.firm_name}
    />
  );
}
```

**Step 2: Commit**

```bash
mkdir -p src/app/settings/email-templates/\[emailType\]
git add src/app/settings/email-templates/\[emailType\]/page.tsx
git commit -m "feat: add email template editor route"
```

---

## Task 19: Update Email Service to Use DB Templates

**Files:**
- Modify: `src/lib/email/service.ts`
- Create: `src/lib/email-templates/send.ts`

**Step 1: Create template-aware send function**

```typescript
// src/lib/email-templates/send.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { renderEmailWithPlaceholders, type PlaceholderData } from "./renderer";
import { sendEmail } from "@/lib/email/service";
import type { EmailTemplateType } from "./types";
import type { EmailMetadata } from "@/lib/email/types";

interface SendTemplatedEmailParams {
  emailType: EmailTemplateType;
  to: string | string[];
  data: PlaceholderData;
  metadata?: Omit<EmailMetadata, "type">;
}

interface SendResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send an email using a database template
 * Falls back to returning error if template not found or disabled
 */
export async function sendTemplatedEmail(params: SendTemplatedEmailParams): Promise<SendResult> {
  const supabase = supabaseAdmin();

  // Get template from database
  const { data: template, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("email_type", params.emailType)
    .single();

  if (error || !template) {
    console.error(`Email template not found: ${params.emailType}`);
    return { success: false, error: "Template not found" };
  }

  // Check if enabled
  if (!template.is_enabled) {
    console.log(`Email template disabled: ${params.emailType}`);
    return { success: true, skipped: true };
  }

  // Render with placeholders
  const subject = renderEmailWithPlaceholders(template.subject, params.data);
  const html = wrapInBaseLayout(
    renderEmailWithPlaceholders(template.body_html, params.data),
    params.data
  );

  // Send email
  return sendEmail({
    to: params.to,
    subject,
    html,
    metadata: {
      ...params.metadata,
      type: params.emailType as any,
    },
  });
}

/**
 * Wrap body HTML in base email layout
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
        © ${year} ${practiceName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
```

**Step 2: Commit**

```bash
git add src/lib/email-templates/send.ts
git commit -m "feat: add template-aware email sending function"
```

---

## Task 20: Create Index Export

**Files:**
- Create: `src/lib/email-templates/index.ts`

**Step 1: Create index file**

```typescript
// src/lib/email-templates/index.ts

export * from "./types";
export * from "./placeholders";
export * from "./queries";
export * from "./actions";
export * from "./renderer";
export * from "./send";
```

**Step 2: Commit**

```bash
git add src/lib/email-templates/index.ts
git commit -m "feat: add email-templates module index export"
```

---

## Task 21: Create TipTap Index Export

**Files:**
- Create: `src/components/email-templates/tiptap/index.ts`

**Step 1: Create index file**

```typescript
// src/components/email-templates/tiptap/index.ts

export { PlaceholderToken } from "./placeholder-extension";
export { PlaceholderNodeView } from "./placeholder-node-view";
```

**Step 2: Commit**

```bash
git add src/components/email-templates/tiptap/index.ts
git commit -m "chore: add tiptap components index export"
```

---

## Task 22: Fix TipTap Editor Ref

**Files:**
- Modify: `src/components/email-templates/template-editor-page.tsx`
- Modify: `src/components/email-templates/tiptap-editor.tsx`

**Step 1: Update TipTap editor to expose ref**

Update `tiptap-editor.tsx` to use forwardRef:

```tsx
// Add at top after imports
import { forwardRef, useImperativeHandle } from "react";

// Change component signature:
export const TiptapEditor = forwardRef<
  { insertPlaceholder: (token: string) => void } | null,
  TiptapEditorProps
>(function TiptapEditor({ content, onChange, placeholder }, ref) {
  const editor = useEditor({
    // ... existing config
  });

  useImperativeHandle(ref, () => ({
    insertPlaceholder: (token: string) => {
      editor?.commands.insertPlaceholder(token);
    },
  }), [editor]);

  // ... rest of component
});
```

**Step 2: Update template-editor-page to use ref**

Update `template-editor-page.tsx`:

```tsx
// Change ref type
const editorRef = useRef<{ insertPlaceholder: (token: string) => void } | null>(null);

// Update handleInsertPlaceholder
const handleInsertPlaceholder = useCallback((token: string) => {
  if (editorRef.current) {
    editorRef.current.insertPlaceholder(token);
  }
}, []);

// Add ref to TiptapEditor
<TiptapEditor
  ref={editorRef}
  content={bodyJson}
  onChange={handleEditorChange}
  placeholder="Start writing your email..."
/>
```

**Step 3: Commit**

```bash
git add src/components/email-templates/tiptap-editor.tsx src/components/email-templates/template-editor-page.tsx
git commit -m "fix: expose TipTap editor ref for placeholder insertion"
```

---

## Task 23: Build and Test

**Step 1: Run typecheck**

```bash
cd /Users/brian/dev/therapy/.worktrees/email-template-editor
pnpm typecheck
```

Expected: Pass (or only pre-existing test errors)

**Step 2: Run build**

```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Manual testing checklist**

1. Start dev server: `pnpm dev`
2. Navigate to http://matterflow.local/settings
3. Click "Email Templates" tab
4. Verify template list shows all 16 templates
5. Toggle a template on/off
6. Click Edit on a template
7. Verify placeholders sidebar shows tokens
8. Click a placeholder to insert
9. Modify subject line
10. Verify preview updates
11. Click Save
12. Click Versions to see history
13. Send test email to yourself
14. Check email inbox

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```

---

## Task 24: Final Commit and Summary

**Step 1: Verify all changes are committed**

```bash
git status
git log --oneline -20
```

**Step 2: Push branch**

```bash
git push -u origin feature/email-template-editor
```

**Step 3: Summary**

The email template editor feature is complete:

- Database tables for templates and versions
- TipTap WYSIWYG editor with custom placeholder extension
- Draggable/clickable placeholder tokens
- Live preview with mobile/desktop toggle
- Version history with restore capability
- Enable/disable per template
- Test email functionality
- Integrated into Settings page

Ready for code review and merge.
