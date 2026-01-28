"use server";

import { revalidatePath } from "next/cache";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import type {
  DocumentTemplate,
  TemplateSection,
  TemplateField,
  ConditionRules,
  PackageType,
  TemplateStatus,
  FieldType,
  SourceType,
  OutputType,
  ParsedTemplate,
} from "./types";
import { parseDocumentTemplate } from "./parsing";

type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

const ensureStaffOrAdmin = async () => {
  const { profile, session } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" } as const;
  }
  if (profile?.role === "client") {
    return { error: "Forbidden: clients cannot perform this action" } as const;
  }
  return { session, profile } as const;
};

// ============================================================================
// Template Actions
// ============================================================================

export async function createDocumentTemplate(data: {
  name: string;
  description?: string;
  category?: string;
  originalFileUrl?: string;
}): Promise<ActionResult<DocumentTemplate>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: template, error } = await supabase
    .from("document_templates")
    .insert({
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      original_file_url: data.originalFileUrl || null,
      created_by: auth.session.user.id,
      status: "draft",
      version: "1.0",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating template:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return {
    success: true,
    data: {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      version: template.version,
      status: template.status as TemplateStatus,
      originalFileUrl: template.original_file_url,
      createdBy: template.created_by,
      createdAt: template.created_at ?? new Date().toISOString(),
      updatedAt: template.updated_at ?? new Date().toISOString(),
    }
  };
}

export async function updateDocumentTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    status?: "draft" | "active" | "archived";
  }
): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("document_templates")
    .update({
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating template:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);
  return { success: true };
}

export async function incrementTemplateVersion(id: string): Promise<ActionResult<string>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();

  // Get current version
  const { data: current, error: fetchError } = await supabase
    .from("document_templates")
    .select("version")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { success: false, error: "Template not found" };
  }

  // Increment version
  const parts = current.version.split(".");
  const major = parseInt(parts[0]) || 1;
  const minor = (parseInt(parts[1]) || 0) + 1;
  const newVersion = `${major}.${minor}`;

  const { error } = await supabase
    .from("document_templates")
    .update({ version: newVersion })
    .eq("id", id);

  if (error) {
    console.error("Error incrementing version:", error);
    return { success: false, error: error.message };
  }

  // Mark existing documents as needing update
  await supabase
    .from("matter_documents")
    .update({ status: "needs_update" })
    .eq("template_id", id)
    .in("status", ["final", "delivered"]);

  revalidatePath("/admin/templates");
  return { success: true, data: newVersion };
}

// ============================================================================
// Section Actions
// ============================================================================

export async function createTemplateSection(data: {
  templateId: string;
  name: string;
  content: string;
  sortOrder: number;
  isConditional?: boolean;
  conditionRules?: ConditionRules;
}): Promise<ActionResult<TemplateSection>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: section, error } = await supabase
    .from("template_sections")
    .insert({
      template_id: data.templateId,
      name: data.name,
      content: data.content,
      sort_order: data.sortOrder,
      is_conditional: data.isConditional || false,
      condition_rules: (data.conditionRules as Json) || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating section:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/templates/${data.templateId}`);
  return {
    success: true,
    data: {
      id: section.id,
      templateId: section.template_id,
      name: section.name,
      content: section.content,
      sortOrder: section.sort_order,
      isConditional: section.is_conditional ?? false,
      conditionRules: section.condition_rules as ConditionRules | null,
      createdAt: section.created_at ?? new Date().toISOString(),
      updatedAt: section.updated_at ?? new Date().toISOString(),
    }
  };
}

export async function updateTemplateSection(
  id: string,
  data: {
    name?: string;
    content?: string;
    sortOrder?: number;
    isConditional?: boolean;
    conditionRules?: ConditionRules | null;
  }
): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("template_sections")
    .update({
      name: data.name,
      content: data.content,
      sort_order: data.sortOrder,
      is_conditional: data.isConditional,
      condition_rules: data.conditionRules as Json | null | undefined,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating section:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

export async function deleteTemplateSection(id: string): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("template_sections")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting section:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

export async function reorderTemplateSections(
  templateId: string,
  sectionIds: string[]
): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();

  // Update each section's sort_order based on its position in the array
  const updates = sectionIds.map((id, index) =>
    supabase
      .from("template_sections")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("template_id", templateId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error("Error reordering sections:", errors[0].error);
    return { success: false, error: "Failed to reorder sections" };
  }

  revalidatePath(`/admin/templates/${templateId}`);
  revalidatePath(`/admin/templates/${templateId}/edit`);
  return { success: true };
}

// ============================================================================
// Field Actions
// ============================================================================

export async function createTemplateField(data: {
  name: string;
  label: string;
  fieldType: TemplateField["fieldType"];
  isRequired?: boolean;
  defaultValue?: string;
  options?: string[];
  sourceType?: TemplateField["sourceType"];
  intakeQuestionId?: string;
  outputType?: TemplateField["outputType"];
}): Promise<ActionResult<TemplateField>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: field, error } = await supabase
    .from("template_fields")
    .insert({
      name: data.name,
      label: data.label,
      field_type: data.fieldType,
      is_required: data.isRequired || false,
      default_value: data.defaultValue || null,
      options: data.options || null,
      source_type: data.sourceType || "manual",
      intake_question_id: data.intakeQuestionId || null,
      output_type: data.outputType || "merge",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating field:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/templates");
  return {
    success: true,
    data: {
      id: field.id,
      name: field.name,
      label: field.label,
      fieldType: field.field_type as FieldType,
      isRequired: field.is_required ?? false,
      defaultValue: field.default_value,
      options: field.options as string[] | null,
      sourceType: field.source_type as SourceType,
      intakeQuestionId: field.intake_question_id,
      outputType: field.output_type as OutputType,
      createdAt: field.created_at ?? new Date().toISOString(),
      updatedAt: field.updated_at ?? new Date().toISOString(),
    }
  };
}

export async function mapFieldToTemplate(templateId: string, fieldId: string): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("template_field_mappings")
    .insert({
      template_id: templateId,
      field_id: fieldId,
    });

  if (error) {
    if (error.code === "23505") { // Unique constraint
      return { success: true }; // Already mapped
    }
    console.error("Error mapping field:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/templates/${templateId}`);
  return { success: true };
}

