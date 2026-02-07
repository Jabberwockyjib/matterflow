"use client";

import { useTransition } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCalendarEventForTask } from "@/lib/calendar/actions";

type AddToCalendarButtonProps = {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  matterId: string;
  size?: "sm" | "default" | "lg" | "icon";
};

export function AddToCalendarButton({
  taskId,
  taskTitle,
  dueDate,
  matterId,
  size = "sm",
}: AddToCalendarButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size={size}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await createCalendarEventForTask(taskId, taskTitle, dueDate, matterId);
        });
      }}
      title="Add to calendar"
    >
      <Calendar className="h-4 w-4" />
      {size !== "icon" && (
        <span className="ml-1.5">{isPending ? "Adding..." : "Calendar"}</span>
      )}
    </Button>
  );
}
