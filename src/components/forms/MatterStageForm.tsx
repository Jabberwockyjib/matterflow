"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { updateMatterStage } from "@/lib/data/actions";
import {
  matterStageValues,
  responsiblePartyValues,
} from "@/lib/validation/schemas";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the matter stage update form
 * All fields are strings since they come from form inputs.
 */
const matterStageFormSchema = z.object({
  stage: z.enum(matterStageValues, {
    error: "Please select a valid stage",
  }),
  responsibleParty: z.enum(responsiblePartyValues, {
    error: "Please select a responsible party",
  }),
  nextAction: z.string().min(1, { message: "Next action is required" }),
  nextActionDueDate: z.string().min(1, { message: "Due date is required" }),
});

type MatterStageFormData = z.infer<typeof matterStageFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface MatterStageFormProps {
  /** The matter ID to update */
  matterId: string;
  /** Current stage of the matter */
  currentStage: string;
  /** Current responsible party */
  currentResponsibleParty: string;
  /** Current next action (may be null) */
  currentNextAction: string | null;
  /** Current next action due date (may be null) */
  currentNextActionDueDate: string | null;
  /** Callback fired after successful form submission */
  onSuccess?: () => void;
}

// ============================================================================
// Option Arrays for Select Fields
// ============================================================================

const stageOptions = matterStageValues.map((value) => ({
  value,
  label: value,
}));

const responsiblePartyOptions = responsiblePartyValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

// ============================================================================
// Component
// ============================================================================

/**
 * MatterStageForm - Client component for updating matter stage/status inline
 *
 * This is an inline form displayed within each matter card to allow
 * quick updates to the matter's stage, responsible party, and next action.
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
 * <MatterStageForm
 *   matterId={matter.id}
 *   currentStage={matter.stage}
 *   currentResponsibleParty={matter.responsibleParty}
 *   currentNextAction={matter.nextAction}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
// Helper to format date for input (YYYY-MM-DD)
function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toISOString().split("T")[0];
}

export function MatterStageForm({
  matterId,
  currentStage,
  currentResponsibleParty,
  currentNextAction,
  currentNextActionDueDate,
  onSuccess,
}: MatterStageFormProps) {
  // Default values from current matter state
  const defaultValues: MatterStageFormData = {
    stage: (matterStageValues.includes(currentStage as typeof matterStageValues[number])
      ? currentStage
      : "Lead Created") as typeof matterStageValues[number],
    responsibleParty: (responsiblePartyValues.includes(currentResponsibleParty as typeof responsiblePartyValues[number])
      ? currentResponsibleParty
      : "lawyer") as typeof responsiblePartyValues[number],
    nextAction: currentNextAction || "",
    nextActionDueDate: formatDateForInput(currentNextActionDueDate),
  };

  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MatterStageFormData>({
    resolver: zodResolver(matterStageFormSchema),
    defaultValues,
  });

  // Handle form submission
  const onSubmit = async (data: MatterStageFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("id", matterId);
    formData.append("stage", data.stage);
    formData.append("responsibleParty", data.responsibleParty);
    formData.append("nextAction", data.nextAction);
    formData.append("nextActionDueDate", data.nextActionDueDate);

    const result = await updateMatterStage(formData);

    if (result.error) {
      // Reset form to original values on error
      reset(defaultValues);
      showFormError("Matter", "update", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      showFormSuccess("Matter", "updated");
      onSuccess?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-2 md:grid-cols-5"
    >
      <div className="text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Stage
        </span>
        <FormSelect
          options={stageOptions}
          registration={register("stage")}
          error={errors.stage}
          className="px-2 py-1 text-xs"
        />
      </div>
      <div className="text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Responsible
        </span>
        <FormSelect
          options={responsiblePartyOptions}
          registration={register("responsibleParty")}
          error={errors.responsibleParty}
          className="px-2 py-1 text-xs"
        />
      </div>
      <div className="text-xs text-slate-700 md:col-span-2">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Next action
        </span>
        <FormInput
          registration={register("nextAction")}
          error={errors.nextAction}
          className="px-2 py-1 text-xs"
        />
      </div>
      <div className="text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Due date
        </span>
        <FormInput
          type="date"
          registration={register("nextActionDueDate")}
          error={errors.nextActionDueDate}
          className="px-2 py-1 text-xs"
        />
      </div>
      <div className="md:col-span-5">
        <Button type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update"}
        </Button>
      </div>
    </form>
  );
}

export default MatterStageForm;
