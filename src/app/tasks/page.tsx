import Link from "next/link";
import { CalendarClock, Clock4 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContentCard,
  ContentCardContent,
  ContentCardDescription,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";
import { TaskForm } from "@/components/forms/TaskForm";
import { TaskStatusForm } from "@/components/forms/TaskStatusForm";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchMatters, fetchTasks } from "@/lib/data/queries";
import { supabaseEnvReady } from "@/lib/supabase/server";

const formatDue = (value: string | null) => {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString();
};

export default async function TasksPage() {
  const { data: tasks, source, error } = await fetchTasks();
  const { data: matters } = await fetchMatters();
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
              Tasks
            </h1>
            <p className="text-sm text-muted-foreground">
              Queue of next actions tied to matters.{" "}
              <span className="font-semibold text-foreground">
                {source === "supabase"
                  ? "Live Supabase data"
                  : "Using mock data until Supabase is configured"}
              </span>
              {error ? ` — ${error}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              Filter
            </Button>
            <Button size="sm">
              New Task
              <Clock4 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-4">
        <ContentCard className="animate-fade-in">
          <ContentCardHeader className="pb-2">
            <ContentCardTitle>Create task</ContentCardTitle>
            <ContentCardDescription>
              Attach to a matter; defaults to open status.
            </ContentCardDescription>
          </ContentCardHeader>
          <ContentCardContent>
            {canEdit ? (
              <TaskForm matters={matters} />
            ) : (
              <p className="text-sm text-amber-700">
                {supabaseReady
                  ? "Clients cannot create tasks. Sign in as staff/admin."
                  : "Supabase env vars not set; creation disabled."}
              </p>
            )}
          </ContentCardContent>
        </ContentCard>

        <div className="grid gap-4">
          {tasks.map((task, index) => (
            <ContentCard
              key={task.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ContentCardHeader className="pb-1">
                <ContentCardTitle className="text-base">
                  {task.title}
                </ContentCardTitle>
                <ContentCardDescription className="flex items-center gap-2 text-xs">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDue(task.dueDate)}
                </ContentCardDescription>
              </ContentCardHeader>
              <ContentCardContent className="flex flex-col gap-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={task.responsibleParty === "client" ? "warning" : "default"}
                  >
                    {task.responsibleParty} owns
                  </Badge>
                  <Badge variant="outline">{task.status}</Badge>
                  <Link
                    href={`/matters/${task.matterId}`}
                    className="text-blue-600 hover:underline"
                  >
                    View Matter →
                  </Link>
                </div>
                {canEdit ? (
                  <TaskStatusForm taskId={task.id} currentStatus={task.status} />
                ) : null}
              </ContentCardContent>
            </ContentCard>
          ))}
        </div>
      </main>
    </div>
  );
}
