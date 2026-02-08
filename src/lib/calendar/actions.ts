"use server";

import { revalidatePath } from "next/cache";
import { ensureSupabase, ensureStaffOrAdmin } from "@/lib/auth/authorization";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import { calendarEventSchema } from "@/lib/validation/schemas";

type ActionResult = {
  ok?: boolean;
  error?: string;
  data?: unknown;
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

/**
 * Push a calendar event to Google Calendar (non-blocking).
 * Returns updated sync fields or null on failure.
 */
async function pushToGoogleCalendar(
  event: {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    start_time: string;
    end_time: string;
    all_day: boolean;
    matter_id?: string | null;
    task_id?: string | null;
    event_type?: string;
    google_calendar_event_id?: string | null;
  }
): Promise<{
  google_calendar_event_id: string;
  google_etag: string;
  google_updated_at: string;
  sync_status: string;
  last_synced_at: string;
} | null> {
  try {
    const supabase = ensureSupabase();
    const { data: settings } = await supabase
      .from("practice_settings")
      .select("google_refresh_token, google_calendar_id")
      .limit(1)
      .maybeSingle() as { data: { google_refresh_token: string | null; google_calendar_id: string | null } | null };

    if (!settings?.google_refresh_token) return null;

    const { createCalendarClient, toGoogleEvent, createGoogleCalendarEvent, updateGoogleCalendarEvent } =
      await import("@/lib/google-calendar/client");

    const client = createCalendarClient(settings.google_refresh_token);
    const gcalEvent = toGoogleEvent(event);
    const calendarId = settings.google_calendar_id || "primary";

    if (event.google_calendar_event_id) {
      // Update existing
      const result = await updateGoogleCalendarEvent(client, event.google_calendar_event_id, gcalEvent, calendarId);
      return {
        google_calendar_event_id: event.google_calendar_event_id,
        google_etag: result.etag,
        google_updated_at: result.updated,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      };
    } else {
      // Create new
      const result = await createGoogleCalendarEvent(client, gcalEvent, calendarId);
      return {
        google_calendar_event_id: result.id,
        google_etag: result.etag,
        google_updated_at: result.updated,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error("Failed to push to Google Calendar:", err);
    return null;
  }
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const validated = calendarEventSchema.parse({
      title: formData.get("title"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      allDay: formData.get("allDay") === "true",
      eventType: formData.get("eventType") || "manual",
      matterId: formData.get("matterId") || undefined,
      taskId: formData.get("taskId") || undefined,
      description: formData.get("description") || undefined,
      location: formData.get("location") || undefined,
      color: formData.get("color") || undefined,
    });

    const { data: newEvent, error } = await supabase
      .from("calendar_events")
      .insert({
        title: validated.title,
        start_time: validated.startTime,
        end_time: validated.endTime,
        all_day: validated.allDay,
        event_type: validated.eventType,
        matter_id: validated.matterId,
        task_id: validated.taskId,
        description: validated.description,
        location: validated.location,
        color: validated.color,
        sync_status: "pending",
        created_by: roleCheck.session.user.id,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "calendar_event_created",
      entityType: "calendar_event",
      entityId: newEvent.id,
      metadata: { title: validated.title, event_type: validated.eventType },
    });

    // Push to Google Calendar (non-blocking)
    const syncResult = await pushToGoogleCalendar(newEvent);
    if (syncResult) {
      await supabase
        .from("calendar_events")
        .update(syncResult)
        .eq("id", newEvent.id);
    } else {
      // Mark as local_only if no Google connection
      await supabase
        .from("calendar_events")
        .update({ sync_status: "local_only" })
        .eq("id", newEvent.id);
    }

    revalidatePath("/calendar");
    revalidatePath("/");
    return { ok: true, data: { id: newEvent.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const eventId = formData.get("eventId") as string;
    if (!eventId) return { error: "Event ID is required" };

    const validated = calendarEventSchema.parse({
      title: formData.get("title"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      allDay: formData.get("allDay") === "true",
      eventType: formData.get("eventType") || "manual",
      matterId: formData.get("matterId") || undefined,
      taskId: formData.get("taskId") || undefined,
      description: formData.get("description") || undefined,
      location: formData.get("location") || undefined,
      color: formData.get("color") || undefined,
    });

    const { data: updated, error } = await supabase
      .from("calendar_events")
      .update({
        title: validated.title,
        start_time: validated.startTime,
        end_time: validated.endTime,
        all_day: validated.allDay,
        event_type: validated.eventType,
        matter_id: validated.matterId,
        task_id: validated.taskId,
        description: validated.description,
        location: validated.location,
        color: validated.color,
        sync_status: "pending",
      })
      .eq("id", eventId)
      .select()
      .single();

    if (error) return { error: error.message };

    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "calendar_event_updated",
      entityType: "calendar_event",
      entityId: eventId,
      metadata: { title: validated.title },
    });

    // Push to Google Calendar
    const syncResult = await pushToGoogleCalendar(updated);
    if (syncResult) {
      await supabase
        .from("calendar_events")
        .update(syncResult)
        .eq("id", eventId);
    }

    revalidatePath("/calendar");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    // Get event to check for Google ID
    const { data: event } = await supabase
      .from("calendar_events")
      .select("google_calendar_event_id")
      .eq("id", eventId)
      .maybeSingle();

    // Delete from Google Calendar if synced
    if (event?.google_calendar_event_id) {
      try {
        const { data: settings } = await supabase
          .from("practice_settings")
          .select("google_refresh_token, google_calendar_id")
          .limit(1)
          .maybeSingle() as { data: { google_refresh_token: string | null; google_calendar_id: string | null } | null };

        if (settings?.google_refresh_token) {
          const { createCalendarClient, deleteGoogleCalendarEvent } =
            await import("@/lib/google-calendar/client");
          const client = createCalendarClient(settings.google_refresh_token);
          await deleteGoogleCalendarEvent(
            client,
            event.google_calendar_event_id,
            settings.google_calendar_id || "primary"
          );
        }
      } catch (err) {
        console.error("Failed to delete from Google Calendar:", err);
      }
    }

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", eventId);

    if (error) return { error: error.message };

    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "calendar_event_deleted",
      entityType: "calendar_event",
      entityId: eventId,
      metadata: {},
    });

    revalidatePath("/calendar");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Auto-create a calendar event from a task with a due date.
 * Called internally (not directly from forms).
 */
export async function createCalendarEventForTask(
  taskId: string,
  taskTitle: string,
  dueDate: string,
  matterId: string,
  eventType: string = "task_due"
): Promise<void> {
  try {
    const supabase = ensureSupabase();

    // Check if an event already exists for this task
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("task_id", taskId)
      .maybeSingle();

    if (existing) return; // Already has an event

    // Create an all-day event on the due date
    const { data: newEvent } = await supabase
      .from("calendar_events")
      .insert({
        title: taskTitle,
        start_time: dueDate,
        end_time: dueDate,
        all_day: true,
        event_type: eventType,
        matter_id: matterId,
        task_id: taskId,
        sync_status: "pending",
      })
      .select()
      .single();

    if (!newEvent) return;

    // Push to Google Calendar (non-blocking)
    const syncResult = await pushToGoogleCalendar(newEvent);
    if (syncResult) {
      await supabase
        .from("calendar_events")
        .update(syncResult)
        .eq("id", newEvent.id);
    } else {
      await supabase
        .from("calendar_events")
        .update({ sync_status: "local_only" })
        .eq("id", newEvent.id);
    }
  } catch (err) {
    console.error("Failed to create calendar event for task:", err);
  }
}

/**
 * Fetch events for a date range (called from client components via server action)
 */
export async function fetchCalendarEventsAction(
  startDate: string,
  endDate: string
) {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return [];

  const { fetchCalendarEvents } = await import("@/lib/calendar/queries");
  return fetchCalendarEvents(startDate, endDate);
}
