"use client";

import { useState, useCallback } from "react";
import { useNextCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
  type CalendarEventExternal,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";

import type { CalendarEventWithMatter } from "@/lib/calendar/queries";
import { fetchCalendarEventsAction, updateCalendarEvent, deleteCalendarEvent } from "@/lib/calendar/actions";
import { EventDialog, type EventDialogData } from "@/components/calendar/event-dialog";

// Color categories for event types
const CALENDAR_CATEGORIES = {
  manual: {
    colorName: "manual",
    lightColors: { main: "#6b7280", container: "#f3f4f6", onContainer: "#1f2937" },
  },
  task_due: {
    colorName: "task_due",
    lightColors: { main: "#d97706", container: "#fef3c7", onContainer: "#78350f" },
  },
  scheduled_call: {
    colorName: "scheduled_call",
    lightColors: { main: "#2563eb", container: "#dbeafe", onContainer: "#1e3a8a" },
  },
  deadline: {
    colorName: "deadline",
    lightColors: { main: "#dc2626", container: "#fee2e2", onContainer: "#7f1d1d" },
  },
  court_date: {
    colorName: "court_date",
    lightColors: { main: "#7c3aed", container: "#ede9fe", onContainer: "#3b0764" },
  },
  meeting: {
    colorName: "meeting",
    lightColors: { main: "#059669", container: "#d1fae5", onContainer: "#064e3b" },
  },
};

type MatterOption = { id: string; title: string };

function toScheduleXEvent(event: CalendarEventWithMatter): CalendarEventExternal {
  const start = event.all_day
    ? event.start_time.slice(0, 10)
    : event.start_time.slice(0, 16);
  const end = event.all_day
    ? event.end_time.slice(0, 10)
    : event.end_time.slice(0, 16);

  // Schedule-X accepts string dates at runtime but types expect Temporal objects
  return {
    id: event.id,
    start,
    end,
    title: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    calendarId: event.event_type,
    _matterflow: {
      matterId: event.matter_id,
      taskId: event.task_id,
      eventType: event.event_type,
      matterTitle: event.matter_title,
      syncStatus: event.sync_status,
    },
  } as unknown as CalendarEventExternal;
}

type CalendarClientProps = {
  initialEvents: CalendarEventWithMatter[];
  matterOptions: MatterOption[];
};

export function CalendarClient({ initialEvents, matterOptions }: CalendarClientProps) {
  const [eventsService] = useState(() => createEventsServicePlugin());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<EventDialogData | null>(null);
  const [allEvents, setAllEvents] = useState(initialEvents);

  const handleRangeUpdate = useCallback(
    async (range: { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }) => {
      try {
        const startDate = new Date(range.start.epochMilliseconds).toISOString();
        const endDate = new Date(range.end.epochMilliseconds).toISOString();
        const events = await fetchCalendarEventsAction(startDate, endDate);
        setAllEvents(events);

        // Update Schedule-X events
        const currentEvents = eventsService.getAll();
        for (const ev of currentEvents) {
          eventsService.remove(ev.id as string);
        }
        for (const ev of events) {
          eventsService.add(toScheduleXEvent(ev));
        }
      } catch (err) {
        console.error("Failed to fetch events for range:", err);
      }
    },
    [eventsService]
  );

  const handleClickDateTime = useCallback(
    (dateTime: Temporal.ZonedDateTime) => {
      const startTime = new Date(dateTime.epochMilliseconds).toISOString().slice(0, 19);
      const endDate = new Date(dateTime.epochMilliseconds + 60 * 60 * 1000);
      const endTime = endDate.toISOString().slice(0, 19);

      setDialogData({
        mode: "create",
        startTime,
        endTime,
        allDay: false,
      });
      setDialogOpen(true);
    },
    []
  );

  const handleEventClick = useCallback(
    (calendarEvent: CalendarEventExternal) => {
      const event = allEvents.find((e) => e.id === calendarEvent.id);
      if (!event) return;

      setDialogData({
        mode: "edit",
        eventId: event.id,
        title: event.title,
        startTime: event.start_time,
        endTime: event.end_time,
        allDay: event.all_day,
        eventType: event.event_type,
        matterId: event.matter_id || undefined,
        taskId: event.task_id || undefined,
        description: event.description || undefined,
        location: event.location || undefined,
        color: event.color || undefined,
      });
      setDialogOpen(true);
    },
    [allEvents]
  );

  const handleEventUpdate = useCallback(
    async (updatedEvent: CalendarEventExternal) => {
      // Drag-and-drop update
      const eventId = updatedEvent.id as string;
      const existing = allEvents.find((e) => e.id === eventId);
      if (!existing) return;

      const startStr = String(updatedEvent.start);
      const endStr = String(updatedEvent.end);

      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("title", existing.title);
      formData.set("startTime", new Date(startStr).toISOString());
      formData.set("endTime", new Date(endStr).toISOString());
      formData.set("allDay", String(existing.all_day));
      formData.set("eventType", existing.event_type);
      if (existing.matter_id) formData.set("matterId", existing.matter_id);
      if (existing.description) formData.set("description", existing.description);
      if (existing.location) formData.set("location", existing.location);

      await updateCalendarEvent(formData);
    },
    [allEvents]
  );

  const calendar = useNextCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    defaultView: "week",
    events: initialEvents.map(toScheduleXEvent),
    calendars: CALENDAR_CATEGORIES,
    plugins: [eventsService, createDragAndDropPlugin()],
    dayBoundaries: { start: "07:00", end: "20:00" },
    callbacks: {
      onRangeUpdate: handleRangeUpdate,
      onClickDateTime: handleClickDateTime,
      onEventClick: handleEventClick,
      onEventUpdate: handleEventUpdate,
    },
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500">Manage your schedule and events</p>
        </div>
        <button
          onClick={() => {
            const now = new Date();
            const startTime = now.toISOString().slice(0, 16);
            const end = new Date(now.getTime() + 60 * 60 * 1000);
            setDialogData({
              mode: "create",
              startTime,
              endTime: end.toISOString().slice(0, 16),
              allDay: false,
            });
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Event
        </button>
      </div>

      {/* Legend */}
      <div className="flex-none flex items-center gap-4 px-6 py-2 border-b border-slate-100 text-xs">
        {[
          { label: "Task Due", color: "#d97706" },
          { label: "Call", color: "#2563eb" },
          { label: "Deadline", color: "#dc2626" },
          { label: "Court Date", color: "#7c3aed" },
          { label: "Meeting", color: "#059669" },
          { label: "Other", color: "#6b7280" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <div className="h-full">
          <ScheduleXCalendar calendarApp={calendar} />
        </div>
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={dialogData}
        matterOptions={matterOptions}
        onDelete={async (eventId) => {
          await deleteCalendarEvent(eventId);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
