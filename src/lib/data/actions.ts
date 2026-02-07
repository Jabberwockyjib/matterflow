"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { render } from "@react-email/components";

import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Json } from "@/types/database.types";
import { sendMatterCreatedEmail, sendTaskAssignedEmail, sendInvoiceEmail, sendTaskResponseSubmittedEmail, sendTaskApprovedEmail, sendTaskRevisionRequestedEmail } from "@/lib/email/actions";
import { sendEmail } from "@/lib/email/service";
import { fetchGmailEmails, extractEmailAddress } from "@/lib/email/gmail-client";
import { summarizeEmail } from "@/lib/ai/email-summary";
import UserInvitationEmail from "@/lib/email/templates/user-invitation";
import AdminPasswordResetEmail from "@/lib/email/templates/admin-password-reset";
import { inviteUserSchema, passwordResetSchema, changePasswordSchema, declineIntakeSchema, scheduleCallSchema, updateIntakeNotesSchema, updateClientProfileSchema } from "@/lib/validation/schemas";
import { infoRequestSchema, infoResponseSchema } from "@/lib/validation/info-request-schemas";
import { FIRM_SETTING_KEYS, type FirmSettingKey } from "@/types/firm-settings";
import { invalidateFirmSettingsCache } from "@/lib/data/queries";
import { z } from "zod";
import { calculateBillableDuration } from "@/lib/billing/utils";

type ActionResult = {
  ok?: boolean;
  error?: string;
  data?: unknown;
};
type InviteUserResult = { success: boolean; data?: { userId: string }; error?: string };

export type UserWithProfile = {
  userId: string;
  email: string;
  fullName: string | null;
  role: "admin" | "staff" | "client";
  status: "active" | "inactive";
  lastLogin: string | null;
  invitedAt: string | null;
  invitedBy: string | null;
};

/**
 * Send notification to lawyer when client submits a task response
 */
async function sendTaskResponseNotification(
  taskId: string,
  taskTitle: string,
  matterTitle: string,
  matterId: string,
  clientName: string,
  responseText: string | null
) {
  const supabase = ensureSupabase();

  // Get the matter owner (lawyer)
  const { data: matter } = await supabase
    .from("matters")
    .select("owner_id")
    .eq("id", matterId)
    .single();

  if (!matter?.owner_id) {
    console.error("No matter owner found for task response notification");
    return;
  }

  // Get owner profile
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", matter.owner_id)
    .single();

  // Get owner email from auth
  const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(matter.owner_id);

  if (!ownerUser?.email) {
    console.error("No email found for matter owner");
    return;
  }

  await sendTaskResponseSubmittedEmail({
    to: ownerUser.email,
    recipientName: ownerProfile?.full_name || "Counselor",
    clientName,
    taskTitle,
    taskId,
    matterTitle,
    matterId,
    responsePreview: responseText ? (responseText.length > 100 ? responseText.substring(0, 100) + "..." : responseText) : undefined,
  });
}

/**
 * Send notification to client when their task response is approved
 */
async function sendTaskApprovalEmail(
  clientUserId: string,
  taskTitle: string,
  taskId: string,
  matterId: string
) {
  const supabase = ensureSupabase();

  // Get client profile
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", clientUserId)
    .single();

  // Get client email from auth
  const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(clientUserId);

  if (!clientUser?.email) {
    console.error("No email found for client");
    return;
  }

  // Get matter title
  const { data: matter } = await supabase
    .from("matters")
    .select("title")
    .eq("id", matterId)
    .single();

  await sendTaskApprovedEmail({
    to: clientUser.email,
    recipientName: clientProfile?.full_name || "Client",
    taskTitle,
    taskId,
    matterTitle: matter?.title || "Your Matter",
    matterId,
  });
}

/**
 * Send notification to client when revision is requested on their task response
 */
async function sendTaskRevisionEmail(
  clientUserId: string,
  taskTitle: string,
  taskId: string,
  matterId: string,
  notes: string
) {
  const supabase = ensureSupabase();

  // Get client profile
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", clientUserId)
    .single();

  // Get client email from auth
  const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(clientUserId);

  if (!clientUser?.email) {
    console.error("No email found for client");
    return;
  }

  // Get matter title
  const { data: matter } = await supabase
    .from("matters")
    .select("title")
    .eq("id", matterId)
    .single();

  await sendTaskRevisionRequestedEmail({
    to: clientUser.email,
    recipientName: clientProfile?.full_name || "Client",
    taskTitle,
    taskId,
    matterTitle: matter?.title || "Your Matter",
    matterId,
    revisionNotes: notes,
  });
}

const ensureSupabase = () => {
  if (!supabaseEnvReady()) {
    throw new Error("Supabase environment variables are not set");
  }
  return supabaseAdmin();
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

const ensureAdmin = async () => {
  const { profile, session } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" } as const;
  }
  if (profile?.role !== "admin") {
    return { error: "Forbidden: only admins can perform this action" } as const;
  }
  return { session, profile } as const;
};

const logAudit = async ({
  supabase,
  actorId,
  eventType,
  entityType,
  entityId,
  metadata,
}: {
  supabase: ReturnType<typeof supabaseAdmin>;
  actorId: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, Json | undefined>;
}) => {
  try {
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: (metadata || null) as Json | null,
    });
  } catch {
    // do not block primary flow on audit failure
  }
};

// Matter Actions

