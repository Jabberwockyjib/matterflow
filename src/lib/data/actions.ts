"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { render } from "@react-email/components";

import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import { sendMatterCreatedEmail, sendTaskAssignedEmail, sendInvoiceEmail } from "@/lib/email/actions";
import { resend, FROM_EMAIL } from "@/lib/email/client";
import UserInvitationEmail from "@/lib/email/templates/user-invitation";
import { inviteUserSchema } from "@/lib/validation/schemas";

type ActionResult = { error?: string; ok?: boolean };
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
              if (syncResult.ok && syncResult.data?.paymentUrl) {
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
              if (urlResult.ok && urlResult.data?.paymentUrl) {
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
  const { profile } = await getSessionWithProfile();
  if (profile?.role !== "admin") {
    return { success: false, error: "Only admins can invite users" };
  }

  // Validate input
  const validated = inviteUserSchema.safeParse(data);
  if (!validated.success) {
    const errors = validated.error.errors;
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
        invited_by: profile?.user_id,
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
      const emailHtml = render(
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
      actor_id: profile?.user_id,
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
    const { profile } = await getSessionWithProfile();
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
    const { profile } = await getSessionWithProfile();
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
      actor_id: profile?.user_id,
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