import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  createCalendarClient,
  syncGoogleCalendarEvents,
  toGoogleEvent,
  createGoogleCalendarEvent,
} from "@/lib/google-calendar/client";
import type { calendar_v3 } from "googleapis";

/**
 * Cron endpoint for two-way Google Calendar sync
 * GET /api/cron/calendar-sync
 *
 * Pulls changes from Google Calendar → MatterFlow (new/updated/deleted events)
 * and retries any pending pushes from MatterFlow → Google Calendar.
 *
 * Polling frequency: every 15 minutes.
 * Requires CRON_SECRET header for authentication.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();

  // Get practice-wide Google refresh token and calendar sync token
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("google_refresh_token, google_calendar_id, google_calendar_sync_token")
    .limit(1)
    .maybeSingle() as {
      data: {
        google_refresh_token: string | null;
        google_calendar_id: string | null;
        google_calendar_sync_token: string | null;
      } | null;
    };

  if (!settings?.google_refresh_token) {
    return NextResponse.json(
      { message: "Google account not connected", pulled: 0, pushed: 0 },
      { status: 200 }
    );
  }

  const calendarId = settings.google_calendar_id || "primary";
  let pulled = 0;
  let pushed = 0;
  let errors = 0;

  try {
    const client = createCalendarClient(settings.google_refresh_token);

    // ── PULL: Google Calendar → MatterFlow ──
    const { events: gcalEvents, nextSyncToken } = await syncGoogleCalendarEvents(
      client,
      settings.google_calendar_sync_token,
      calendarId
    );

    for (const gcalEvent of gcalEvents) {
      try {
        await processIncomingEvent(supabase, gcalEvent);
        pulled++;
      } catch (err) {
        console.error("Error processing GCal event:", gcalEvent.id, err);
        errors++;
      }
    }

    // Update sync token
    if (nextSyncToken) {
      await supabase
        .from("practice_settings")
        .update({
          google_calendar_sync_token: nextSyncToken,
          google_calendar_last_sync: new Date().toISOString(),
        } as Record<string, unknown>)
        .limit(1);
    }

    // ── PUSH: Retry pending/error MatterFlow events → Google Calendar ──
    const { data: pendingEvents } = await supabase
      .from("calendar_events")
      .select("*")
      .in("sync_status", ["pending", "error"])
      .order("created_at", { ascending: true })
      .limit(50);

    if (pendingEvents) {
      for (const event of pendingEvents) {
        try {
          const gcalEvent = toGoogleEvent(event);

          if (event.google_calendar_event_id) {
            // Update existing
            const res = await client.events.update({
              calendarId,
              eventId: event.google_calendar_event_id,
              requestBody: gcalEvent,
            });
            await supabase
              .from("calendar_events")
              .update({
                sync_status: "synced",
                google_etag: res.data.etag,
                google_updated_at: res.data.updated,
                last_synced_at: new Date().toISOString(),
                sync_error: null,
              })
              .eq("id", event.id);
          } else {
            // Create new
            const result = await createGoogleCalendarEvent(client, gcalEvent, calendarId);
            await supabase
              .from("calendar_events")
              .update({
                google_calendar_event_id: result.id,
                google_etag: result.etag,
                google_updated_at: result.updated,
                sync_status: "synced",
                last_synced_at: new Date().toISOString(),
                sync_error: null,
              })
              .eq("id", event.id);
          }
          pushed++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          await supabase
            .from("calendar_events")
            .update({ sync_status: "error", sync_error: message })
            .eq("id", event.id);
          errors++;
        }
      }
    }
  } catch (err) {
    console.error("Calendar sync failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed", pulled, pushed, errors },
      { status: 500 }
    );
  }

  console.log(`Calendar sync complete: ${pulled} pulled, ${pushed} pushed, ${errors} errors`);

  return NextResponse.json({
    message: "Calendar sync complete",
    summary: { pulled, pushed, errors },
  });
}

/**
 * Process a single incoming Google Calendar event.
 * - Cancelled events → delete local row
 * - Events with matterflow_id → update local row
 * - Events without matterflow_id → insert as new manual event
 */
async function processIncomingEvent(
  supabase: ReturnType<typeof supabaseAdmin>,
  gcalEvent: calendar_v3.Schema$Event
) {
  const googleId = gcalEvent.id;
  if (!googleId) return;

  // Check if this event already exists locally
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id, updated_at")
    .eq("google_calendar_event_id", googleId)
    .maybeSingle();

  // Handle deleted events
  if (gcalEvent.status === "cancelled") {
    if (existing) {
      await supabase.from("calendar_events").delete().eq("id", existing.id);
    }
    return;
  }

  // Parse start/end times
  const startTime = gcalEvent.start?.dateTime || gcalEvent.start?.date;
  const endTime = gcalEvent.end?.dateTime || gcalEvent.end?.date;
  if (!startTime || !endTime) return;

  const allDay = Boolean(gcalEvent.start?.date && !gcalEvent.start?.dateTime);
  const matterflowId = gcalEvent.extendedProperties?.private?.matterflow_id;

  if (existing) {
    // Update existing local event (last-write-wins from Google side)
    await supabase
      .from("calendar_events")
      .update({
        title: gcalEvent.summary || "Untitled",
        description: gcalEvent.description || null,
        location: gcalEvent.location || null,
        start_time: startTime,
        end_time: endTime,
        all_day: allDay,
        google_etag: gcalEvent.etag || null,
        google_updated_at: gcalEvent.updated || null,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else if (!matterflowId) {
    // New event from Google Calendar (not created by MatterFlow)
    await supabase.from("calendar_events").insert({
      google_calendar_event_id: googleId,
      title: gcalEvent.summary || "Untitled",
      description: gcalEvent.description || null,
      location: gcalEvent.location || null,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay,
      event_type: "manual",
      sync_status: "synced",
      google_etag: gcalEvent.etag || null,
      google_updated_at: gcalEvent.updated || null,
      last_synced_at: new Date().toISOString(),
    });
  }
  // If matterflowId is set but no existing row, the event was likely deleted locally
  // and we don't re-import it (local deletes are authoritative)
}