export async function createMatter(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const title = (formData.get("title") as string) || "Untitled Matter";
    const ownerId = (formData.get("ownerId") as string) || roleCheck.session.user.id;
    const clientId = (formData.get("clientId") as string) || null;
    const matterType = (formData.get("matterType") as string) || "General";
    const billingModel = (formData.get("billingModel") as string) || "hourly";

    // Auto-populate intake fields when client is specified
    let stage = "Lead Created";
    let responsible = (formData.get("responsibleParty") as string) || "lawyer";
    let nextAction = (formData.get("nextAction") as string) || null;
    let nextActionDueDate = (formData.get("nextActionDueDate") as string) || null;

    if (clientId) {
      // Client specified - set up for intake automation
      stage = "Intake Sent";
      responsible = "client";
      nextAction = nextAction || "Complete intake form";

      // Default due date: 3 days from now
      if (!nextActionDueDate) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        nextActionDueDate = dueDate.toISOString().split("T")[0];
      }
    }

    // Validation: Next Action and Due Date are required
    if (!nextAction) {
      return { error: "Next Action is required" };
    }
    if (!nextActionDueDate) {
      return { error: "Next Action Due Date is required" };
    }

    const { data: newMatter, error } = await supabase.from("matters").insert({
      title,
      owner_id: ownerId,
      client_id: clientId,
      matter_type: matterType,
      billing_model: billingModel,
      stage,
      responsible_party: responsible,
      next_action: nextAction,
      next_action_due_date: nextActionDueDate,
    }).select("id").single();

    if (error) return { error: error.message };

    const matterId = newMatter?.id;

    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "matter_created",
      entityType: "matter",
      entityId: matterId,
      metadata: { title, nextAction, nextActionDueDate },
    });

    // Send email notification to client if client is specified
    if (clientId && matterId) {
      try {
        // Fetch client and owner profiles
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("full_name, user_id")
          .eq("user_id", clientId)
          .maybeSingle();

        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", ownerId)
          .maybeSingle();

        // Get client email from auth.users
        const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(clientId);

        if (clientUser?.email && clientProfile) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          await sendMatterCreatedEmail({
            to: clientUser.email,
            clientName: clientProfile.full_name || "Client",
            matterTitle: title,
            matterId,
            matterType,
            lawyerName: ownerProfile?.full_name || "Your Attorney",
            nextAction,
            intakeLink: `${appUrl}/intake/${matterId}`,
          });
        }
      } catch (emailError) {
        // Don't fail the matter creation if email fails
        console.error("Failed to send matter created email:", emailError);
      }
    }

    revalidatePath("/");
    revalidatePath("/matters");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateMatterStage(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;
    const stage = (formData.get("stage") as string) || null;
    const responsible = (formData.get("responsibleParty") as string) || null;
    const nextAction = (formData.get("nextAction") as string) || null;
    const nextActionDueDate = (formData.get("nextActionDueDate") as string) || null;

    // Validation: Next Action and Due Date are required for updates
    if (!nextAction) {
      return { error: "Next Action is required" };
    }
    if (!nextActionDueDate) {
      return { error: "Next Action Due Date is required" };
    }

    const { error } = await supabase
      .from("matters")
      .update({
        stage: stage || undefined,
        responsible_party: responsible || undefined,
        next_action: nextAction,
        next_action_due_date: nextActionDueDate,
      })
      .eq("id", id || "");

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "matter_updated",
      entityType: "matter",
      entityId: id,
      metadata: { stage, responsible, nextAction, nextActionDueDate },
    });
    revalidatePath("/");
    revalidatePath("/matters");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteMatter(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;

    if (!id) {
      return { error: "Matter ID is required" };
    }

    const { error } = await supabase
      .from("matters")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "matter_deleted",
      entityType: "matter",
      entityId: id,
      metadata: {},
    });
    revalidatePath("/");
    revalidatePath("/matters");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getMatter(id: string): Promise<{ data?: unknown; error?: string }> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const { data, error } = await supabase
      .from("matters")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return { error: error.message };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getMatters(): Promise<{ data?: unknown[]; error?: string }> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const { data, error } = await supabase
      .from("matters")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { data: data || [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Time Entry Actions

export async function createTimeEntry(
  formData: FormData,
): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const matterId = formData.get("matterId") as string;
    const taskId = (formData.get("taskId") as string) || null;
    const description = (formData.get("description") as string) || "Manual entry";
    const minutes = Number(formData.get("minutes")) || null;

    if (!matterId) {
      return { error: "Matter ID is required" };
    }

    const { error } = await supabase.from("time_entries").insert({
      matter_id: matterId,
      task_id: taskId || null,
      description,
      duration_minutes: minutes || null,
      status: "draft",
    });

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "time_entry_created",
      entityType: "time_entry",
      entityId: null,
      metadata: { matterId, minutes },
    });
    revalidatePath("/");
    revalidatePath("/time");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateTimeEntry(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;
    const description = (formData.get("description") as string) || null;
    const endedAt = (formData.get("endedAt") as string) || null;
    const durationMinutesStr = formData.get("durationMinutes") as string;
    const durationMinutes = durationMinutesStr ? parseInt(durationMinutesStr, 10) : null;
    const rateCentsStr = formData.get("rateCents") as string;
    const rateCents = rateCentsStr ? parseInt(rateCentsStr, 10) : null;
    const status = (formData.get("status") as string) || null;

    if (!id) {
      return { error: "Time entry ID is required" };
    }

    const updateData: Record<string, unknown> = {};
    if (description !== null) updateData.description = description;
    if (endedAt !== null) updateData.ended_at = endedAt;
    if (durationMinutes !== null) updateData.duration_minutes = durationMinutes;
    if (rateCents !== null) updateData.rate_cents = rateCents;
    if (status !== null) updateData.status = status;

    const { error } = await supabase
      .from("time_entries")
      .update(updateData)
      .eq("id", id);

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "time_entry_updated",
      entityType: "time_entry",
      entityId: id,
      metadata: updateData as Record<string, Json | undefined>,
    });
    revalidatePath("/");
    revalidatePath("/time");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function stopTimeEntry(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;
    const { data, error: fetchErr } = await supabase
      .from("time_entries")
      .select("started_at")
      .eq("id", id || "")
      .maybeSingle();
    if (fetchErr) return { error: fetchErr.message };
    const startedAt = data?.started_at ? new Date(data.started_at) : null;
    const endedAt = new Date();
    const durationMinutes =
      startedAt && !Number.isNaN(startedAt.getTime())
        ? Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
        : null;
    const { error } = await supabase
      .from("time_entries")
      .update({ ended_at: endedAt.toISOString(), duration_minutes: durationMinutes })
      .eq("id", id || "");
    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "time_entry_updated",
      entityType: "time_entry",
      entityId: id,
      metadata: { endedAt: endedAt.toISOString(), durationMinutes },
    });
    revalidatePath("/time");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteTimeEntry(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;

    if (!id) {
      return { error: "Time entry ID is required" };
    }

    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "time_entry_deleted",
      entityType: "time_entry",
      entityId: id,
      metadata: {},
    });
    revalidatePath("/");
    revalidatePath("/time");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getTimeEntry(id: string): Promise<{ data?: unknown; error?: string }> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return { error: error.message };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getTimeEntries(matterId?: string): Promise<{ data?: unknown[]; error?: string }> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    let query = supabase
      .from("time_entries")
      .select("*")
      .order("started_at", { ascending: false });

    if (matterId) {
      query = query.eq("matter_id", matterId);
    }

    const { data, error } = await query;

    if (error) return { error: error.message };
    return { data: data || [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Task Actions

export async function createTask(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const title = (formData.get("title") as string) || "New Task";
    const matterId = formData.get("matterId") as string;
    const dueDate = (formData.get("dueDate") as string) || null;
    const responsible = (formData.get("responsibleParty") as string) || "lawyer";
    const taskType = (formData.get("taskType") as string) || "general";
    const instructions = (formData.get("instructions") as string) || null;

    if (!matterId) {
      return { error: "Matter ID is required" };
    }

    const { data: newTask, error } = await supabase.from("tasks").insert({
      title,
      matter_id: matterId,
      due_date: dueDate,
      responsible_party: responsible,
      task_type: taskType,
      instructions,
      status: "open",
    }).select("id").single();

    if (error) return { error: error.message };

    const taskId = newTask?.id;

    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_created",
      entityType: "task",
      entityId: taskId,
      metadata: { title, matterId },
    });

    // Send email notification if task is assigned to client
    if (responsible === "client" && taskId) {
      try {
        // Fetch matter to get client and matter details
        const { data: matter } = await supabase
          .from("matters")
          .select("client_id, title")
          .eq("id", matterId)
          .maybeSingle();

        if (matter?.client_id) {
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", matter.client_id)
            .maybeSingle();

          const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);

          if (clientUser?.email && clientProfile) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            await sendTaskAssignedEmail({
              to: clientUser.email,
              recipientName: clientProfile.full_name || "Client",
              taskTitle: title,
              taskId,
              matterTitle: matter.title,
              matterId,
              dueDate: dueDate || undefined,
              taskLink: `${appUrl}/tasks/${taskId}`,
              isClientTask: true,
            });
          }
        }
      } catch (emailError) {
        console.error("Failed to send task assigned email:", emailError);
      }
    }

    // Auto-create calendar event if task has a due date
    if (dueDate && taskId) {
      try {
        const { createCalendarEventForTask } = await import("@/lib/calendar/actions");
        await createCalendarEventForTask(taskId, title, dueDate, matterId);
      } catch (calErr) {
        console.error("Failed to create calendar event for task:", calErr);
      }
    }

    revalidatePath("/");
    revalidatePath("/tasks");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateTaskStatus(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;
    const status = (formData.get("status") as string) || null;
    const { error } = await supabase
      .from("tasks")
      .update({ status: status || undefined })
      .eq("id", id || "");
    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_updated",
      entityType: "task",
      entityId: id,
      metadata: { status },
    });
    revalidatePath("/tasks");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;

    if (!id) {
      return { error: "Task ID is required" };
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_deleted",
      entityType: "task",
      entityId: id,
      metadata: {},
    });
    revalidatePath("/");
    revalidatePath("/tasks");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getTask(id: string): Promise<{ data?: unknown; error?: string }> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return { error: error.message };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getTasks(matterId?: string): Promise<{ data?: unknown[]; error?: string }> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    let query = supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (matterId) {
      query = query.eq("matter_id", matterId);
    }

    const { data, error } = await query;

    if (error) return { error: error.message };
    return { data: data || [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Submit a client response to a task
 * For confirmations: auto-completes the task
 * For other types: sets task to pending_review
 */
export async function submitTaskResponse(formData: FormData): Promise<ActionResult> {
  const { session, profile } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" };
  }
  if (profile?.role !== "client") {
    return { error: "Only clients can submit task responses" };
  }

  try {
    const supabase = ensureSupabase();
    const taskId = formData.get("taskId") as string;
    const responseText = (formData.get("responseText") as string) || null;
    const isConfirmation = formData.get("isConfirmation") === "true";

    if (!taskId) {
      return { error: "Task ID is required" };
    }

    // Verify task belongs to client's matter and is assigned to client
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        task_type,
        status,
        responsible_party,
        matter_id,
        matters!inner(id, client_id, title)
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return { error: "Task not found" };
    }

    const matter = task.matters as { id: string; client_id: string | null; title: string };
    if (matter.client_id !== session.user.id) {
      return { error: "You do not have access to this task" };
    }

    if (task.responsible_party !== "client") {
      return { error: "This task is not assigned to you" };
    }

    if (task.status !== "open") {
      return { error: "This task has already been responded to" };
    }

    // Create the response
    const { data: response, error: responseError } = await supabase
      .from("task_responses")
      .insert({
        task_id: taskId,
        submitted_by: session.user.id,
        response_text: responseText,
        confirmed_at: isConfirmation ? new Date().toISOString() : null,
        status: "submitted",
      })
      .select("id")
      .single();

    if (responseError) {
      return { error: responseError.message };
    }

    // Update task status
    const newTaskStatus = isConfirmation ? "done" : "pending_review";
    await supabase
      .from("tasks")
      .update({ status: newTaskStatus })
      .eq("id", taskId);

    // Log audit
    await logAudit({
      supabase,
      actorId: session.user.id,
      eventType: "task_response_submitted",
      entityType: "task_response",
      entityId: response.id,
      metadata: { taskId, isConfirmation },
    });

    // Send email notification to lawyer (if not a confirmation that auto-completed)
    if (!isConfirmation) {
      try {
        await sendTaskResponseNotification(
          taskId,
          task.title,
          matter.title,
          matter.id,
          profile?.full_name || "Client",
          responseText
        );
      } catch (emailError) {
        console.error("Failed to send task response notification:", emailError);
      }
    }

    revalidatePath("/my-matters");
    revalidatePath("/dashboard");
    revalidatePath(`/matters/${matter.id}`);

    return { ok: true, data: { responseId: response.id } };
  } catch (error) {
    console.error("Submit task response error:", error);
    return { error: error instanceof Error ? error.message : "Failed to submit response" };
  }
}

/**
 * Approve a task response (staff/admin only)
 */
export async function approveTaskResponse(responseId: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    // Get response and task
    const { data: response, error: responseError } = await supabase
      .from("task_responses")
      .select(`
        id,
        task_id,
        submitted_by,
        tasks!inner(id, title, matter_id)
      `)
      .eq("id", responseId)
      .single();

    if (responseError || !response) {
      return { error: "Response not found" };
    }

    // Update response status
    await supabase
      .from("task_responses")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: roleCheck.session.user.id,
      })
      .eq("id", responseId);

    // Update task to done
    const task = response.tasks as { id: string; title: string; matter_id: string };
    await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", task.id);

    // Log audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_response_approved",
      entityType: "task_response",
      entityId: responseId,
      metadata: { taskId: task.id },
    });

    // Send approval email to client
    try {
      await sendTaskApprovalEmail(response.submitted_by, task.title, task.id, task.matter_id);
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    revalidatePath("/dashboard");
    revalidatePath(`/matters/${task.matter_id}`);

    return { ok: true };
  } catch (error) {
    console.error("Approve task response error:", error);
    return { error: error instanceof Error ? error.message : "Failed to approve response" };
  }
}

/**
 * Request revision on a task response (staff/admin only)
 */
export async function requestTaskRevision(responseId: string, notes: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  if (!notes || notes.trim().length === 0) {
    return { error: "Revision notes are required" };
  }

  try {
    const supabase = ensureSupabase();

    // Get response and task
    const { data: response, error: responseError } = await supabase
      .from("task_responses")
      .select(`
        id,
        task_id,
        submitted_by,
        tasks!inner(id, title, matter_id)
      `)
      .eq("id", responseId)
      .single();

    if (responseError || !response) {
      return { error: "Response not found" };
    }

    // Update response status
    await supabase
      .from("task_responses")
      .update({
        status: "rejected",
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: roleCheck.session.user.id,
      })
      .eq("id", responseId);

    // Set task back to open
    const task = response.tasks as { id: string; title: string; matter_id: string };
    await supabase
      .from("tasks")
      .update({ status: "open" })
      .eq("id", task.id);

    // Log audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_revision_requested",
      entityType: "task_response",
      entityId: responseId,
      metadata: { taskId: task.id, notes },
    });

    // Send revision email to client
    try {
      await sendTaskRevisionEmail(response.submitted_by, task.title, task.id, task.matter_id, notes);
    } catch (emailError) {
      console.error("Failed to send revision email:", emailError);
    }

    revalidatePath("/my-matters");
    revalidatePath("/dashboard");
    revalidatePath(`/matters/${task.matter_id}`);

    return { ok: true };
  } catch (error) {
    console.error("Request task revision error:", error);
    return { error: error instanceof Error ? error.message : "Failed to request revision" };
  }
}

