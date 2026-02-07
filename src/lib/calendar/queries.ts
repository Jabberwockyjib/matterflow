import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type CalendarEventRow = Database["public"]["Tables"]["calendar_events"]["Row"];

export type CalendarEventWithMatter = CalendarEventRow & {
  matter_title?: string | null;
};

/**
 * Fetch calendar events for a date range (main calendar view)
 */
export async function fetchCalendarEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEventWithMatter[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*, matters(title)")
    .gte("start_time", startDate)
    .lte("end_time", endDate)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Failed to fetch calendar events:", error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    matter_title: (row.matters as unknown as { title: string } | null)?.title ?? null,
    matters: undefined,
  }));
}

/**
 * Fetch calendar events for a specific matter
 */
export async function fetchCalendarEventsForMatter(
  matterId: string
): Promise<CalendarEventRow[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("matter_id", matterId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Failed to fetch calendar events for matter:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch the calendar event linked to a specific task
 */
export async function fetchCalendarEventForTask(
  taskId: string
): Promise<CalendarEventRow | null> {
  if (!supabaseEnvReady()) return null;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch calendar event for task:", error);
    return null;
  }

  return data;
}

/**
 * Fetch upcoming events for the dashboard widget
 */
export async function fetchUpcomingEvents(
  limit = 5
): Promise<CalendarEventWithMatter[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*, matters(title)")
    .gte("end_time", now)
    .order("start_time", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch upcoming events:", error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    matter_title: (row.matters as unknown as { title: string } | null)?.title ?? null,
    matters: undefined,
  }));
}

/**
 * Fetch events by their Google Calendar event IDs (for sync matching)
 */
export async function fetchEventsByGoogleIds(
  googleIds: string[]
): Promise<CalendarEventRow[]> {
  if (!supabaseEnvReady() || googleIds.length === 0) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .in("google_calendar_event_id", googleIds);

  if (error) {
    console.error("Failed to fetch events by Google IDs:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch events with pending or error sync status (for retry)
 */
export async function fetchPendingSyncEvents(): Promise<CalendarEventRow[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .in("sync_status", ["pending", "error"])
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Failed to fetch pending sync events:", error);
    return [];
  }

  return data || [];
}
