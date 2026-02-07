import { google, calendar_v3 } from "googleapis";
import { createOAuth2Client } from "@/lib/google-drive/client";

type CalendarClient = calendar_v3.Calendar;

/**
 * Google Calendar API client for MatterFlow
 * Reuses OAuth2 credentials from the Google Drive client.
 * The practitioner's refresh token (from practice_settings) includes the calendar scope.
 */

/**
 * Create an authenticated Google Calendar client from a refresh token
 */
export function createCalendarClient(refreshToken: string): CalendarClient {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Map a MatterFlow calendar event to a Google Calendar event resource.
 * Stores MatterFlow identifiers in extendedProperties.private so we can
 * identify our events during pull sync.
 */
export function toGoogleEvent(event: {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  id?: string;
  matter_id?: string | null;
  task_id?: string | null;
  event_type?: string;
}): calendar_v3.Schema$Event {
  const gcalEvent: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    extendedProperties: {
      private: {
        matterflow_id: event.id || "",
        matter_id: event.matter_id || "",
        task_id: event.task_id || "",
        event_type: event.event_type || "manual",
      },
    },
  };

  if (event.all_day) {
    // All-day events use date (YYYY-MM-DD) not dateTime
    gcalEvent.start = { date: event.start_time.slice(0, 10) };
    gcalEvent.end = { date: event.end_time.slice(0, 10) };
  } else {
    gcalEvent.start = { dateTime: event.start_time };
    gcalEvent.end = { dateTime: event.end_time };
  }

  return gcalEvent;
}

/**
 * Create a new event on Google Calendar
 */
export async function createGoogleCalendarEvent(
  client: CalendarClient,
  event: calendar_v3.Schema$Event,
  calendarId = "primary"
): Promise<{ id: string; etag: string; updated: string }> {
  const res = await client.events.insert({
    calendarId,
    requestBody: event,
  });

  return {
    id: res.data.id!,
    etag: res.data.etag!,
    updated: res.data.updated!,
  };
}

/**
 * Update an existing event on Google Calendar
 */
export async function updateGoogleCalendarEvent(
  client: CalendarClient,
  eventId: string,
  event: calendar_v3.Schema$Event,
  calendarId = "primary"
): Promise<{ etag: string; updated: string }> {
  const res = await client.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });

  return {
    etag: res.data.etag!,
    updated: res.data.updated!,
  };
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  client: CalendarClient,
  eventId: string,
  calendarId = "primary"
): Promise<void> {
  await client.events.delete({
    calendarId,
    eventId,
  });
}

/**
 * List events within a date range from Google Calendar
 */
export async function listGoogleCalendarEvents(
  client: CalendarClient,
  timeMin: string,
  timeMax: string,
  calendarId = "primary"
): Promise<calendar_v3.Schema$Event[]> {
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;

  do {
    const res = await client.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
      pageToken,
    });

    if (res.data.items) {
      events.push(...res.data.items);
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return events;
}

/**
 * Incremental sync using syncToken. Returns changed events and a new sync token.
 * On first call (no syncToken), does a full sync from 30 days ago.
 */
export async function syncGoogleCalendarEvents(
  client: CalendarClient,
  syncToken?: string | null,
  calendarId = "primary"
): Promise<{
  events: calendar_v3.Schema$Event[];
  nextSyncToken: string;
}> {
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken = "";

  try {
    do {
      const params: calendar_v3.Params$Resource$Events$List = {
        calendarId,
        maxResults: 250,
        pageToken,
      };

      if (syncToken && !pageToken) {
        params.syncToken = syncToken;
      } else if (!syncToken && !pageToken) {
        // First sync: get events from 30 days ago onward
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        params.timeMin = thirtyDaysAgo.toISOString();
        params.singleEvents = true;
      }

      const res = await client.events.list(params);

      if (res.data.items) {
        events.push(...res.data.items);
      }
      pageToken = res.data.nextPageToken || undefined;
      if (res.data.nextSyncToken) {
        nextSyncToken = res.data.nextSyncToken;
      }
    } while (pageToken);
  } catch (error: unknown) {
    // If sync token is invalid (410 Gone), do a full sync
    const err = error as { code?: number };
    if (err.code === 410) {
      return syncGoogleCalendarEvents(client, null, calendarId);
    }
    throw error;
  }

  return { events, nextSyncToken };
}

/**
 * Test calendar connection by listing calendar list
 */
export async function testCalendarConnection(refreshToken: string): Promise<{
  success: boolean;
  calendarId?: string;
  error?: string;
}> {
  try {
    const client = createCalendarClient(refreshToken);
    const res = await client.calendarList.list({ maxResults: 1 });

    const primaryCalendar = res.data.items?.find((c) => c.primary) || res.data.items?.[0];

    return {
      success: true,
      calendarId: primaryCalendar?.id || "primary",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar connection test failed";
    return { success: false, error: message };
  }
}