// Invoice Actions

export async function createInvoice(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const matterId = formData.get("matterId") as string;
    const amount = Number(formData.get("amount")) || 0;
    const status = (formData.get("status") as string) || "draft";

    if (!matterId) {
      return { error: "Matter ID is required" };
    }

    const { error } = await supabase.from("invoices").insert({
      matter_id: matterId,
      total_cents: Math.max(0, Math.round(amount * 100)),
      status,
      line_items: [{ description: "Line item", amount_cents: Math.max(0, Math.round(amount * 100)) }] as Json,
    });

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "invoice_created",
      entityType: "invoice",
      entityId: null,
      metadata: { matterId, amount },
    });
    revalidatePath("/");
    revalidatePath("/billing");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateInvoiceStatus(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;
    const status = (formData.get("status") as string) || null;
    const { error } = await supabase
      .from("invoices")
      .update({ status: status || undefined })
      .eq("id", id || "");
    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "invoice_updated",
      entityType: "invoice",
      entityId: id,
      metadata: { status },
    });

    // Sync to Square and send email notification when invoice is marked as 'sent'
    if (status === "sent" && id) {
      try {
        // Fetch invoice and matter details
        const { data: invoice } = await supabase
          .from("invoices")
          .select("matter_id, total_cents, due_date, square_invoice_id")
          .eq("id", id)
          .maybeSingle();

        if (invoice) {
          // Sync to Square if not already synced
          let squarePaymentUrl: string | undefined;
          if (!invoice.square_invoice_id) {
            try {
              const { syncInvoiceToSquare } = await import("@/lib/square");
              const syncResult = await syncInvoiceToSquare(id);
              if (!("error" in syncResult) && syncResult.data?.paymentUrl) {
                squarePaymentUrl = syncResult.data.paymentUrl;
              }
            } catch (squareError) {
              console.error("Failed to sync invoice to Square:", squareError);
              // Continue with email even if Square sync fails
            }
          } else {
            // Get payment URL for already-synced invoice
            try {
              const { getSquarePaymentUrl } = await import("@/lib/square");
              const urlResult = await getSquarePaymentUrl(id);
              if (!("error" in urlResult) && urlResult.data?.paymentUrl) {
                squarePaymentUrl = urlResult.data.paymentUrl;
              }
            } catch (squareError) {
              console.error("Failed to get Square payment URL:", squareError);
            }
          }

          const { data: matter } = await supabase
            .from("matters")
            .select("client_id, title")
            .eq("id", invoice.matter_id)
            .maybeSingle();

          if (matter?.client_id) {
            const { data: clientProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", matter.client_id)
              .maybeSingle();

            const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);

            if (clientUser?.email && clientProfile) {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
              const amount = (invoice.total_cents / 100).toFixed(2);

              await sendInvoiceEmail({
                to: clientUser.email,
                clientName: clientProfile.full_name || "Client",
                matterTitle: matter.title,
                matterId: invoice.matter_id,
                invoiceId: id,
                invoiceAmount: `$${amount}`,
                dueDate: invoice.due_date || "Upon receipt",
                paymentLink: squarePaymentUrl,
                invoiceNumber: id.substring(0, 8).toUpperCase(),
              });
            }
          }
        }
      } catch (emailError) {
        console.error("Failed to send invoice email:", emailError);
      }
    }

    revalidatePath("/billing");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Resend invoice email to client
 * Used to manually resend an invoice email for an already-sent invoice
 */
export async function resendInvoiceEmail(invoiceId: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, matter_id, total_cents, due_date, status, square_invoice_id")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { error: "Invoice not found" };
    }

    if (invoice.status === "draft") {
      return { error: "Cannot resend draft invoice. Mark it as 'sent' first." };
    }

    // Get matter and client info
    const { data: matter } = await supabase
      .from("matters")
      .select("client_id, title")
      .eq("id", invoice.matter_id)
      .maybeSingle();

    if (!matter?.client_id) {
      return { error: "Matter has no client assigned" };
    }

    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", matter.client_id)
      .maybeSingle();

    const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);

    if (!clientUser?.email) {
      return { error: "Client has no email address" };
    }

    // Get payment URL if Square-synced
    let squarePaymentUrl: string | undefined;
    if (invoice.square_invoice_id) {
      try {
        const { getSquarePaymentUrl } = await import("@/lib/square");
        const urlResult = await getSquarePaymentUrl(invoiceId);
        if (!("error" in urlResult) && urlResult.data?.paymentUrl) {
          squarePaymentUrl = urlResult.data.paymentUrl;
        }
      } catch (squareError) {
        console.error("Failed to get Square payment URL:", squareError);
      }
    }

    // Send the email
    const amount = (invoice.total_cents / 100).toFixed(2);
    await sendInvoiceEmail({
      to: clientUser.email,
      clientName: clientProfile?.full_name || "Client",
      matterTitle: matter.title,
      matterId: invoice.matter_id,
      invoiceId: invoiceId,
      invoiceAmount: `$${amount}`,
      dueDate: invoice.due_date || "Upon receipt",
      paymentLink: squarePaymentUrl,
      invoiceNumber: invoiceId.substring(0, 8).toUpperCase(),
    });

    // Log to audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "resend_invoice_email",
      entityType: "invoice",
      entityId: invoiceId,
      metadata: {
        client_email: clientUser.email,
        amount: invoice.total_cents,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("Error resending invoice email:", err);
    return { error: err instanceof Error ? err.message : "Failed to resend invoice email" };
  }
}

// Auth Actions

/**
 * Generate a secure temporary password
 */
function generateTemporaryPassword(): string {
  return randomBytes(12).toString("base64").slice(0, 12);
}

/**
 * Invite a new user to the system (admin only)
 */
