import { Badge } from "@/components/ui/badge";
import {
  ContentCard,
  ContentCardContent,
  ContentCardDescription,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";
import { TimeEntryForm } from "@/components/forms/TimeEntryForm";
import { StopTimerForm } from "@/components/forms/StopTimerForm";
import { EditableTimeEntry } from "@/components/time/editable-time-entry";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchMatters, fetchTasks, fetchTimeEntries } from "@/lib/data/queries";
import { supabaseEnvReady } from "@/lib/supabase/server";

export default async function TimePage() {
  const { data: entries, source, error } = await fetchTimeEntries();
  const { data: matters } = await fetchMatters();
  const { data: tasks } = await fetchTasks();
  const supabaseReady = supabaseEnvReady();
  const { profile } = await getSessionWithProfile();
  const canEdit = supabaseReady && profile?.role !== "client";

  // Build a lookup for tasks per matter (for the editable time entry task dropdown)
  const tasksByMatter = new Map<string, Array<{ id: string; title: string }>>();
  for (const task of tasks) {
    const existing = tasksByMatter.get(task.matterId) || [];
    existing.push({ id: task.id, title: task.title });
    tasksByMatter.set(task.matterId, existing);
  }

  return (
    <div className="bg-background">
      <header className="border-b-2 border-border bg-white">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              MatterFlow
            </p>
            <h1 className="font-lora text-4xl font-bold leading-tight text-foreground">
              Time Tracking
            </h1>
            <p className="text-sm text-slate-600">
              Timers and manual entries per matter. Time entries auto-create draft invoices.{" "}
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
        <ContentCard>
          <ContentCardHeader className="pb-2">
            <ContentCardTitle>Manual time entry</ContentCardTitle>
            <ContentCardDescription>Log minutes or leave blank to represent a running timer.</ContentCardDescription>
          </ContentCardHeader>
          <ContentCardContent>
            {canEdit ? (
              <TimeEntryForm matters={matters} tasks={tasks} />
            ) : (
              <p className="text-sm text-amber-700">
                {supabaseReady
                  ? "Clients cannot log time. Sign in as staff/admin."
                  : "Supabase env vars not set; creation disabled."}
              </p>
            )}
          </ContentCardContent>
        </ContentCard>

        <div className="grid gap-3">
          {entries.map((entry) => {
            // Running timer that isn't editable
            if (!entry.endedAt) {
              return (
                <div key={entry.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="warning" className="shrink-0">Running</Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {entry.description || "Untitled entry"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.matterTitle || entry.matterId}
                          {entry.taskTitle && ` · ${entry.taskTitle}`}
                          {" · "}Started {new Date(entry.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {canEdit && <StopTimerForm timeEntryId={entry.id} />}
                  </div>
                </div>
              );
            }

            return (
              <EditableTimeEntry
                key={entry.id}
                id={entry.id}
                description={entry.description}
                durationMinutes={entry.durationMinutes}
                billableDurationMinutes={entry.billableDurationMinutes}
                rateCents={entry.rateCents}
                status={entry.status}
                startedAt={entry.startedAt}
                endedAt={entry.endedAt}
                taskId={entry.taskId}
                taskTitle={entry.taskTitle}
                matterTitle={entry.matterTitle}
                matterId={entry.matterId}
                tasks={tasksByMatter.get(entry.matterId) || []}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
