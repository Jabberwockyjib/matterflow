import { CalendarClock, Clock4 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              MatterFlow
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              Tasks
            </h1>
            <p className="text-sm text-slate-600">
              Queue of next actions tied to matters.{" "}
              <span className="font-medium text-slate-700">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Create task</CardTitle>
            <CardDescription>
              Attach to a matter; defaults to open status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <TaskForm matters={matters} />
            ) : (
              <p className="text-sm text-amber-700">
                {supabaseReady
                  ? "Clients cannot create tasks. Sign in as staff/admin."
                  : "Supabase env vars not set; creation disabled."}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="border-slate-200 bg-white transition hover:shadow-sm"
            >
              <CardHeader className="pb-1">
                <CardTitle className="text-base text-slate-900">
                  {task.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs text-slate-600">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDue(task.dueDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={task.responsibleParty === "client" ? "warning" : "default"}
                  >
                    {task.responsibleParty} owns
                  </Badge>
                  <Badge variant="outline">{task.status}</Badge>
                  <span className="text-slate-600">Matter ID: {task.matterId}</span>
                </div>
                {canEdit ? (
                  <TaskStatusForm taskId={task.id} currentStatus={task.status} />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