export async function inviteUser(data: {
  email: string;
  fullName: string;
  role: "admin" | "staff" | "client";
}): Promise<InviteUserResult> {
  // Validate admin permission
  const { session, profile } = await getSessionWithProfile();
  if (profile?.role !== "admin") {
    return { success: false, error: "Only admins can invite users" };
  }

  // Validate input
  const validated = inviteUserSchema.safeParse(data);
  if (!validated.success) {
    const errors = validated.error.issues;
    const firstError = errors && errors.length > 0 ? errors[0].message : "Validation failed";
    return { success: false, error: firstError };
  }

  try {
    const { email, fullName, role } = validated.data;
    const supabase = supabaseAdmin();

    // Check if user already exists via Auth Admin API
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();

    const existingUser = existingAuthUsers.users.find(u => u.email === email);

    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authUser.user) {
      console.error("Auth user creation error:", authError);
      return { success: false, error: authError?.message || "Failed to create user" };
    }

    // Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: authUser.user.id,
        full_name: fullName,
        role,
        password_must_change: true,
        status: "active",
        invited_by: session?.user.id || null,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: "Failed to create user profile" };
    }

    // Send invitation email
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const emailHtml = await render(
        UserInvitationEmail({
          fullName,
          email,
          temporaryPassword,
          role,
          appUrl,
        })
      );

      await sendEmail({
        to: email,
        subject: "Welcome to MatterFlow\u2122",
        html: emailHtml,
        metadata: {
          type: "matter_created", // Using closest type for user invitation
          recipientRole: role === "client" ? "client" : "staff",
        },
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the invitation if email fails
    }

    // Log to audit trail
    await supabase.from("audit_logs").insert({
      actor_id: session?.user.id || null,
      event_type: "user.invited",
      entity_type: "user",
      entity_id: authUser.user.id,
      metadata: {
        email,
        fullName,
        role,
        invitedBy: profile?.full_name,
      } as Json,
    });

    return {
      success: true,
      data: { userId: authUser.user.id },
    };
  } catch (error) {
    console.error("inviteUser error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<{
  success: boolean;
  data?: UserWithProfile[];
  error?: string;
}> {
  try {
    const { session, profile } = await getSessionWithProfile();
    if (profile?.role !== "admin") {
      return { success: false, error: "Only admins can view all users" };
    }

    const supabase = supabaseAdmin();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        user_id,
        full_name,
        role,
        status,
        last_login,
        invited_at,
        invited_by
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getAllUsers error:", error);
      return { success: false, error: "Failed to fetch users" };
    }

    // Get emails from auth.users
    const userIds = profiles.map((p) => p.user_id);
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    const usersMap = new Map(authUsers.users.map((u) => [u.id, u.email]));

    const users: UserWithProfile[] = profiles.map((p) => ({
      userId: p.user_id,
      email: usersMap.get(p.user_id) || "",
      fullName: p.full_name,
      role: p.role,
      status: p.status as "active" | "inactive",
      lastLogin: p.last_login,
      invitedAt: p.invited_at,
      invitedBy: p.invited_by,
    }));

    return { success: true, data: users };
  } catch (error) {
    console.error("getAllUsers error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: "admin" | "staff" | "client"
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { session, profile } = await getSessionWithProfile();
    if (profile?.role !== "admin") {
      return { success: false, error: "Only admins can update user roles" };
    }

    // Validate role
    if (!["admin", "staff", "client"].includes(newRole)) {
      return { success: false, error: "Invalid role" };
    }

    const supabase = supabaseAdmin();

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      console.error("updateUserRole error:", error);
      return { success: false, error: "Failed to update user role" };
    }

    // Log to audit trail
    await supabase.from("audit_logs").insert({
      actor_id: session?.user.id || null,
      event_type: "user.role_changed",
      entity_type: "user",
      entity_id: userId,
      metadata: {
        newRole,
        changedBy: profile?.full_name,
      } as Json,
    });

    return { success: true };
  } catch (error) {
    console.error("updateUserRole error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Deactivate a user account (admin only)
 */
export async function deactivateUser(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { session, profile } = await getSessionWithProfile();
    if (profile?.role !== "admin") {
      return { success: false, error: "Only admins can deactivate users" };
    }

    const supabase = supabaseAdmin();

    // Update profile status
    const { error } = await supabase
      .from("profiles")
      .update({ status: "inactive" })
      .eq("user_id", userId);

    if (error) {
      console.error("deactivateUser error:", error);
      return { success: false, error: "Failed to deactivate user" };
    }

    // Log to audit trail
    await supabase.from("audit_logs").insert({
      actor_id: session?.user.id || null,
      event_type: "user.deactivated",
      entity_type: "user",
      entity_id: userId,
      metadata: {
        deactivatedBy: profile?.full_name,
      } as Json,
    });

    return { success: true };
  } catch (error) {
    console.error("deactivateUser error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reactivate a user account (admin only)
 */
export async function reactivateUser(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { session, profile } = await getSessionWithProfile();
    if (profile?.role !== "admin") {
      return { success: false, error: "Only admins can reactivate users" };
    }

    const supabase = supabaseAdmin();

    // Update profile status
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("user_id", userId);

    if (error) {
      console.error("reactivateUser error:", error);
      return { success: false, error: "Failed to reactivate user" };
    }

    // Log to audit trail
    await supabase.from("audit_logs").insert({
      actor_id: session?.user.id || null,
      event_type: "user.reactivated",
      entity_type: "user",
      entity_id: userId,
      metadata: {
        reactivatedBy: profile?.full_name,
      } as Json,
    });

    return { success: true };
  } catch (error) {
    console.error("reactivateUser error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Admin-initiated password reset (admin only)
 * Generates new temporary password and emails user
 */
export async function adminResetPassword(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { session, profile } = await getSessionWithProfile();
    if (profile?.role !== "admin") {
      return { success: false, error: "Only admins can reset passwords" };
    }

    const supabase = supabaseAdmin();

    // Get user profile for email and name
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !userProfile) {
      return { success: false, error: "User not found" };
    }

    // Get user email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      return { success: false, error: "User not found" };
    }

    // Generate new temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
    });

    if (updateError) {
      console.error("adminResetPassword update error:", updateError);
      return { success: false, error: "Failed to reset password" };
    }

    // Set password_must_change flag
    const { error: flagError } = await supabase
      .from("profiles")
      .update({ password_must_change: true })
      .eq("user_id", userId);

    if (flagError) {
      console.error("adminResetPassword flag error:", flagError);
    }

    // Send email notification
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const emailHtml = await render(
        AdminPasswordResetEmail({
          fullName: userProfile.full_name || authUser.user.email || "User",
          temporaryPassword,
          appUrl,
        })
      );

      await sendEmail({
        to: authUser.user.email || "",
        subject: "Your MatterFlow\u2122 password was reset",
        html: emailHtml,
        metadata: {
          type: "matter_created", // Using closest type for password reset
          recipientRole: "staff",
        },
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the password reset if email fails
    }

    // Log to audit trail
    await supabase.from("audit_logs").insert({
      actor_id: session?.user.id || null,
      event_type: "user.password_reset_by_admin",
      entity_type: "user",
      entity_id: userId,
      metadata: {
        resetBy: profile?.full_name,
      } as Json,
    });

    return { success: true };
  } catch (error) {
    console.error("adminResetPassword error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Request password reset (self-service)
 * Always returns success to prevent email enumeration
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Validate email format (outside try-catch to return validation errors)
  const emailSchema = z.string().email("Invalid email address");
  const validated = emailSchema.safeParse(email);

  if (!validated.success) {
    const errorMessage = validated.error.issues?.[0]?.message || "Invalid email address";
    return {
      success: false,
      error: errorMessage,
    };
  }

  try {
    const supabase = supabaseAdmin();

    // Use Supabase's built-in password reset
    // This sends an email with a magic link to /auth/reset-password?token=xxx
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    // Log the attempt (not whether email exists)
    await supabase.from("audit_logs").insert({
      actor_id: null, // No authenticated user for self-service
      event_type: "user.password_reset_requested",
      entity_type: "user",
      entity_id: null, // Don't reveal if user exists
      metadata: {
        email, // Log the email for admin tracking
      } as Json,
    });

    // Always return success to prevent email enumeration
    // Even if email doesn't exist, we return success
    return { success: true };
  } catch (error) {
    console.error("requestPasswordReset error:", error);
    // Still return success to prevent enumeration via timing attacks
    return { success: true };
  }
}

/**
 * Reset password using token from email (self-service)
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate password using existing schema
    const validated = passwordResetSchema.safeParse({
      password: newPassword,
      confirmPassword: newPassword, // Self-confirming for server-side
    });

    if (!validated.success) {
      const errorMessage = validated.error.issues?.[0]?.message || "Invalid password";
      return { success: false, error: errorMessage };
    }

    const supabase = supabaseAdmin();

    // Verify the token and update password
    // Supabase's verifyOtp with type 'recovery' validates the reset token
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "recovery",
    });

    if (verifyError || !data.user) {
      console.error("resetPassword verify error:", verifyError);
      return { success: false, error: "Invalid or expired reset token" };
    }

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      data.user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("resetPassword update error:", updateError);
      return { success: false, error: "Failed to reset password" };
    }

    // Clear password_must_change flag if it was set
    await supabase
      .from("profiles")
      .update({ password_must_change: false })
      .eq("user_id", data.user.id);

    // Log to audit trail
    await supabase.from("audit_logs").insert({
      actor_id: data.user.id,
      event_type: "user.password_reset_completed",
      entity_type: "user",
      entity_id: data.user.id,
      metadata: {
        method: "email_link",
      } as Json,
    });

    return { success: true };
  } catch (error) {
    console.error("resetPassword error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Change current password (authenticated users)
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get authenticated user
    const { session, profile } = await getSessionWithProfile();
    if (!session || !profile) {
      return { success: false, error: 'You must be signed in to change your password' };
    }

    // Validate new password using existing schema
    const validated = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword: newPassword, // Self-confirming for server-side
    });

    if (!validated.success) {
      // Return the first validation error message
      const firstError = validated.error.issues?.[0];
      const errorMessage = firstError?.message || "Invalid password";
      return { success: false, error: errorMessage };
    }

    const supabase = supabaseAdmin();

    // Verify current password by attempting to sign in
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Authentication service not configured' };
    }

    const userClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);

    const { error: verifyError } = await userClient.auth.signInWithPassword({
      email: session.user.email || '',
      password: currentPassword,
    });

    if (verifyError) {
      console.error('changePassword verify error:', verifyError);
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update password using admin client
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      session.user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('changePassword error:', updateError);
      return { success: false, error: updateError.message || 'Failed to change password' };
    }

    // Clear password_must_change flag if it was set
    await supabase
      .from('profiles')
      .update({ password_must_change: false })
      .eq('user_id', session.user.id);

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      actor_id: session.user.id,
      event_type: 'user.password_changed',
      entity_type: 'user',
      entity_id: session.user.id,
      metadata: {
        changedBy: profile?.full_name,
      } as Json,
    });

    return { success: true };
  } catch (error) {
    console.error('changePassword error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Timer Actions (stub implementations - TODO: implement full functionality)
export type MatterSearchResult = {
  id: string;
  title: string;
  clientName: string | null;
  matterType: string;
};

export async function searchMatters(query: string): Promise<{ data: MatterSearchResult[] }> {
  try {
    await ensureStaffOrAdmin();
    const supabase = supabaseAdmin();
    const { escapePostgrestFilter } = await import("@/lib/utils/sanitize");
    const sanitized = escapePostgrestFilter(query);
    const { data: matters } = await supabase
      .from("matters")
      .select("id, title, matter_type, profiles:client_id (full_name)")
      .ilike("title", `%${sanitized}%`)
      .limit(10);

    const results = (matters || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      clientName: m.profiles?.full_name || null,
      matterType: m.matter_type,
    }));

    return { data: results };
  } catch (error) {
    console.error("searchMatters error:", error);
    return { data: [] };
  }
}

export async function startTimer(
  matterId: string,
  notes?: string
): Promise<{ error?: string; entryId?: string }> {
  try {
    await ensureStaffOrAdmin();
    const supabase = supabaseAdmin();
    const { session, profile } = await getSessionWithProfile();

    if (!profile) {
      return { error: "Not authenticated" };
    }

    // Create a new time entry in draft status with started_at timestamp
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        matter_id: matterId,
        status: "draft",
        description: notes || null,
        started_at: new Date().toISOString(),
        created_by: session?.user.id || "",
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/time");
    return { entryId: data.id };
  } catch (error) {
    console.error("startTimer error:", error);
    return { error: "Failed to start timer" };
  }
}

export async function stopTimer(
  entryId: string,
  notes?: string
): Promise<{ error?: string; actualMinutes?: number; billableMinutes?: number }> {
  try {
    await ensureStaffOrAdmin();
    const supabase = supabaseAdmin();

    // Get the time entry to calculate duration
    const { data: entry, error: fetchError } = await supabase
      .from("time_entries")
      .select("started_at")
      .eq("id", entryId)
      .single();

    if (fetchError || !entry) {
      return { error: fetchError?.message || "Time entry not found" };
    }

    // Calculate actual duration
    const startedAt = new Date(entry.started_at);
    const endedAt = new Date();
    const actualMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

    // Get billing increment from practice settings
    const { data: settings } = await supabase
      .from("practice_settings")
      .select("billing_increment_minutes")
      .maybeSingle();

    const billingIncrement = settings?.billing_increment_minutes ?? 6;
    const billableMinutes = calculateBillableDuration(actualMinutes, billingIncrement);

    // Update the time entry with ended_at, actual duration, and billable duration
    const { error } = await supabase
      .from("time_entries")
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: actualMinutes,
        billable_duration_minutes: billableMinutes,
        description: notes || undefined,
      })
      .eq("id", entryId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/time");
    return { actualMinutes, billableMinutes };
  } catch (error) {
    console.error("stopTimer error:", error);
    return { error: "Failed to stop timer" };
  }
}

export async function createQuickTimeEntry(data: {
  matterId: string;
  minutes: number;
  description?: string;
  date?: string;
}): Promise<ActionResult> {
  // Convert object to FormData for createTimeEntry
  const formData = new FormData();
  formData.append("matterId", data.matterId);
  formData.append("minutes", data.minutes.toString());
  if (data.description) {
    formData.append("description", data.description);
  }
  if (data.date) {
    formData.append("date", data.date);
  }

  return createTimeEntry(formData);
}

// Client Invitation Actions

/**
 * Invite a new client via email with intake form link
 */
export async function inviteClient(formData: FormData): Promise<{
  ok: boolean
  inviteCode?: string
  inviteLink?: string
  error?: string
}> {
  try {
    // Validate authentication
    const { session, profile } = await getSessionWithProfile()
    if (!session) {
      return { ok: false, error: 'Not authenticated' }
    }

    // Ensure staff or admin
    const role = profile?.role as 'admin' | 'staff' | 'client' | undefined
    if (!role || !['admin', 'staff'].includes(role)) {
      return { ok: false, error: 'Only staff and admins can invite clients' }
    }

    // Extract and validate fields
    const clientName = formData.get('clientName')?.toString().trim()
    const clientEmail = formData.get('clientEmail')?.toString().trim()
    const matterType = formData.get('matterType')?.toString() || null
    const notes = formData.get('notes')?.toString().trim() || null

    if (!clientName) {
      return { ok: false, error: 'Client name is required' }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!clientEmail || !emailRegex.test(clientEmail)) {
      return { ok: false, error: 'Valid email is required' }
    }

    // Generate unique invite code (full UUID for security)
    const inviteCode = crypto.randomUUID().toUpperCase()

    // Create invitation record
    const supabase = supabaseAdmin()
    const { data: invitation, error } = await supabase
      .from('client_invitations')
      .insert({
        invite_code: inviteCode,
        client_name: clientName,
        client_email: clientEmail,
        matter_type: matterType,
        notes: notes,
        status: 'pending',
        invited_by: session.user.id,
      })
      .select()
      .single()

    if (error || !invitation) {
      console.error('Error creating invitation:', error)
      return { ok: false, error: error?.message || 'Failed to create invitation' }
    }

    // Auto-create matter for this invitation
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const { data: matter, error: matterError } = await supabase
      .from('matters')
      .insert({
        title: `${matterType || 'General'} for ${clientName}`,
        matter_type: matterType || 'General',
        stage: 'Intake Sent',
        responsible_party: 'client',
        next_action: 'Complete intake form',
        next_action_due_date: dueDate.toISOString().split('T')[0],
        billing_model: 'hourly',
        owner_id: session.user.id,
        client_name: clientName,
        client_email: clientEmail,
        invitation_id: invitation.id,
      })
      .select('id')
      .single()

    if (matterError) {
      console.error('Error creating matter for invitation:', matterError)
      // Don't fail the invitation if matter creation fails
    }

    // Link matter back to invitation
    if (matter) {
      await supabase
        .from('client_invitations')
        .update({ matter_id: matter.id })
        .eq('id', invitation.id)
    }

    // Generate invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/intake/invite/${inviteCode}`

    // Send invitation email via Gmail (non-blocking)
    try {
      // Fetch practice settings for Gmail OAuth credentials
      const { data: settings } = await supabase
        .from('practice_settings')
        .select('google_refresh_token, contact_email, firm_name')
        .single()

      if (!settings?.google_refresh_token) {
        console.warn('Gmail not connected - skipping invitation email. Connect Google account in Settings.')
      } else if (!settings?.contact_email) {
        console.warn('Contact email not configured - skipping invitation email. Add contact email in Settings.')
      } else {
        const { sendInvitationEmail } = await import('@/lib/email/gmail-client')
        const message = notes
          ? `${notes}\n\nMatter type: ${matterType || 'Not specified'}`
          : matterType
            ? `Matter type: ${matterType}`
            : undefined

        const result = await sendInvitationEmail(
          {
            to: clientEmail,
            clientName: clientName,
            inviteCode: inviteCode,
            inviteLink: inviteLink,
            lawyerName: profile?.full_name || settings.firm_name || 'Your Lawyer',
            message: message,
          },
          settings.google_refresh_token,
          settings.contact_email
        )

        if (!result.ok) {
          console.error('Failed to send invitation email:', result.error)
        }
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the whole operation if email fails
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: session.user.id,
      event_type: 'client_invited',
      entity_type: 'client_invitation',
      entity_id: invitation.id,
      metadata: {
        client_email: clientEmail,
        matter_type: matterType,
        matter_id: matter?.id || null,
      } as Json,
    })

    revalidatePath('/clients')

    return {
      ok: true,
      inviteCode: inviteCode,
      inviteLink: inviteLink,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('inviteClient error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Resend invitation email
 */
export async function resendInvitationEmail(invitationId: string): Promise<{
  ok: boolean
  error?: string
}> {
  try {
    const { session, profile } = await getSessionWithProfile()
    if (!session) {
      return { ok: false, error: 'Not authenticated' }
    }

    const role = profile?.role as 'admin' | 'staff' | 'client' | undefined
    if (!role || !['admin', 'staff'].includes(role)) {
      return { ok: false, error: 'Only staff and admins can resend invitations' }
    }

    const supabase = supabaseAdmin()

    // Get invitation
    const { data: invitation, error } = await supabase
      .from('client_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (error || !invitation) {
      return { ok: false, error: 'Invitation not found' }
    }

    // Get practice settings
    const { data: settings } = await supabase
      .from('practice_settings')
      .select('google_refresh_token, contact_email, firm_name')
      .single()

    if (!settings?.google_refresh_token) {
      return { ok: false, error: 'Gmail not connected. Please connect Google account in Settings.' }
    }

    if (!settings?.contact_email) {
      return { ok: false, error: 'Contact email not configured. Please add contact email in Settings.' }
    }

    // Generate invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/intake/invite/${invitation.invite_code}`

    // Send email
    const { sendInvitationEmail } = await import('@/lib/email/gmail-client')
    const result = await sendInvitationEmail(
      {
        to: invitation.client_email,
        clientName: invitation.client_name,
        inviteCode: invitation.invite_code,
        inviteLink: inviteLink,
        lawyerName: profile?.full_name || settings.firm_name || 'Your Lawyer',
        message: invitation.notes || undefined,
      },
      settings.google_refresh_token,
      settings.contact_email
    )

    if (!result.ok) {
      return { ok: false, error: result.error || 'Failed to send email' }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: session.user.id,
      event_type: 'invitation_email_resent',
      entity_type: 'client_invitation',
      entity_id: invitation.id,
      metadata: {
        client_email: invitation.client_email,
      } as Json,
    })

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('resendInvitationEmail error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<{
  ok: boolean
  error?: string
}> {
  try {
    const { session, profile } = await getSessionWithProfile()
    if (!session) {
      return { ok: false, error: 'Not authenticated' }
    }

    const role = profile?.role as 'admin' | 'staff' | 'client' | undefined
    if (!role || !['admin', 'staff'].includes(role)) {
      return { ok: false, error: 'Only staff and admins can cancel invitations' }
    }

    const supabase = supabaseAdmin()

    const { error } = await supabase
      .from('client_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)

    if (error) {
      return { ok: false, error: error.message }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: session.user.id,
      event_type: 'invitation_cancelled',
      entity_type: 'client_invitation',
      entity_id: invitationId,
      metadata: {} as Json,
    })

    revalidatePath('/clients')
    revalidatePath(`/admin/invitations/${invitationId}`)

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('cancelInvitation error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Extend an invitation by 7 days
 */
export async function extendInvitation(invitationId: string): Promise<{
  ok: boolean
  error?: string
}> {
  try {
    const { session, profile } = await getSessionWithProfile()
    if (!session) {
      return { ok: false, error: 'Not authenticated' }
    }

    const role = profile?.role as 'admin' | 'staff' | 'client' | undefined
    if (!role || !['admin', 'staff'].includes(role)) {
      return { ok: false, error: 'Only staff and admins can extend invitations' }
    }

    const supabase = supabaseAdmin()

    // Calculate new expiration date (7 days from now)
    const newExpiration = new Date()
    newExpiration.setDate(newExpiration.getDate() + 7)

    const { error } = await supabase
      .from('client_invitations')
      .update({
        expires_at: newExpiration.toISOString(),
        status: 'pending', // Reset to pending if it was expired
      })
      .eq('id', invitationId)

    if (error) {
      return { ok: false, error: error.message }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: session.user.id,
      event_type: 'invitation_extended',
      entity_type: 'client_invitation',
      entity_id: invitationId,
      metadata: {
        new_expiration: newExpiration.toISOString(),
      } as Json,
    })

    revalidatePath('/clients')
    revalidatePath(`/admin/invitations/${invitationId}`)

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('extendInvitation error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Practice Settings Actions
 */

export async function updatePracticeSettings(
  settings: Partial<{
    firmName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    defaultHourlyRate: number;
    paymentTermsDays: number;
    lateFeePercentage: number;
    matterTypes: string[];
    billingIncrementMinutes: number;
  }>
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { error: "Not authenticated" };
  }

  // Ensure admin role
  try {
    const authResult = await ensureStaffOrAdmin();
    if ("error" in authResult) {
      return { error: authResult.error };
    }
    if (authResult.profile?.role !== "admin") {
      return { error: "Only admins can update practice settings" };
    }
  } catch (e) {
    return { error: "Authorization failed" };
  }

  // Get current settings to find ID
  const { data: current } = await supabase
    .from("practice_settings")
    .select("id")
    .maybeSingle();

  if (!current) {
    return { error: "Practice settings not found" };
  }

  // Convert camelCase to snake_case for database
  const dbSettings: Record<string, unknown> = {};
  if (settings.firmName !== undefined) dbSettings.firm_name = settings.firmName;
  if (settings.contactEmail !== undefined)
    dbSettings.contact_email = settings.contactEmail;
  if (settings.contactPhone !== undefined)
    dbSettings.contact_phone = settings.contactPhone;
  if (settings.address !== undefined) dbSettings.address = settings.address;
  if (settings.defaultHourlyRate !== undefined)
    dbSettings.default_hourly_rate = settings.defaultHourlyRate;
  if (settings.paymentTermsDays !== undefined)
    dbSettings.payment_terms_days = settings.paymentTermsDays;
  if (settings.lateFeePercentage !== undefined)
    dbSettings.late_fee_percentage = settings.lateFeePercentage;
  if (settings.matterTypes !== undefined)
    dbSettings.matter_types = settings.matterTypes;
  if (settings.billingIncrementMinutes !== undefined)
    dbSettings.billing_increment_minutes = settings.billingIncrementMinutes;

  dbSettings.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("practice_settings")
    .update(dbSettings)
    .eq("id", current.id);

  if (error) {
    console.error("Error updating practice settings:", error);
    return { error: error.message };
  }

  // Log to audit - note: logAction is not imported, will add in next edit
  try {
    await supabase.from("audit_logs").insert({
      event_type: "update_practice_settings",
      actor_id: session.user.id,
      metadata: settings as any,
    });
  } catch (logError) {
    console.error("Failed to log action:", logError);
  }

  revalidatePath("/settings");
  return { ok: true };
}

// Info Request Actions

/**
 * Create an info request to ask client for additional information
 * Used when intake response needs clarification or additional data
 */
export async function createInfoRequest(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    // Parse and validate input
    const intakeResponseId = formData.get("intakeResponseId") as string;
    const questionsJson = formData.get("questions") as string;
    const message = formData.get("message") as string | null;
    const documentsJson = formData.get("documents") as string | null;
    const deadline = formData.get("deadline") as string | null;

    const questions = JSON.parse(questionsJson);
    const documents = documentsJson ? JSON.parse(documentsJson) : undefined;

    const validated = infoRequestSchema.parse({
      intakeResponseId,
      questions,
      message: message || undefined,
      documents,
      deadline: deadline || undefined,
    });

    // Insert info request
    const { data: infoRequest, error: insertError } = await supabase
      .from("info_requests")
      .insert({
        intake_response_id: validated.intakeResponseId,
        requested_by: roleCheck.session.user.id,
        questions: validated.questions as any,
        message: validated.message || null,
        documents: validated.documents || null,
        response_deadline: validated.deadline || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create info request:", insertError);
      return { ok: false, error: insertError.message };
    }

    // Update intake response review status to 'under_review'
    const { error: updateError } = await supabase
      .from("intake_responses")
      .update({ review_status: "under_review" })
      .eq("id", validated.intakeResponseId);

    if (updateError) {
      console.error("Failed to update intake response status:", updateError);
      // Don't fail the whole operation if status update fails
    }

    // Log to audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "create_info_request",
      entityType: "info_request",
      entityId: infoRequest.id,
      metadata: {
        intake_response_id: validated.intakeResponseId,
        questions_count: validated.questions.length,
      },
    });

    // Send email notification to client about info request
    try {
      // Get intake response with matter and client info
      const { data: intakeResponse } = await supabase
        .from("intake_responses")
        .select(`
          matter_id,
          matters:matter_id (
            id,
            client_id,
            profiles:client_id (
              full_name,
              user_id
            )
          )
        `)
        .eq("id", validated.intakeResponseId)
        .single();

      if (intakeResponse?.matters) {
        const matter = intakeResponse.matters as any;
        const clientProfile = matter.profiles;

        if (clientProfile?.user_id) {
          // Get client's email
          const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(
            clientProfile.user_id
          );

          // Get lawyer's name
          const { data: lawyerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", roleCheck.session.user.id)
            .single();

          if (clientUser?.email) {
            const { sendInfoRequestEmail } = await import("@/lib/email/actions");
            await sendInfoRequestEmail({
              to: clientUser.email,
              clientName: clientProfile.full_name || "Client",
              lawyerName: lawyerProfile?.full_name || "Your Attorney",
              matterId: matter.id,
              infoRequestId: infoRequest.id,
              message: validated.message,
              deadline: validated.deadline,
            });
          }
        }
      }
    } catch (emailError) {
      console.error("Failed to send info request email:", emailError);
      // Don't fail the operation if email fails
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/intake");

    return { ok: true, data: infoRequest };
  } catch (err) {
    console.error("Error creating info request:", err);
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((e) => e.message).join(", ") };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create info request" };
  }
}

/**
 * Submit response to an info request
 * Used by clients to provide requested additional information
 */
export async function submitInfoResponse(formData: FormData): Promise<ActionResult> {
  const { session } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" };
  }

  try {
    const supabase = ensureSupabase();

    // Parse and validate input
    const infoRequestId = formData.get("infoRequestId") as string;
    const responsesJson = formData.get("responses") as string;

    const responses = JSON.parse(responsesJson);

    const validated = infoResponseSchema.parse({
      infoRequestId,
      responses,
    });

    // Update info request with responses
    const { data: updatedRequest, error: updateError } = await supabase
      .from("info_requests")
      .update({
        responses: validated.responses as any,
        status: "completed",
        responded_at: new Date().toISOString(),
      })
      .eq("id", validated.infoRequestId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to submit info response:", updateError);
      return { ok: false, error: updateError.message };
    }

    // Update intake response review status back to 'under_review'
    // so it appears in lawyer's review queue
    const { error: statusError } = await supabase
      .from("intake_responses")
      .update({ review_status: "under_review" })
      .eq("id", updatedRequest.intake_response_id);

    if (statusError) {
      console.error("Failed to update intake response status:", statusError);
      // Don't fail the whole operation if status update fails
    }

    // Send email notification to lawyer about completed info request
    try {
      // Get info request with lawyer and matter details
      const { data: infoRequestDetails } = await supabase
        .from("info_requests")
        .select(`
          requested_by,
          questions,
          intake_responses:intake_response_id (
            matter_id,
            matters:matter_id (
              id,
              title,
              client_id,
              profiles:client_id (
                full_name
              )
            )
          )
        `)
        .eq("id", validated.infoRequestId)
        .single();

      if (infoRequestDetails?.requested_by) {
        // Get lawyer's email and name
        const { data: { user: lawyerUser } } = await supabase.auth.admin.getUserById(
          infoRequestDetails.requested_by
        );
        const { data: lawyerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", infoRequestDetails.requested_by)
          .single();

        const intakeResponse = infoRequestDetails.intake_responses as any;
        const matter = intakeResponse?.matters;
        const clientProfile = matter?.profiles;

        if (lawyerUser?.email && matter) {
          const { sendInfoResponseReceivedEmail } = await import("@/lib/email/actions");
          await sendInfoResponseReceivedEmail({
            to: lawyerUser.email,
            lawyerName: lawyerProfile?.full_name || "Attorney",
            clientName: clientProfile?.full_name || "Client",
            matterTitle: matter.title,
            matterId: matter.id,
            infoRequestId: validated.infoRequestId,
            questionCount: Array.isArray(infoRequestDetails.questions)
              ? infoRequestDetails.questions.length
              : 0,
          });
        }
      }
    } catch (emailError) {
      console.error("Failed to send info response email:", emailError);
      // Don't fail the operation if email fails
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/intake");

    return { ok: true, data: updatedRequest };
  } catch (err) {
    console.error("Error submitting info response:", err);
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((e) => e.message).join(", ") };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Failed to submit info response" };
  }
}

/**
 * Decline an intake form
 * Updates status and sends notification to client
 */
export async function declineIntakeForm(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const intakeResponseId = formData.get("intakeResponseId") as string;
    const reason = formData.get("reason") as string;
    const notes = formData.get("notes") as string | null;

    const validated = declineIntakeSchema.parse({
      intakeResponseId,
      reason,
      notes: notes || undefined,
    });

    // Get intake response with matter
    const { data: intakeResponse, error: fetchError } = await supabase
      .from("intake_responses")
      .select("matter_id")
      .eq("id", validated.intakeResponseId)
      .single();

    if (fetchError || !intakeResponse) {
      return { ok: false, error: "Intake response not found" };
    }

    // Update intake response status
    const { error: updateError } = await supabase
      .from("intake_responses")
      .update({
        status: "declined",
        review_status: "declined",
        decline_reason: validated.reason,
        internal_notes: validated.notes || null,
        reviewed_by: roleCheck.session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", validated.intakeResponseId);

    if (updateError) {
      console.error("Failed to decline intake:", updateError);
      return { ok: false, error: updateError.message };
    }

    // Update matter stage to "Declined"
    const { error: matterError } = await supabase
      .from("matters")
      .update({
        stage: "Declined",
        next_action: "Follow up if client reapplies",
        responsible_party: "lawyer",
      })
      .eq("id", intakeResponse.matter_id);

    if (matterError) {
      console.error("Failed to update matter stage:", matterError);
      return { ok: false, error: "Failed to update matter status: " + matterError.message };
    }

    // Log to audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "decline_intake",
      entityType: "intake_response",
      entityId: validated.intakeResponseId,
      metadata: {
        reason: validated.reason,
        notes: validated.notes,
      },
    });

    // Send email notification to client
    try {
      // Fetch matter with client details
      const { data: matter } = await supabase
        .from("matters")
        .select(`
          title,
          client_id,
          profiles:client_id (
            full_name,
            user_id
          )
        `)
        .eq("id", intakeResponse.matter_id)
        .single();

      if (matter) {
        const clientProfile = matter.profiles as any;

        // Get client email
        if (clientProfile?.user_id) {
          const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(
            clientProfile.user_id
          );

          // Get lawyer name (person declining)
          const { data: lawyerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", roleCheck.session.user.id)
            .single();

          if (clientUser?.email) {
            const { sendIntakeDeclinedEmail } = await import("@/lib/email/actions");
            await sendIntakeDeclinedEmail({
              to: clientUser.email,
              clientName: clientProfile.full_name || "Client",
              matterTitle: matter.title,
              matterId: intakeResponse.matter_id,
              lawyerName: lawyerProfile?.full_name || "Your attorney",
              reason: validated.reason,
              notes: validated.notes,
            });
          }
        }
      }
    } catch (emailError) {
      console.error("Failed to send intake declined email:", emailError);
      // Don't fail the decline action if email fails
    }

    revalidatePath("/admin/intake");
    revalidatePath(`/admin/intake/${validated.intakeResponseId}`);

    return { ok: true };
  } catch (err) {
    console.error("Error declining intake:", err);
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((e) => e.message).join(", ") };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Failed to decline intake" };
  }
}

/**
 * Schedule a consultation call for an intake
 * Creates a task and sends calendar invite to client
 */
export async function scheduleCallAction(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const intakeResponseId = formData.get("intakeResponseId") as string;
    const dateTime = formData.get("dateTime") as string;
    const durationStr = formData.get("duration") as string;
    const duration = parseInt(durationStr);
    const meetingType = formData.get("meetingType") as string;
    const meetingLink = formData.get("meetingLink") as string | null;
    const notes = formData.get("notes") as string | null;

    // Validate duration is a valid number
    if (isNaN(duration)) {
      return { ok: false, error: "Invalid duration value" };
    }

    const validated = scheduleCallSchema.parse({
      intakeResponseId,
      dateTime,
      duration,
      meetingType,
      meetingLink: meetingLink || undefined,
      notes: notes || undefined,
    });

    // Get intake response with matter
    const { data: intakeResponse, error: fetchError } = await supabase
      .from("intake_responses")
      .select("*, matters!intake_responses_matter_id_fkey(id, title, client_id)")
      .eq("id", validated.intakeResponseId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch intake response:", fetchError);
      return { ok: false, error: fetchError.message };
    }

    if (!intakeResponse) {
      return { ok: false, error: "Intake response not found" };
    }

    const matter = intakeResponse.matters;

    // Validate matter exists
    if (!matter || !matter.id) {
      return { ok: false, error: "Associated matter not found" };
    }

    // Create task for the call
    const taskDescription = JSON.stringify({
      meetingType: validated.meetingType,
      meetingLink: validated.meetingLink,
      duration: validated.duration,
      notes: validated.notes,
    });

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        matter_id: matter.id,
        title: "Consultation Call",
        description: taskDescription,
        due_date: validated.dateTime,
        status: "open",
        responsible_party: "client",
      })
      .select()
      .single();

    if (taskError) {
      console.error("Failed to create task:", taskError);
      return { ok: false, error: taskError.message };
    }

    // Log to audit
    try {
      await logAudit({
        supabase,
        actorId: roleCheck.session.user.id,
        eventType: "schedule_call",
        entityType: "task",
        entityId: task.id,
        metadata: {
          intake_response_id: validated.intakeResponseId,
          meeting_type: validated.meetingType,
          date_time: validated.dateTime,
        },
      });
    } catch (auditError) {
      console.warn("Failed to log audit entry for schedule_call:", auditError);
      // Don't fail the operation if audit logging fails
    }

    // Auto-create calendar event for the scheduled call
    if (task?.id && validated.dateTime) {
      try {
        const { createCalendarEventForTask } = await import("@/lib/calendar/actions");
        await createCalendarEventForTask(
          task.id,
          "Consultation Call",
          validated.dateTime,
          matter.id,
          "scheduled_call"
        );
      } catch (calErr) {
        console.error("Failed to create calendar event for scheduled call:", calErr);
      }
    }

    revalidatePath("/admin/intake");
    revalidatePath(`/admin/intake/${validated.intakeResponseId}`);
    revalidatePath(`/admin/matters/${matter.id}`);

    return { ok: true, data: task };
  } catch (err) {
    console.error("Error scheduling call:", err);
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((e) => e.message).join(", ") };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Failed to schedule call" };
  }
}

/**
 * Update internal notes for an intake response
 * Used for lawyer's private notes, not visible to client
 */
export async function updateIntakeNotes(
  intakeResponseId: string,
  notes: string
): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    // Validate inputs
    const validated = updateIntakeNotesSchema.parse({
      intakeResponseId,
      notes,
    });

    const supabase = ensureSupabase();

    // Verify intake response exists
    const { data: existingIntake, error: fetchError } = await supabase
      .from("intake_responses")
      .select("id")
      .eq("id", validated.intakeResponseId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch intake response:", fetchError);
      return { ok: false, error: fetchError.message };
    }

    if (!existingIntake) {
      return { ok: false, error: "Intake response not found" };
    }

    // Update internal notes
    const { error: updateError } = await supabase
      .from("intake_responses")
      .update({ internal_notes: validated.notes })
      .eq("id", validated.intakeResponseId);

    if (updateError) {
      console.error("Failed to update intake notes:", updateError);
      return { ok: false, error: updateError.message };
    }

    // Log to audit
    // Note: No path revalidation - internal notes are staff-only and not displayed in cached pages
    // This is a background auto-save operation
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "update_intake_notes",
      entityType: "intake_response",
      entityId: validated.intakeResponseId,
      metadata: {
        notes_length: validated.notes.length,
        action: validated.notes.length === 0 ? 'cleared' : 'updated',
      },
    });

    return { ok: true };
  } catch (err) {
    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((e) => e.message).join(", ") };
    }
    console.error("Error updating intake notes:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update notes" };
  }
}

// ============================================================================
// Client Profile Actions
// ============================================================================

export async function updateClientProfile(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const rawData = {
      userId: formData.get("userId") as string,
      phone: formData.get("phone") as string || undefined,
      phoneType: formData.get("phoneType") as string || undefined,
      phoneSecondary: formData.get("phoneSecondary") as string || undefined,
      phoneSecondaryType: formData.get("phoneSecondaryType") as string || undefined,
      companyName: formData.get("companyName") as string || undefined,
      addressStreet: formData.get("addressStreet") as string || undefined,
      addressCity: formData.get("addressCity") as string || undefined,
      addressState: formData.get("addressState") as string || undefined,
      addressZip: formData.get("addressZip") as string || undefined,
      addressCountry: formData.get("addressCountry") as string || undefined,
      emergencyContactName: formData.get("emergencyContactName") as string || undefined,
      emergencyContactPhone: formData.get("emergencyContactPhone") as string || undefined,
      preferredContactMethod: formData.get("preferredContactMethod") as string || undefined,
      internalNotes: formData.get("internalNotes") as string || undefined,
    };

    const parsed = updateClientProfileSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Validation failed" };
    }

    const { userId, ...profileData } = parsed.data;

    // Build update object with only defined values
    const updateData: Record<string, string | null> = {};
    if (profileData.phone !== undefined) updateData.phone = profileData.phone || null;
    if (profileData.phoneType !== undefined) updateData.phone_type = profileData.phoneType || null;
    if (profileData.phoneSecondary !== undefined) updateData.phone_secondary = profileData.phoneSecondary || null;
    if (profileData.phoneSecondaryType !== undefined) updateData.phone_secondary_type = profileData.phoneSecondaryType || null;
    if (profileData.companyName !== undefined) updateData.company_name = profileData.companyName || null;
    if (profileData.addressStreet !== undefined) updateData.address_street = profileData.addressStreet || null;
    if (profileData.addressCity !== undefined) updateData.address_city = profileData.addressCity || null;
    if (profileData.addressState !== undefined) updateData.address_state = profileData.addressState || null;
    if (profileData.addressZip !== undefined) updateData.address_zip = profileData.addressZip || null;
    if (profileData.addressCountry !== undefined) updateData.address_country = profileData.addressCountry || null;
    if (profileData.emergencyContactName !== undefined) updateData.emergency_contact_name = profileData.emergencyContactName || null;
    if (profileData.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = profileData.emergencyContactPhone || null;
    if (profileData.preferredContactMethod !== undefined) updateData.preferred_contact_method = profileData.preferredContactMethod || null;
    if (profileData.internalNotes !== undefined) updateData.internal_notes = profileData.internalNotes || null;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating client profile:", error);
      return { error: "Failed to update client profile" };
    }

    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "client_profile_updated",
      entityType: "profile",
      entityId: userId,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    revalidatePath(`/clients/${userId}`);
    revalidatePath("/clients");

    return { ok: true };
  } catch (error) {
    console.error("Error in updateClientProfile:", error);
    return { error: "An unexpected error occurred" };
  }
}

