import { fetchCalendarEvents } from "@/lib/calendar/queries";
import { fetchMatters } from "@/lib/data/queries";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  // Default to current month range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [events, { data: matters }] = await Promise.all([
    fetchCalendarEvents(startDate, endDate),
    fetchMatters(),
  ]);

  const matterOptions = matters.map((m) => ({
    id: m.id,
    title: m.title,
  }));

  return <CalendarClient initialEvents={events} matterOptions={matterOptions} />;
}