// ============================================================================
// Matter Document Package Actions
// ============================================================================

export async function createOrUpdateDocumentPackage(
  matterId: string,
  data: {
    packageType?: PackageType;
    selectedTemplateIds?: string[];
  }
): Promise<ActionResult<{ id: string }>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: pkg, error } = await supabase
    .from("matter_document_packages")
    .upsert({
      matter_id: matterId,
      package_type: data.packageType || "base",
      selected_template_ids: data.selectedTemplateIds || [],
      status: "pending_info",
    }, {
      onConflict: "matter_id",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating/updating document package:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/matters/${matterId}`);
  return { success: true, data: { id: pkg.id } };
}

// ============================================================================
// Matter Document Actions
// ============================================================================

export async function createMatterDocument(data: {
  matterId: string;
  name: string;
  documentType: "template" | "custom";
  source?: "generated" | "uploaded_lawyer" | "uploaded_client";
  templateId?: string;
  templateVersion?: string;
  pdfUrl?: string;
  fieldValues?: Record<string, unknown>;
}): Promise<ActionResult<{ id: string }>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: doc, error } = await supabase
    .from("matter_documents")
    .insert({
      matter_id: data.matterId,
      name: data.name,
      document_type: data.documentType,
      source: data.source || "generated",
      template_id: data.templateId || null,
      template_version: data.templateVersion || null,
      pdf_url: data.pdfUrl || null,
      field_values: (data.fieldValues as Json) || null,
      status: "draft",
      generated_at: data.documentType === "template" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating matter document:", error);
    return { success: false, error: error.message };
  }

  // Log history
  await supabase.from("matter_document_history").insert({
    matter_document_id: doc.id,
    action: "generated",
    changed_by: auth.session.user.id,
    details: { source: data.source, templateVersion: data.templateVersion },
  });

  revalidatePath(`/matters/${data.matterId}`);
  return { success: true, data: { id: doc.id } };
}

export async function updateMatterDocumentStatus(
  id: string,
  status: "draft" | "review" | "final" | "delivered" | "needs_update"
): Promise<ActionResult> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();

  const updateData: Record<string, unknown> = { status };
  if (status === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  }

  const { data: doc, error } = await supabase
    .from("matter_documents")
    .update(updateData)
    .eq("id", id)
    .select("matter_id")
    .single();

  if (error) {
    console.error("Error updating document status:", error);
    return { success: false, error: error.message };
  }

  // Log history
  await supabase.from("matter_document_history").insert({
    matter_document_id: id,
    action: "status_changed",
    changed_by: auth.session.user.id,
    details: { newStatus: status },
  });

  revalidatePath(`/matters/${doc.matter_id}`);
  return { success: true };
}

// ============================================================================
// Template Upload and Parsing
// ============================================================================

export async function uploadAndParseTemplate(
  formData: FormData
): Promise<ActionResult<{ template: DocumentTemplate; parsed: ParsedTemplate }>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (!file.name.endsWith(".docx")) {
    return { success: false, error: "Only .docx files are supported" };
  }

  try {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the document with AI
    const parsed = await parseDocumentTemplate(buffer, file.name);

    // Upload original file to Supabase Storage
    const supabase = supabaseAdmin();
    const storagePath = `templates/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue without storage - not critical for MVP
    }

    // Create template record
    const { data: template, error: insertError } = await supabase
      .from("document_templates")
      .insert({
        name: parsed.suggestedName || file.name.replace(".docx", ""),
        description: null,
        category: parsed.suggestedCategory || null,
        original_file_url: uploadError ? null : storagePath,
        created_by: auth.session.user.id,
        status: "draft",
        version: "1.0",
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath("/admin/templates");

    return {
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          version: template.version,
          status: template.status as TemplateStatus,
          originalFileUrl: template.original_file_url,
          createdBy: template.created_by,
          createdAt: template.created_at ?? new Date().toISOString(),
          updatedAt: template.updated_at ?? new Date().toISOString(),
        },
        parsed,
      },
    };
  } catch (err) {
    console.error("Template parsing error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to parse template",
    };
  }
}
