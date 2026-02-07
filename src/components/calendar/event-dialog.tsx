"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCalendarEvent, updateCalendarEvent } from "@/lib/calendar/actions";

export type EventDialogData = {
  mode: "create" | "edit";
  eventId?: string;
  title?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  eventType?: string;
  matterId?: string;
  taskId?: string;
  description?: string;
  location?: string;
  color?: string;
};

type EventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EventDialogData | null;
  matterOptions: { id: string; title: string }[];
  onDelete?: (eventId: string) => void;
};

const EVENT_TYPES = [
  { value: "manual", label: "General" },
  { value: "meeting", label: "Meeting" },
  { value: "scheduled_call", label: "Scheduled Call" },
  { value: "deadline", label: "Deadline" },
  { value: "court_date", label: "Court Date" },
  { value: "task_due", label: "Task Due" },
];

function toLocalDatetimeInput(isoString: string): string {
  if (!isoString) return "";
  // Handle already-local format
  if (isoString.length === 16) return isoString;
  // Convert ISO to local datetime-local format
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateInput(isoString: string): string {
  if (!isoString) return "";
  return isoString.slice(0, 10);
}

export function EventDialog({
  open,
  onOpenChange,
  data,
  matterOptions,
  onDelete,
}: EventDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const isEdit = data.mode === "edit";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Convert datetime-local or date to ISO
    const allDay = formData.get("allDay") === "true";
    const startVal = formData.get("startTime") as string;
    const endVal = formData.get("endTime") as string;

    if (allDay) {
      formData.set("startTime", new Date(startVal + "T00:00:00").toISOString());
      formData.set("endTime", new Date(endVal + "T23:59:59").toISOString());
    } else {
      formData.set("startTime", new Date(startVal).toISOString());
      formData.set("endTime", new Date(endVal).toISOString());
    }

    startTransition(async () => {
      const action = isEdit ? updateCalendarEvent : createCalendarEvent;
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && data.eventId && (
            <input type="hidden" name="eventId" value={data.eventId} />
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={data.title || ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Event title"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              id="allDayCheckbox"
              type="checkbox"
              defaultChecked={data.allDay}
              onChange={(e) => {
                const hidden = document.getElementById("allDayHidden") as HTMLInputElement;
                if (hidden) hidden.value = String(e.target.checked);
              }}
              className="rounded border-slate-300"
            />
            <label htmlFor="allDayCheckbox" className="text-sm text-slate-700">All day</label>
            <input type="hidden" id="allDayHidden" name="allDay" defaultValue={String(data.allDay)} />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-slate-700 mb-1">
                Start
              </label>
              <input
                id="startTime"
                name="startTime"
                type={data.allDay ? "date" : "datetime-local"}
                required
                defaultValue={data.allDay ? toLocalDateInput(data.startTime) : toLocalDatetimeInput(data.startTime)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-slate-700 mb-1">
                End
              </label>
              <input
                id="endTime"
                name="endTime"
                type={data.allDay ? "date" : "datetime-local"}
                required
                defaultValue={data.allDay ? toLocalDateInput(data.endTime) : toLocalDatetimeInput(data.endTime)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label htmlFor="eventType" className="block text-sm font-medium text-slate-700 mb-1">
              Type
            </label>
            <select
              id="eventType"
              name="eventType"
              defaultValue={data.eventType || "manual"}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Matter */}
          <div>
            <label htmlFor="matterId" className="block text-sm font-medium text-slate-700 mb-1">
              Matter (optional)
            </label>
            <select
              id="matterId"
              name="matterId"
              defaultValue={data.matterId || ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">No matter</option>
              {matterOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
              Location (optional)
            </label>
            <input
              id="location"
              name="location"
              type="text"
              defaultValue={data.location || ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Conference Room, Zoom link"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={data.description || ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Additional details"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter className="flex items-center gap-2">
            {isEdit && data.eventId && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => onDelete(data.eventId!)}
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
