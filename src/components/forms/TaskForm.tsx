"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { createTask } from "@/lib/data/actions";
import { responsiblePartyValues } from "@/lib/validation/schemas";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the task creation form
 * Uses string inputs that will be transformed to the appropriate types
 * by the server action.
 */
const taskFormSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .min(1, { error: "Title is required" }),
  matterId: z
    .string({ error: "Please select a matter" })
    .min(1, { error: "Please select a matter" }),
  dueDate: z.string().optional(),
  responsibleParty: z.enum(responsiblePartyValues, {
    error: "Please select a responsible party",
  }),
  taskType: z.enum(["document_upload", "information_request", "confirmation", "general"], {
    error: "Please select a task type",
  }),
  instructions: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface TaskFormProps {
  /** List of available matters for the select dropdown */
  matters: Array<{ id: string; title: string }>;
  /** Callback fired after successful form submission */
  onSuccess?: () => void;
}

// ============================================================================
// Option Arrays for Select Fields
// ============================================================================

const responsiblePartyOptions = responsiblePartyValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const taskTypeOptions = [
  { value: "general", label: "General" },
  { value: "document_upload", label: "Document Upload" },
  { value: "information_request", label: "Information Request" },
  { value: "confirmation", label: "Confirmation" },
];

// ============================================================================
// Component
// ============================================================================

/**
 * TaskForm - Client component for creating new tasks
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
 * <TaskForm
 *   matters={[{ id: "123", title: "Matter A" }]}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function TaskForm({ matters, onSuccess }: TaskFormProps) {
  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      matterId: "",
      dueDate: "",
      responsibleParty: "lawyer",
      taskType: "general",
      instructions: "",
    },
  });

  // Enable draft persistence for form state across page refreshes
  const { clearDraft } = useDraftPersistence({
    formId: "task-create",
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

  // Handle form submission
  const onSubmit = async (data: TaskFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("matterId", data.matterId);
    if (data.dueDate) {
      formData.append("dueDate", data.dueDate);
    }
    formData.append("responsibleParty", data.responsibleParty);
    formData.append("taskType", data.taskType);
    if (data.instructions) {
      formData.append("instructions", data.instructions);
    }

    const result = await createTask(formData);

    if (result.error) {
      showFormError("Task", "create", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      // Clear draft and reset form on success
      clearDraft();
      reset();
      showFormSuccess("Task", "created");
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
      <FormInput
        label="Title"
        placeholder="Task title"
        registration={register("title")}
        error={errors.title}
        required
      />
      <FormSelect
        label="Matter"
        options={matterOptions}
        placeholder="Select a matter"
        registration={register("matterId")}
        error={errors.matterId}
        required
      />
      <FormInput
        label="Due Date"
        type="date"
        registration={register("dueDate")}
        error={errors.dueDate}
      />
      <FormSelect
        label="Responsible Party"
        options={responsiblePartyOptions}
        registration={register("responsibleParty")}
        error={errors.responsibleParty}
        required
      />
      <FormSelect
        label="Task Type"
        options={taskTypeOptions}
        registration={register("taskType")}
        error={errors.taskType}
        required
      />
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Instructions for Client
        </label>
        <textarea
          {...register("instructions")}
          placeholder="What do you need from the client?"
          className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create task"}
        </Button>
      </div>
    </form>
  );
}

export default TaskForm;
