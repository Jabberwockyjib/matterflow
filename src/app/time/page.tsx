import { Clock4, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createTimeEntry, stopTimeEntry } from "@/lib/data/actions";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchMatters, fetchTasks, fetchTimeEntries } from "@/lib/data/queries";
import { supabaseEnvReady } from "@/lib/supabase/server";

const formatDuration = (minutes: number | null) => {
  if (!minutes) return "Timer running";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
};

export default async function TimePage() {
  const { data: entries, source, error } = await fetchTimeEntries();
  const { data: matters } = await fetchMatters();
  const { data: tasks } = await fetchTasks();
  const supabaseReady = supabaseEnvReady();
  const { profile } = await getSessionWithProfile();
  const canEdit = supabaseReady && profile?.role !== "client";

  return (
    <div className="bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              MatterFlow
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              Time Tracking
            </h1>
            <p className="text-sm text-slate-600">
              Timers and manual entries per matter.{" "}
              <span className="font-medium text-slate-700">
                {source === "supabase"
                  ? "Live Supabase data"
                  : "Using mock data until Supabase is configured"}
              </span>
              {error ? ` — ${error}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={source === "supabase" ? "success" : "warning"}>
              {source === "supabase" ? "Live data" : "Mock data"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Manual time entry</CardTitle>
            <CardDescription>Log minutes or leave blank to represent a running timer.</CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <form action={createTimeEntry} className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Matter ID
                  </span>
                  <select
                    name="matterId"
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a matter
                    </option>
                    {matters.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Task ID (optional)
                  </span>
                  <select
                    name="taskId"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="">No task</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Minutes
                  </span>
                  <input
                    name="minutes"
                    type="number"
                    min="0"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="45"
                  />
                </label>
                <label className="text-sm text-slate-700 md:col-span-3">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Description
                  </span>
                  <input
                    name="description"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Review intake and prep notes"
                  />
                </label>
                <div className="md:col-span-3">
                  <Button type="submit">
                    Log time
                    <Timer className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-amber-700">
                {supabaseReady
                  ? "Clients cannot log time. Sign in as staff/admin."
                  : "Supabase env vars not set; creation disabled."}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  {entry.description || "Untitled entry"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Matter ID: {entry.matterId}
                  {entry.taskId ? ` • Task: ${entry.taskId}` : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                <Badge variant="outline" className="capitalize">
                  {entry.status}
                </Badge>
                <div className="flex items-center gap-1 text-slate-800">
                  <Clock4 className="h-4 w-4 text-slate-500" />
                  {formatDuration(entry.durationMinutes)}
                </div>
                <span className="text-slate-600">
                  Started {new Date(entry.startedAt).toLocaleString()}
                </span>
                {entry.endedAt ? (
                  <span className="text-slate-600">
                    Ended {new Date(entry.endedAt).toLocaleString()}
                  </span>
                ) : (
                  <>
                    <Badge variant="warning">Running</Badge>
                    {canEdit ? (
                      <form action={stopTimeEntry}>
                        <input type="hidden" name="id" value={entry.id} />
                        <Button size="sm" variant="secondary" type="submit">
                          Stop timer
                        </Button>
                      </form>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
