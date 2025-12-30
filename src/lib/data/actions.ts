"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { render } from "@react-email/components";

import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Json } from "@/types/database.types";
import { sendMatterCreatedEmail, sendTaskAssignedEmail, sendInvoiceEmail } from "@/lib/email/actions";
import { resend, FROM_EMAIL } from "@/lib/email/client";
import UserInvitationEmail from "@/lib/email/templates/user-invitation";
import AdminPasswordResetEmail from "@/lib/email/templates/admin-password-reset";
import { inviteUserSchema, passwordResetSchema, changePasswordSchema } from "@/lib/validation/schemas";
import { z } from "zod";

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

    if (!matterId) {
      return { error: "Matter ID is required" };
    }

    const { data: newTask, error } = await supabase.from("tasks").insert({
      title,
      matter_id: matterId,
      due_date: dueDate,
      responsible_party: responsible,
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

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "Welcome to MatterFlow™",
        html: emailHtml,
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

      await resend.emails.send({
        from: FROM_EMAIL,
        to: authUser.user.email || "",
        subject: "Your MatterFlow™ password was reset",
        html: emailHtml,
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
    const supabase = supabaseAdmin();
    const { data: matters } = await supabase
      .from("matters")
      .select("id, title, matter_type, profiles:client_id (full_name)")
      .or(`title.ilike.%${query}%`)
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
): Promise<{ error?: string }> {
  try {
    const supabase = supabaseAdmin();

    // Update the time entry with ended_at timestamp
    const { error } = await supabase
      .from("time_entries")
      .update({
        ended_at: new Date().toISOString(),
        description: notes || undefined,
      })
      .eq("id", entryId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/time");
    return {};
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

    // Generate invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/intake/invite/${inviteCode}`

    // Send invitation email (non-blocking)
    try {
      const { sendInvitationEmail } = await import('@/lib/email/client')
      const message = notes
        ? `${notes}\n\nMatter type: ${matterType || 'Not specified'}`
        : matterType
          ? `Matter type: ${matterType}`
          : undefined

      await sendInvitationEmail({
        to: clientEmail,
        clientName: clientName,
        inviteCode: inviteCode,
        inviteLink: inviteLink,
        lawyerName: profile?.full_name || 'Your Lawyer',
        message: message,
      })
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