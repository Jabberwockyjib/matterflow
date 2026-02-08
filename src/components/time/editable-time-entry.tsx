"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Clock4 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateTimeEntry } from "@/lib/data/actions";

interface EditableTimeEntryProps {
  id: string;
  description: string | null;
  durationMinutes: number | null;
  billableDurationMinutes: number | null;
  rateCents?: number | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  taskId: string | null;
  taskTitle?: string | null;
  matterTitle?: string | null;
  matterId?: string;
  tasks?: Array<{ id: string; title: string }>;
}

function parseDurationInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match patterns like "1h30m", "1h 30m", "1.5h", "90m", "90", "1:30"
  const hm = trimmed.match(/^(\d+)\s*h\s*(\d+)\s*m?$/i);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);

  const hOnly = trimmed.match(/^(\d+(?:\.\d+)?)\s*h$/i);
  if (hOnly) return Math.round(parseFloat(hOnly[1]) * 60);

  const mOnly = trimmed.match(/^(\d+)\s*m?$/i);
  if (mOnly) return parseInt(mOnly[1]);

  const colonFormat = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonFormat) return parseInt(colonFormat[1]) * 60 + parseInt(colonFormat[2]);

  return null;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "0m";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function formatRate(cents: number | null): string {
  if (!cents) return "$0";
  return `$${(cents / 100).toFixed(0)}`;
}

export function EditableTimeEntry({
  id,
  description,
  durationMinutes,
  billableDurationMinutes,
  rateCents,
  status,
  startedAt,
  endedAt,
  taskId,
  taskTitle,
  matterTitle,
  matterId,
  tasks,
}: EditableTimeEntryProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editDescription, setEditDescription] = useState(description || "");
  const [editDuration, setEditDuration] = useState(
    durationMinutes ? formatDuration(durationMinutes) : ""
  );
  const [editRate, setEditRate] = useState(
    rateCents ? (rateCents / 100).toString() : ""
  );
  const [editTaskId, setEditTaskId] = useState(taskId || "");

  const canEdit = status === "draft" || status === "recorded";
  const displayDuration = billableDurationMinutes ?? durationMinutes;

  async function handleSave() {
    setSaving(true);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("description", editDescription);

    const parsedMinutes = parseDurationInput(editDuration);
    if (parsedMinutes !== null) {
      formData.set("durationMinutes", parsedMinutes.toString());
    }

    const parsedRate = parseFloat(editRate);
    if (!isNaN(parsedRate)) {
      formData.set("rateCents", Math.round(parsedRate * 100).toString());
    }

    if (editTaskId !== (taskId || "")) {
      formData.set("taskId", editTaskId);
    }

    await updateTimeEntry(formData);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setEditDescription(description || "");
    setEditDuration(durationMinutes ? formatDuration(durationMinutes) : "");
    setEditRate(rateCents ? (rateCents / 100).toString() : "");
    setEditTaskId(taskId || "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
            Editing Time Entry
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Description
            </label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
              placeholder="What did you work on?"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Duration
            </label>
            <input
              type="text"
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
              placeholder="1h30m, 90m, 1.5h"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Rate ($/hr)
            </label>
            <input
              type="number"
              value={editRate}
              onChange={(e) => setEditRate(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
              placeholder="250"
              min="0"
              step="1"
            />
          </div>
        </div>

        {tasks && tasks.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Task
            </label>
            <select
              value={editTaskId}
              onChange={(e) => setEditTaskId(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
            >
              <option value="">No task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 group">
      <div className="flex-1">
        <p className="text-sm text-slate-900">
          {description || "No description"}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
          <Badge variant="outline">{status}</Badge>
          {taskTitle && (
            <Badge variant="outline" className="text-xs">
              {taskTitle}
            </Badge>
          )}
          {matterTitle && (
            <span className="text-slate-500">{matterTitle}</span>
          )}
          <div className="flex items-center gap-1 text-slate-600">
            <Clock4 className="h-3 w-3" />
            {displayDuration !== null && displayDuration !== durationMinutes ? (
              <span>
                {formatDuration(displayDuration)}
                <span className="text-slate-400 ml-1">
                  (actual: {formatDuration(durationMinutes)})
                </span>
              </span>
            ) : (
              <span>{durationMinutes ? formatDuration(durationMinutes) : "Running"}</span>
            )}
          </div>
          {rateCents ? (
            <span className="text-slate-500">{formatRate(rateCents)}/hr</span>
          ) : null}
          {displayDuration && rateCents ? (
            <span className="font-medium text-slate-700">
              ${((displayDuration / 60) * (rateCents / 100)).toFixed(2)}
            </span>
          ) : null}
          {startedAt && (
            <span className="text-slate-500">
              {new Date(startedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {canEdit && (
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
