"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortDropdown, type SortOption } from "@/components/ui/sort-dropdown";
import {
  ContentCard,
  ContentCardContent,
  ContentCardDescription,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";
import { TaskForm } from "@/components/forms/TaskForm";
import { TaskStatusForm } from "@/components/forms/TaskStatusForm";
import type { TaskSummary, MatterSummary } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

// Sort options for tasks
type TaskSortKey =
  | "dueDate-asc"
  | "dueDate-desc"
  | "responsibleParty"
  | "status"
  | "updatedAt";

const sortOptions: SortOption<TaskSortKey>[] = [
  { value: "dueDate-asc", label: "Due date (soonest)" },
  { value: "dueDate-desc", label: "Due date (latest)" },
  { value: "responsibleParty", label: "Responsible party" },
  { value: "status", label: "Status" },
];

// Status order for sorting
const statusOrder = ["open", "in-progress", "completed"];

// Responsible party order
const partyOrder = ["client", "lawyer", "staff"];

function sortTasks(tasks: TaskSummary[], sortKey: TaskSortKey): TaskSummary[] {
  const sorted = [...tasks];

  switch (sortKey) {
    case "dueDate-asc":
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    case "dueDate-desc":
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
    case "responsibleParty":
      return sorted.sort(
        (a, b) =>
          partyOrder.indexOf(a.responsibleParty) -
          partyOrder.indexOf(b.responsibleParty)
      );
    case "status":
      return sorted.sort(
        (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
      );
    default:
      return sorted;
  }
}

const formatDue = (value: string | null) => {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString();
};

interface TasksListClientProps {
  tasks: TaskSummary[];
  matters: MatterSummary[];
  canEdit: boolean;
  supabaseReady: boolean;
}

export function TasksListClient({
  tasks,
  matters,
  canEdit,
  supabaseReady,
}: TasksListClientProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = React.useState<TaskSortKey>("dueDate-asc");
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const sortedTasks = React.useMemo(
    () => sortTasks(tasks, sortKey),
    [tasks, sortKey]
  );

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header with sort and add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </p>
        <div className="flex items-center gap-2">
          <SortDropdown
            options={sortOptions}
            value={sortKey}
            onChange={setSortKey}
          />
          {canEdit && !isFormOpen && (
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible create form */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {isFormOpen && (
            <ContentCard className="animate-fade-in">
              <ContentCardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <ContentCardTitle>Create Task</ContentCardTitle>
                  <ContentCardDescription>
                    Attach to a matter; defaults to open status.
                  </ContentCardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </ContentCardHeader>
              <ContentCardContent>
                {canEdit ? (
                  <TaskForm matters={matters} onSuccess={handleFormSuccess} />
                ) : (
                  <p className="text-sm text-amber-700">
                    {supabaseReady
                      ? "Clients cannot create tasks. Sign in as staff/admin."
                      : "Supabase env vars not set; creation disabled."}
                  </p>
                )}
              </ContentCardContent>
            </ContentCard>
          )}
        </div>
      </div>

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-muted-foreground dark:text-zinc-400">
            No tasks found. Create your first task above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedTasks.map((task, index) => (
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
                    variant={
                      task.responsibleParty === "client" ? "warning" : "default"
                    }
                  >
                    {task.responsibleParty} owns
                  </Badge>
                  <Badge variant="outline">{task.status}</Badge>
                  <span className="text-slate-600">
                    Matter ID: {task.matterId}
                  </span>
                </div>
                {canEdit && (
                  <TaskStatusForm
                    taskId={task.id}
                    currentStatus={task.status}
                    onSuccess={() => router.refresh()}
                  />
                )}
              </ContentCardContent>
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
}
