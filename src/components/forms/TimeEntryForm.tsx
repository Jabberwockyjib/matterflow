"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { createTimeEntry } from "@/lib/data/actions";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the time entry creation form
 * Uses string inputs that will be transformed to the appropriate types
 * by the server action.
 */
const timeEntryFormSchema = z.object({
  matterId: z
    .string({ error: "Please select a matter" })
    .min(1, { error: "Please select a matter" }),
  taskId: z.string(),
  minutes: z.string(),
  description: z.string(),
});

type TimeEntryFormData = z.infer<typeof timeEntryFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface TimeEntryFormProps {
  /** List of available matters for the select dropdown */
  matters: Array<{ id: string; title: string }>;
  /** List of available tasks for the select dropdown */
  tasks: Array<{ id: string; title: string }>;
  /** Callback fired after successful form submission */
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TimeEntryForm - Client component for creating new time entries
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Inline error messages for invalid fields
 * - Toast notifications for success/error states
 * - Draft persistence across page refreshes
 * - Unsaved changes warning on navigation
 *
 * @example
 * ```tsx
 * <TimeEntryForm
 *   matters={[{ id: "123", title: "Matter A" }]}
 *   tasks={[{ id: "456", title: "Task A" }]}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function TimeEntryForm({ matters, tasks, onSuccess }: TimeEntryFormProps) {
  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      matterId: "",
      taskId: "",
      minutes: "",
      description: "",
    },
  });

  // Enable draft persistence for form state across page refreshes
  const { clearDraft } = useDraftPersistence({
    formId: "time-entry-create",
    watch,
    reset,
  });

  // Warn users when navigating away with unsaved changes
  useUnsavedChanges({ isDirty });

  // Convert matters array to select options
  const matterOptions = matters.map((matter) => ({
    value: matter.id,
    label: matter.title,
  }));

  // Convert tasks array to select options (with "No task" option)
  const taskOptions = [
    { value: "", label: "No task" },
    ...tasks.map((task) => ({
      value: task.id,
      label: task.title,
    })),
  ];

  // Handle form submission
  const onSubmit = async (data: TimeEntryFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("matterId", data.matterId);
    if (data.taskId) {
      formData.append("taskId", data.taskId);
    }
    if (data.minutes) {
      formData.append("minutes", data.minutes);
    }
    if (data.description) {
      formData.append("description", data.description);
    }

    const result = await createTimeEntry(formData);

    if (result.error) {
      showFormError("Time entry", "create", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      // Clear draft and reset form on success
      clearDraft();
      reset();
      showFormSuccess("Time entry", "created");
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-3">
      <FormSelect
        label="Matter"
        options={matterOptions}
        placeholder="Select a matter"
        registration={register("matterId")}
        error={errors.matterId}
        required
      />
      <FormSelect
        label="Task (optional)"
        options={taskOptions}
        registration={register("taskId")}
        error={errors.taskId}
      />
      <FormInput
        label="Minutes"
        type="number"
        placeholder="45"
        registration={register("minutes")}
        error={errors.minutes}
        helperText="Leave blank for a running timer"
      />
      <FormInput
        label="Description"
        placeholder="Review intake and prep notes"
        registration={register("description")}
        error={errors.description}
        containerClassName="md:col-span-3"
      />
      <div className="md:col-span-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging..." : "Log time"}
        </Button>
      </div>
    </form>
  );
}

export default TimeEntryForm;