// Firm Settings Actions

// Schema for branding-related settings (validated when present)
const brandingSettingsSchema = z.object({
  firm_name: z.string().min(1, "Firm name is required").max(100).optional(),
  tagline: z.string().max(200).optional(),
  logo_url: z.string().url("Invalid URL").nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  reply_to_email: z.string().email("Invalid email").nullable().optional(),
  footer_text: z.string().max(500).nullable().optional(),
});

// Schema for automation settings (all string values for enabled/hours/days)
const automationSettingsSchema = z.object({
  automation_intake_reminder_enabled: z.enum(["true", "false"]).optional(),
  automation_intake_reminder_hours: z.string().regex(/^\d+$/, "Must be a number").optional(),
  automation_client_idle_enabled: z.enum(["true", "false"]).optional(),
  automation_client_idle_days: z.string().regex(/^\d+$/, "Must be a number").optional(),
  automation_lawyer_idle_enabled: z.enum(["true", "false"]).optional(),
  automation_lawyer_idle_days: z.string().regex(/^\d+$/, "Must be a number").optional(),
  automation_invoice_reminder_enabled: z.enum(["true", "false"]).optional(),
  automation_invoice_reminder_days: z.string().regex(/^[\d,]+$/, "Must be comma-separated numbers").optional(),
  automation_invoice_first_reminder_days: z.string().regex(/^\d+$/, "Must be a number").optional(),
  automation_invoice_due_date_reminder: z.enum(["true", "false"]).optional(),
  automation_invoice_overdue_frequency_days: z.string().regex(/^\d+$/, "Must be a number").optional(),
});

