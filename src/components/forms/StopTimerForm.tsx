"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { stopTimeEntry } from "@/lib/data/actions";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the stop timer form
 * Only requires the time entry ID to stop the timer.
 */
const stopTimerFormSchema = z.object({
  id: z
    .string({ error: "Time entry ID is required" })
    .min(1, { error: "Time entry ID is required" }),
});

type StopTimerFormData = z.infer<typeof stopTimerFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface StopTimerFormProps {
  /** ID of the time entry to stop */
  timeEntryId: string;
  /** Callback fired after successful form submission */
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * StopTimerForm - Client component for stopping a running time entry
 *
 * This is an inline quick-update form that doesn't need:
 * - Draft persistence (single action, no editable fields)
 * - Unsaved changes warning (no user-entered data)
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Toast notifications for success/error states
 * - Resets to original state on error
 *
 * @example
 * ```tsx
 * <StopTimerForm
 *   timeEntryId="abc-123"
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function StopTimerForm({ timeEntryId, onSuccess }: StopTimerFormProps) {
  // Initialize React Hook Form with Zod validation
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<StopTimerFormData>({
    resolver: zodResolver(stopTimerFormSchema),
    defaultValues: {
      id: timeEntryId,
    },
  });

  // Handle form submission
  const onSubmit = async (data: StopTimerFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("id", data.id);

    const result = await stopTimeEntry(formData);

    if (result.error) {
      showFormError("Timer", "stop", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      showFormSuccess("Timer", "stopped");
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" name="id" value={timeEntryId} />
      <Button size="sm" variant="secondary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Stopping..." : "Stop timer"}
      </Button>
    </form>
  );
}

export default StopTimerForm;
