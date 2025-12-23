"use server";

import { revalidatePath } from "next/cache";

import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

type ActionResult = { error?: string; ok?: boolean };

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
    const responsible = (formData.get("responsibleParty") as string) || "lawyer";
    const nextAction = (formData.get("nextAction") as string) || null;
    const nextActionDueDate = (formData.get("nextActionDueDate") as string) || null;

    // Validation: Next Action and Due Date are required
    if (!nextAction) {
      return { error: "Next Action is required" };
    }
    if (!nextActionDueDate) {
      return { error: "Next Action Due Date is required" };
    }

    const { error } = await supabase.from("matters").insert({
      title,
      owner_id: ownerId,
      client_id: clientId,
      matter_type: matterType,
      billing_model: billingModel,
      responsible_party: responsible,
      next_action: nextAction,
      next_action_due_date: nextActionDueDate,
    });

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "matter_created",
      entityType: "matter",
      entityId: null,
      metadata: { title, nextAction, nextActionDueDate },
    });
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

    const { error } = await supabase.from("tasks").insert({
      title,
      matter_id: matterId,
      due_date: dueDate,
      responsible_party: responsible,
      status: "open",
    });

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_created",
      entityType: "task",
      entityId: null,
      metadata: { title, matterId },
    });
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
    revalidatePath("/billing");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}