// Combined schema for all firm settings
const firmSettingsSchema = brandingSettingsSchema.merge(automationSettingsSchema);

/**
 * Update firm settings (admin only)
 */
export async function updateFirmSettings(
  settings: Record<string, string | null>
): Promise<ActionResult> {
  const roleCheck = await ensureAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    // Filter to only known keys first
    const filteredSettings: Record<string, string | null> = {};
    for (const key of Object.keys(settings)) {
      if (FIRM_SETTING_KEYS.includes(key as FirmSettingKey)) {
        filteredSettings[key] = settings[key];
      }
    }

    // Validate filtered settings
    const parsed = firmSettingsSchema.safeParse(filteredSettings);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Validation failed" };
    }

    // Get list of valid keys to update
    const validKeys = Object.keys(filteredSettings);

    if (validKeys.length === 0) {
      return { error: "No valid settings to update" };
    }

    const supabase = ensureSupabase();

    // Update each setting
    for (const key of validKeys) {
      const { error } = await supabase
        .from("firm_settings")
        .update({
          value: filteredSettings[key],
          updated_at: new Date().toISOString(),
          updated_by: roleCheck.session.user.id,
        })
        .eq("key", key);

      if (error) {
        console.error(`Error updating firm setting ${key}:`, error);
        return { error: `Failed to update ${key}` };
      }
    }

    // Invalidate cache
    invalidateFirmSettingsCache();

    // Log to audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "firm_settings_updated",
      entityType: "firm_settings",
      entityId: null,
      metadata: { updatedKeys: validKeys },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/automations");
    revalidatePath("/settings");

    return { ok: true };
  } catch (error) {
    console.error("Error updating firm settings:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Sync Gmail emails for a specific matter
 */
export async function syncGmailForMatter(matterId: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  const supabase = ensureSupabase();

  // Get matter with client info
  const { data: matter, error: matterError } = await supabase
    .from("matters")
    .select("id, client_id")
    .eq("id", matterId)
    .single();

  if (matterError || !matter) {
    return { error: "Matter not found" };
  }

  if (!matter.client_id) {
    return { error: "Matter has no client assigned" };
  }

  // Get client email
  const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);
  if (!clientUser?.email) {
    return { error: "Client email not found" };
  }

  // Get practice-wide Google refresh token
  const { data: practiceSettings } = await supabase
    .from("practice_settings")
    .select("google_refresh_token")
    .limit(1)
    .single();

  if (!practiceSettings?.google_refresh_token) {
    return { error: "Google account not connected. Please connect in Settings > Integrations." };
  }

  const clientEmail = clientUser.email.toLowerCase();

  // Fetch emails to/from client
  const query = `from:${clientEmail} OR to:${clientEmail}`;
  const result = await fetchGmailEmails({
    refreshToken: practiceSettings.google_refresh_token,
    query,
    maxResults: 100,
  });

  if (!result.ok || !result.emails) {
    return { error: result.error || "Failed to fetch emails" };
  }

  let synced = 0;
  let skipped = 0;

  for (const email of result.emails) {
    // Check if already synced
    const { data: existing } = await supabase
      .from("matter_emails")
      .select("id")
      .eq("gmail_message_id", email.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Determine direction
    const fromEmail = extractEmailAddress(email.from);
    const direction = fromEmail === clientEmail ? "received" : "sent";

    // Generate AI summary
    const { summary, actionNeeded } = await summarizeEmail({
      subject: email.subject,
      snippet: email.snippet,
      direction,
    });

    // Insert into database
    const { error: insertError } = await supabase.from("matter_emails").insert({
      matter_id: matterId,
      gmail_message_id: email.id,
      thread_id: email.threadId,
      direction,
      from_email: email.from,
      to_email: email.to,
      subject: email.subject,
      snippet: email.snippet,
      ai_summary: summary,
      action_needed: actionNeeded,
      gmail_date: new Date(parseInt(email.internalDate)).toISOString(),
      gmail_link: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
    });

    if (!insertError) {
      synced++;
    }
  }

  await logAudit({
    supabase,
    actorId: roleCheck.session.user.id,
    eventType: "gmail_sync",
    entityType: "matter",
    entityId: matterId,
    metadata: { synced, skipped },
  });

  revalidatePath(`/matters/${matterId}`);
  return { ok: true, data: { synced, skipped } };
}

/**
 * Sync Gmail emails for a matter (internal function for cron jobs)
 * Does not require authentication - uses service role
 */
export async function syncGmailForMatterInternal(
  matterId: string,
  refreshToken: string
): Promise<{ ok: boolean; synced?: number; skipped?: number; error?: string }> {
  const supabase = supabaseAdmin();

  // Get matter with client info
  const { data: matter, error: matterError } = await supabase
    .from("matters")
    .select("id, client_id")
    .eq("id", matterId)
    .single();

  if (matterError || !matter) {
    return { ok: false, error: "Matter not found" };
  }

  if (!matter.client_id) {
    return { ok: false, error: "Matter has no client assigned" };
  }

  // Get client email
  const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);
  if (!clientUser?.email) {
    return { ok: false, error: "Client email not found" };
  }

  const clientEmail = clientUser.email.toLowerCase();

  // Fetch emails to/from client
  const query = `from:${clientEmail} OR to:${clientEmail}`;
  const result = await fetchGmailEmails({
    refreshToken,
    query,
    maxResults: 100,
  });

  if (!result.ok || !result.emails) {
    return { ok: false, error: result.error || "Failed to fetch emails" };
  }

  let synced = 0;
  let skipped = 0;

  for (const email of result.emails) {
    // Check if already synced
    const { data: existing } = await supabase
      .from("matter_emails")
      .select("id")
      .eq("gmail_message_id", email.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Determine direction
    const fromEmail = extractEmailAddress(email.from);
    const direction = fromEmail === clientEmail ? "received" : "sent";

    // Generate AI summary
    const { summary, actionNeeded } = await summarizeEmail({
      subject: email.subject,
      snippet: email.snippet,
      direction,
    });

    // Insert into database
    const { error: insertError } = await supabase.from("matter_emails").insert({
      matter_id: matterId,
      gmail_message_id: email.id,
      thread_id: email.threadId,
      direction,
      from_email: email.from,
      to_email: email.to,
      subject: email.subject,
      snippet: email.snippet,
      ai_summary: summary,
      action_needed: actionNeeded,
      gmail_date: new Date(parseInt(email.internalDate)).toISOString(),
      gmail_link: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
    });

    if (!insertError) {
      synced++;
    }
  }

  await logAudit({
    supabase,
    actorId: null, // System/cron action
    eventType: "gmail_sync_cron",
    entityType: "matter",
    entityId: matterId,
    metadata: { synced, skipped },
  });

  return { ok: true, synced, skipped };
}

/**
 * Disconnect Google account (remove refresh token)
 * Staff/Admin only
 */
export async function disconnectGoogle(): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  const supabase = supabaseAdmin();

  // Clear the Google refresh token from practice settings
  const { error } = await supabase
    .from("practice_settings")
    .update({
      google_refresh_token: null,
      google_connected_at: null,
    })
    .not("id", "is", null); // Update all rows (should be just one)

  if (error) {
    console.error("Failed to disconnect Google:", error);
    return { error: "Failed to disconnect Google account" };
  }

  await logAudit({
    supabase,
    actorId: roleCheck.session.user.id,
    eventType: "google_disconnected",
    entityType: "practice_settings",
    entityId: null,
    metadata: {},
  });

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Disconnect Square OAuth
 * Staff/Admin only
 */
export async function disconnectSquare(): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  if (!supabaseEnvReady()) {
    return { error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("id")
    .limit(1)
    .single();

  if (!settings) {
    return { error: "Practice settings not found" };
  }

  const { error } = await supabase
    .from("practice_settings")
    .update({
      square_access_token: null,
      square_refresh_token: null,
      square_merchant_id: null,
      square_location_id: null,
      square_location_name: null,
      square_connected_at: null,
    })
    .eq("id", settings.id);

  if (error) {
    console.error("Error disconnecting Square:", error);
    return { error: "Failed to disconnect Square" };
  }

  await logAudit({
    supabase,
    actorId: roleCheck.session.user.id,
    eventType: "square_disconnected",
    entityType: "practice_settings",
    entityId: settings.id,
    metadata: {},
  });

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Save Square webhook signature key
 * Staff/Admin only
 */
export async function saveSquareWebhookKey(
  signatureKey: string
): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  if (!supabaseEnvReady()) {
    return { error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("id")
    .limit(1)
    .single();

  if (!settings) {
    return { error: "Practice settings not found" };
  }

  const { error } = await supabase
    .from("practice_settings")
    .update({
      square_webhook_signature_key: signatureKey,
    })
    .eq("id", settings.id);

  if (error) {
    console.error("Error saving webhook key:", error);
    return { error: "Failed to save webhook key" };
  }

  await logAudit({
    supabase,
    actorId: roleCheck.session.user.id,
    eventType: "square_webhook_key_updated",
    entityType: "practice_settings",
    entityId: settings.id,
    metadata: {},
  });

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Resend intake reminder email to client
 * Staff/Admin only
 */
export async function resendIntakeReminder(matterId: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  const supabase = supabaseAdmin();

  // Get matter with client info
  const { data: matter, error: matterError } = await supabase
    .from("matters")
    .select("id, title, stage, client_id, matter_type")
    .eq("id", matterId)
    .single();

  if (matterError || !matter) {
    return { error: "Matter not found" };
  }

  if (matter.stage !== "Intake Sent") {
    return { error: "Matter is not in 'Intake Sent' stage" };
  }

  if (!matter.client_id) {
    return { error: "Matter has no client assigned" };
  }

  // Get client email
  const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);
  if (!clientUser?.email) {
    return { error: "Client email not found" };
  }

  // Get client profile for name
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", matter.client_id)
    .single();

  // Get practice settings for Gmail
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("google_refresh_token, contact_email, firm_name")
    .single();

  if (!settings?.google_refresh_token) {
    return { error: "Gmail not connected. Please connect Google in Settings > Integrations." };
  }

  if (!settings?.contact_email) {
    return { error: "Contact email not configured. Please add it in Settings > Practice." };
  }

  // Generate intake link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const intakeLink = `${appUrl}/intake/${matterId}`;

  // Send reminder email
  try {
    const { sendGmailEmail } = await import("@/lib/email/gmail-client");
    const { render } = await import("@react-email/render");
    const { default: IntakeReminderEmail } = await import("@/lib/email/templates/intake-reminder");

    const html = await render(
      IntakeReminderEmail({
        clientName: clientProfile?.full_name || "Client",
        matterTitle: matter.title,
        intakeLink,
        daysWaiting: 0, // Manual reminder, no auto-calculated days
      })
    );

    const result = await sendGmailEmail({
      to: clientUser.email,
      subject: `Reminder: Please complete your intake form - ${matter.title}`,
      html,
      refreshToken: settings.google_refresh_token,
      fromEmail: settings.contact_email,
      fromName: settings.firm_name || undefined,
    });

    if (!result.ok) {
      return { error: result.error || "Failed to send email" };
    }
  } catch (emailError) {
    console.error("Failed to send intake reminder:", emailError);
    return { error: "Failed to send reminder email" };
  }

  await logAudit({
    supabase,
    actorId: roleCheck.session.user.id,
    eventType: "intake_reminder_sent",
    entityType: "matter",
    entityId: matterId,
    metadata: { clientEmail: clientUser.email },
  });

  return { ok: true };
}
