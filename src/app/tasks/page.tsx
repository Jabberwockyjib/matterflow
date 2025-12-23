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
import { createTask, updateTaskStatus } from "@/lib/data/actions";
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
              <form action={createTask} className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Title
                  </span>
                  <input
                    name="title"
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Send draft to client"
                  />
                </label>
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
                    Due date
                  </span>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Responsible party
                  </span>
                  <select
                    name="responsibleParty"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    defaultValue="lawyer"
                  >
                    <option value="lawyer">Lawyer</option>
                    <option value="client">Client</option>
                  </select>
                </label>
                <div className="md:col-span-2">
                  <Button type="submit">Add task</Button>
                </div>
              </form>
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
              <CardContent className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <Badge
                  variant={task.responsibleParty === "client" ? "warning" : "default"}
                >
                  {task.responsibleParty} owns
                </Badge>
                <Badge variant="outline">{task.status}</Badge>
                <span className="text-slate-600">Matter ID: {task.matterId}</span>
                {canEdit ? (
                  <form action={updateTaskStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={task.id} />
                    <select
                      name="status"
                      defaultValue={task.status}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                    <Button size="sm" variant="secondary" type="submit">
                      Update
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
