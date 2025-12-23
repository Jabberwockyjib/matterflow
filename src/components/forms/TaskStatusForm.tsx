"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-field";
import { updateTaskStatus } from "@/lib/data/actions";
import { taskStatusValues } from "@/lib/validation/schemas";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the task status update form
 * All fields are strings since they come from form inputs.
 */
const taskStatusFormSchema = z.object({
  status: z.enum(taskStatusValues, {
    error: "Please select a valid status",
  }),
});

type TaskStatusFormData = z.infer<typeof taskStatusFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface TaskStatusFormProps {
  /** The task ID to update */
  taskId: string;
  /** Current status of the task */
  currentStatus: string;
  /** Callback fired after successful form submission */
  onSuccess?: () => void;
}

// ============================================================================
// Option Arrays for Select Fields
// ============================================================================

const statusOptions = taskStatusValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1).replace("-", " "),
}));

// ============================================================================
// Component
// ============================================================================

/**
 * TaskStatusForm - Client component for updating task status inline
 *
 * This is an inline form displayed within each task card to allow
 * quick updates to the task's status.
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Inline error messages for invalid fields
 * - Toast notifications for success/error states
 * - Form resets to original values on error
 * - Compact styling matching existing inline form patterns
 *
 * Note: This form does NOT use draft persistence or unsaved changes warning
 * as it's an inline quick-update form, not a full creation form.
 *
 * @example
 * ```tsx
 * <TaskStatusForm
 *   taskId={task.id}
 *   currentStatus={task.status}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function TaskStatusForm({
  taskId,
  currentStatus,
  onSuccess,
}: TaskStatusFormProps) {
  // Default values from current task state
  const defaultValues: TaskStatusFormData = {
    status: (taskStatusValues.includes(currentStatus as typeof taskStatusValues[number])
      ? currentStatus
      : "open") as typeof taskStatusValues[number],
  };

  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskStatusFormData>({
    resolver: zodResolver(taskStatusFormSchema),
    defaultValues,
  });

  // Handle form submission
  const onSubmit = async (data: TaskStatusFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("id", taskId);
    formData.append("status", data.status);

    const result = await updateTaskStatus(formData);

    if (result.error) {
      // Reset form to original values on error
      reset(defaultValues);
      showFormError("Task", "update", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      showFormSuccess("Task", "updated");
      onSuccess?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex items-end gap-2"
    >
      <div className="text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Status
        </span>
        <FormSelect
          options={statusOptions}
          registration={register("status")}
          error={errors.status}
          className="px-2 py-1 text-xs"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update"}
      </Button>
    </form>
  );
}

export default TaskStatusForm;
