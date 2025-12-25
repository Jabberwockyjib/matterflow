import { Clock4 } from "lucide-react";

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

        <div className="grid gap-4">
          {entries.map((entry) => (
            <ContentCard key={entry.id} className="border-slate-200 bg-white">
              <ContentCardHeader className="pb-2">
                <ContentCardTitle className="text-base text-slate-900">
                  {entry.description || "Untitled entry"}
                </ContentCardTitle>
                <ContentCardDescription className="text-xs text-slate-600">
                  Matter ID: {entry.matterId}
                  {entry.taskId ? ` • Task: ${entry.taskId}` : null}
                </ContentCardDescription>
              </ContentCardHeader>
              <ContentCardContent className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
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
                      <StopTimerForm timeEntryId={entry.id} />
                    ) : null}
                  </>
                )}
              </ContentCardContent>
            </ContentCard>
          ))}
        </div>
      </main>
    </div>
  );
}
