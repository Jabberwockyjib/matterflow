"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskStatusForm } from "@/components/forms/TaskStatusForm";
import { useTimer } from "@/contexts/timer-context";

interface Task {
  id: string;
  title: string;
  status: string;
  responsibleParty: string;
  dueDate: string | null;
  notes?: string | null;
}

interface MatterTasksListProps {
  tasks: Task[];
  matterId: string;
}

/**
 * Format seconds into MM:SS or HH:MM:SS display
 */
function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return [hours, minutes, secs]
      .map((val) => val.toString().padStart(2, "0"))
      .join(":");
  }
  return [minutes, secs]
    .map((val) => val.toString().padStart(2, "0"))
    .join(":");
}

export function MatterTasksList({ tasks, matterId }: MatterTasksListProps) {
  const router = useRouter();
  const { state, actions } = useTimer();

  const isTimerRunningForMatter = state.isRunning && state.selectedMatterId === matterId;

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "done":
        return "success";
      case "pending_review":
        return "warning";
      case "cancelled":
        return "outline";
      default:
        return "default";
    }
  };

  const handleQuickComplete = async (taskId: string) => {
    const formData = new FormData();
    formData.append("id", taskId);
    formData.append("status", "done");

    const { updateTaskStatus } = await import("@/lib/data/actions");
    const result = await updateTaskStatus(formData);

    if (!result.error) {
      router.refresh();
    }
  };

  const handleStartTimer = async (taskTitle: string) => {
    await actions.start(matterId, taskTitle);
  };

  const handleStopTimer = async () => {
    await actions.stop();
    router.refresh(); // Refresh to show new time entry
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-slate-900">No tasks</h3>
        <p className="mt-1 text-sm text-slate-500">
          Get started by creating a new task for this matter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Show active timer banner if running for this matter */}
      {isTimerRunningForMatter && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Timer running</p>
              <p className="text-xs text-blue-700">{state.notes || "No description"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-semibold text-blue-900 tabular-nums">
              {formatElapsedTime(state.elapsedSeconds)}
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={handleStopTimer}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Square className="h-4 w-4 mr-1 fill-current" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {tasks.map((task) => {
        const overdue = isOverdue(task.dueDate) && task.status !== "done";
        const isDone = task.status === "done";
        // Check if timer is running for this specific task (by matching notes)
        const isTimerRunningForTask = isTimerRunningForMatter && state.notes === task.title;

        return (
          <div
            key={task.id}
            className={`p-4 rounded-lg border transition-colors ${
              isTimerRunningForTask
                ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200"
                : overdue
                ? "border-red-200 bg-red-50/50"
                : isDone
                ? "border-green-200 bg-green-50/30"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${isDone ? "text-slate-500 line-through" : "text-slate-900"}`}>
                    {task.title}
                  </h3>
                  {isTimerRunningForTask && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                      {formatElapsedTime(state.elapsedSeconds)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    variant={task.responsibleParty === "client" ? "warning" : "default"}
                  >
                    {task.responsibleParty}
                  </Badge>
                  <Badge variant={getStatusVariant(task.status)}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
                      <CalendarClock className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                      {overdue && " (overdue)"}
                    </span>
                  )}
                </div>
                {task.notes && (
                  <p className="mt-2 text-sm text-slate-600">{task.notes}</p>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Timer button */}
                {task.status !== "done" && (
                  isTimerRunningForTask ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleStopTimer}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Square className="h-4 w-4 mr-1 fill-current" />
                      Stop
                    </Button>
                  ) : isTimerRunningForMatter ? (
                    // Timer running on different task - show disabled state
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="text-slate-400"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartTimer(task.title)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )
                )}
                {/* Mark done button */}
                {task.status !== "done" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickComplete(task.id)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Done
                  </Button>
                )}
              </div>
            </div>

            {/* Status update form */}
            {task.status !== "done" && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <TaskStatusForm
                  taskId={task.id}
                  currentStatus={task.status}
                  onSuccess={() => router.refresh()}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
