import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchMatters, fetchTasks } from "@/lib/data/queries";
import { supabaseEnvReady } from "@/lib/supabase/server";
import { TasksListClient } from "@/components/tasks/tasks-list-client";

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
        </div>
      </header>

      <main className="container py-8">
        <TasksListClient
          tasks={tasks}
          matters={matters}
          canEdit={canEdit}
          supabaseReady={supabaseReady}
        />
      </main>
    </div>
  );
}
