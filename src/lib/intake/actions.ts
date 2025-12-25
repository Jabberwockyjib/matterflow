/**
 * Intake Form Server Actions
 *
 * Server actions for creating, saving, and submitting intake forms.
 */

"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import { getTemplateForMatterType } from "./templates";
import { validateFormResponse } from "./validation";
import type { Database } from "@/types/database.types";
import type {
  IntakeFormResponse,
  IntakeFormSubmission,
  Result,
} from "./types";

type Json = Database["public"]["Tables"]["intake_responses"]["Row"]["responses"];

export type ActionResult =
  | { ok: true; data?: unknown }
  | { error: string };

/**
 * Get intake form for a matter
 *
 * Returns existing intake response or creates a new draft
 */
export async function getIntakeForm(
  matterId: string,
): Promise<ActionResult> {
  try {
    const supabase = supabaseAdmin();

    // Get matter details to determine form type
    const { data: matter, error: matterError } = await supabase
      .from("matters")
      .select("id, matter_type, client_id")
      .eq("id", matterId)
      .single();

    if (matterError || !matter) {
      return { error: "Matter not found" };
    }

    // Get existing intake response
    const { data: existingResponse } = await supabase
      .from("intake_responses")
      .select("*")
      .eq("matter_id", matterId)
      .maybeSingle();

    // If exists, return it
    if (existingResponse) {
      return {
        ok: true,
        data: {
          response: existingResponse,
          template: getTemplateForMatterType(matter.matter_type),
        },
      };
    }

    // Otherwise, get template for matter type
    const template = getTemplateForMatterType(matter.matter_type);

    if (!template) {
      return {
        error: `No intake form template found for matter type: ${matter.matter_type}`,
      };
    }

    return {
      ok: true,
      data: {
        response: null,
        template,
      },
    };
  } catch (error) {
    console.error("Error getting intake form:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Save intake form draft
 *
 * Saves partial form responses without submitting
 */
export async function saveIntakeFormDraft(
  matterId: string,
  formType: string,
  responses: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const supabase = supabaseAdmin();

    // Check if draft already exists
    const { data: existing } = await supabase
      .from("intake_responses")
      .select("id")
      .eq("matter_id", matterId)
      .maybeSingle();

    if (existing) {
      // Update existing draft
      const { error } = await supabase
        .from("intake_responses")
        .update({
          responses: responses as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) return { error: error.message };

      revalidatePath(`/intake/${matterId}`);
      return { ok: true, data: { id: existing.id } };
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from("intake_responses")
        .insert({
          matter_id: matterId,
          form_type: formType,
          responses: responses as Json,
          status: "draft",
        })
        .select("id")
        .single();

      if (error) return { error: error.message };

      revalidatePath(`/intake/${matterId}`);
      return { ok: true, data: { id: data.id } };
    }
  } catch (error) {
    console.error("Error saving intake form draft:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Submit intake form
 *
 * Validates and submits intake form, sends notification to lawyer
 */
export async function submitIntakeForm(
  matterId: string,
  formType: string,
  responses: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const supabase = supabaseAdmin();

    // Get template for validation
    const { data: matter } = await supabase
      .from("matters")
      .select("matter_type, owner_id, client_id")
      .eq("id", matterId)
      .single();

    if (!matter) {
      return { error: "Matter not found" };
    }

    const template = getTemplateForMatterType(matter.matter_type);

    if (!template) {
      return { error: "Form template not found" };
    }

    // Validate responses
    const validation = validateFormResponse(template, responses);

    if (!validation.valid) {
      return {
        error: `Form validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
      };
    }

    // Check if draft exists
    const { data: existing } = await supabase
      .from("intake_responses")
      .select("id")
      .eq("matter_id", matterId)
      .maybeSingle();

    if (existing) {
      // Update existing to submitted
      const { error } = await supabase
        .from("intake_responses")
        .update({
          responses: responses as Json,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) return { error: error.message };
    } else {
      // Create new submitted response
      const { error } = await supabase
        .from("intake_responses")
        .insert({
          matter_id: matterId,
          form_type: formType,
          responses: responses as Json,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });

      if (error) return { error: error.message };
    }

    // Update matter stage to "Intake Received" if still in "Intake Sent"
    const { data: currentMatter } = await supabase
      .from("matters")
      .select("stage")
      .eq("id", matterId)
      .single();

    const now = new Date().toISOString();

    if (currentMatter?.stage === "Intake Sent") {
      const { error: updateError } = await supabase
        .from("matters")
        .update({
          stage: "Intake Received",
          responsible_party: "lawyer",
          next_action: "Review intake form",
          next_action_due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          intake_received_at: now,
          updated_at: now,
        })
        .eq("id", matterId);

      if (updateError) {
        console.error("Failed to update matter stage:", updateError);
        return { error: "Failed to update matter status. Please try again." };
      }
    }

    // Send email notification to lawyer
    try {
      const { sendIntakeSubmittedEmail } = await import("@/lib/email/actions");

      const { data: lawyerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", matter.owner_id)
        .single();

      const { data: { user: lawyerUser } } = await supabase.auth.admin.getUserById(matter.owner_id);

      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", matter.client_id!)
        .maybeSingle();

      if (lawyerUser?.email) {
        await sendIntakeSubmittedEmail({
          to: lawyerUser.email,
          lawyerName: lawyerProfile?.full_name || "Counselor",
          clientName: clientProfile?.full_name || "Client",
          matterId,
          formType,
        });
      }
    } catch (emailError) {
      console.error("Failed to send intake submission email:", emailError);
      // Don't fail the submission if email fails
    }

    revalidatePath(`/intake/${matterId}`);
    revalidatePath("/matters");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    console.error("Error submitting intake form:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Approve intake form (admin/staff only)
 *
 * Marks intake form as approved and moves matter forward
 */
export async function approveIntakeForm(
  intakeResponseId: string,
): Promise<ActionResult> {
  try {
    const supabase = supabaseAdmin();

    // Update intake response status
    const { data: intakeResponse, error } = await supabase
      .from("intake_responses")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeResponseId)
      .select("matter_id")
      .single();

    if (error || !intakeResponse) {
      return { error: error?.message || "Intake response not found" };
    }

    const matterId = intakeResponse.matter_id;

    // Update matter stage to "Under Review" if still in "Intake Received"
    const { data: matter } = await supabase
      .from("matters")
      .select("stage")
      .eq("id", matterId)
      .single();

    if (matter?.stage === "Intake Received") {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      const { error: updateError } = await supabase
        .from("matters")
        .update({
          stage: "Under Review",
          responsible_party: "lawyer",
          next_action: "Begin document review",
          next_action_due_date: dueDate.toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", matterId);

      if (updateError) {
        console.error("Failed to update matter stage:", updateError);
        return { error: "Failed to update matter status. Please try again." };
      }
    }

    // Log approval to audit trail
    const { session } = await getSessionWithProfile();
    if (session) {
      await supabase.from("audit_logs").insert({
        actor_id: session.user.id,
        event_type: "intake_form_approved",
        entity_type: "matter",
        entity_id: matterId,
        metadata: {
          intake_response_id: intakeResponseId,
          approved_at: new Date().toISOString(),
        },
      });
    }

    revalidatePath(`/intake/${matterId}`);
    revalidatePath("/matters");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    console.error("Error approving intake form:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all intake responses (admin/staff only)
 *
 * Returns all intake responses with matter details
 */
export async function getAllIntakeResponses(): Promise<{
  data?: IntakeFormResponse[];
  error?: string;
}> {
  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("intake_responses")
      .select(
        `
        *,
        matters:matter_id (
          id,
          title,
          matter_type,
          client_id,
          profiles:client_id (
            full_name
          )
        )
      `,
      )
      .order("submitted_at", { ascending: false, nullsFirst: false });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error("Error fetching intake responses:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get intake response by matter ID
 */
export async function getIntakeResponseByMatterId(
  matterId: string,
): Promise<{
  data?: IntakeFormResponse;
  error?: string;
}> {
  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("intake_responses")
      .select("*")
      .eq("matter_id", matterId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return { error: "No intake response found" };
    }

    return { data: data as unknown as IntakeFormResponse };
  } catch (error) {
    console.error("Error fetching intake response:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
