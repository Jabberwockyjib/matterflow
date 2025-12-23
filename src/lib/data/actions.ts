"use server";

import { revalidatePath } from "next/cache";

import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";

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
  metadata?: Record<string, unknown>;
}) => {
  try {
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata || {},
    });
  } catch {
    // do not block primary flow on audit failure
  }
};

export async function createMatter(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const title = (formData.get("title") as string) || "Untitled Matter";
    const ownerId = (formData.get("ownerId") as string) || null;
    const clientId = (formData.get("clientId") as string) || null;
    const matterType = (formData.get("matterType") as string) || "General";
    const billingModel = (formData.get("billingModel") as string) || "hourly";
    const responsible = (formData.get("responsibleParty") as string) || "lawyer";
    const nextAction = (formData.get("nextAction") as string) || null;

    const { error } = await supabase.from("matters").insert({
      title,
      owner_id: ownerId,
      client_id: clientId,
      matter_type: matterType,
      billing_model: billingModel,
      responsible_party: responsible,
      next_action: nextAction,
    });

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "matter_created",
      entityType: "matter",
      entityId: null,
      metadata: { title },
    });
    revalidatePath("/");
    revalidatePath("/matters");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const title = (formData.get("title") as string) || "New Task";
    const matterId = (formData.get("matterId") as string) || null;
    const dueDate = (formData.get("dueDate") as string) || null;
    const responsible = (formData.get("responsibleParty") as string) || "lawyer";

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

export async function createInvoice(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const matterId = (formData.get("matterId") as string) || null;
    const amount = Number(formData.get("amount")) || 0;
    const status = (formData.get("status") as string) || "draft";

    const { error } = await supabase.from("invoices").insert({
      matter_id: matterId,
      total_cents: Math.max(0, Math.round(amount * 100)),
      status,
      line_items: [{ description: "Line item", amount_cents: Math.max(0, Math.round(amount * 100)) }],
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

export async function createTimeEntry(
  formData: FormData,
): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const matterId = (formData.get("matterId") as string) || null;
    const taskId = (formData.get("taskId") as string) || null;
    const description = (formData.get("description") as string) || "Manual entry";
    const minutes = Number(formData.get("minutes")) || null;

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

export async function updateMatterStage(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;
    const stage = (formData.get("stage") as string) || null;
    const responsible = (formData.get("responsibleParty") as string) || null;
    const nextAction = (formData.get("nextAction") as string) || null;

    const { error } = await supabase
      .from("matters")
      .update({
        stage,
        responsible_party: responsible || undefined,
        next_action: nextAction,
      })
      .eq("id", id || "");

    if (error) return { error: error.message };
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "matter_updated",
      entityType: "matter",
      entityId: id,
      metadata: { stage, responsible, nextAction },
    });
    revalidatePath("/");
    revalidatePath("/matters");
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
      .update({ status })
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

export async function updateInvoiceStatus(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const id = (formData.get("id") as string) || null;
    const status = (formData.get("status") as string) || null;
    const { error } = await supabase
      .from("invoices")
      .update({ status })
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
      metadata: { endedAt, durationMinutes },
    });
    revalidatePath("/time");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
