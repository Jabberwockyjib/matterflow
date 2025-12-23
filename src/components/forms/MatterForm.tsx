"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { createMatter } from "@/lib/data/actions";
import {
  billingModelValues,
  responsiblePartyValues,
} from "@/lib/validation/schemas";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the matter creation form
 * Uses string inputs that will be transformed to the appropriate types
 * by the server action.
 */
const matterFormSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .min(1, { error: "Title is required" }),
  matterType: z.string(),
  billingModel: z.enum(billingModelValues, {
    error: "Please select a billing model",
  }),
  responsibleParty: z.enum(responsiblePartyValues, {
    error: "Please select a responsible party",
  }),
  nextAction: z.string(),
});

type MatterFormData = z.infer<typeof matterFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface MatterFormProps {
  /** User ID of the owner (from session) */
  ownerId?: string;
  /** Callback fired after successful form submission */
  onSuccess?: () => void;
}

// ============================================================================
// Option Arrays for Select Fields
// ============================================================================

const billingModelOptions = billingModelValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const responsiblePartyOptions = responsiblePartyValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

// ============================================================================
// Component
// ============================================================================

/**
 * MatterForm - Client component for creating new matters
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
 * <MatterForm
 *   ownerId={session?.user.id}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function MatterForm({ ownerId, onSuccess }: MatterFormProps) {
  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<MatterFormData>({
    resolver: zodResolver(matterFormSchema),
    defaultValues: {
      title: "",
      matterType: "",
      billingModel: "hourly",
      responsibleParty: "lawyer",
      nextAction: "",
    },
  });

  // Enable draft persistence for form state across page refreshes
  const { clearDraft } = useDraftPersistence({
    formId: "matter-create",
    watch,
    reset,
  });

  // Warn users when navigating away with unsaved changes
  useUnsavedChanges({ isDirty });

  // Handle form submission
  const onSubmit = async (data: MatterFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("matterType", data.matterType || "General");
    formData.append("billingModel", data.billingModel);
    formData.append("responsibleParty", data.responsibleParty);
    if (data.nextAction) {
      formData.append("nextAction", data.nextAction);
    }
    if (ownerId) {
      formData.append("ownerId", ownerId);
    }

    const result = await createMatter(formData);

    if (result.error) {
      showFormError("Matter", "create", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      // Clear draft and reset form on success
      clearDraft();
      reset();
      showFormSuccess("Matter", "created");
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
      <FormInput
        label="Title"
        placeholder="New matter title"
        registration={register("title")}
        error={errors.title}
        required
      />
      <FormInput
        label="Matter Type"
        placeholder="Policy Review"
        registration={register("matterType")}
        error={errors.matterType}
      />
      <FormSelect
        label="Billing Model"
        options={billingModelOptions}
        registration={register("billingModel")}
        error={errors.billingModel}
        required
      />
      <FormSelect
        label="Responsible Party"
        options={responsiblePartyOptions}
        registration={register("responsibleParty")}
        error={errors.responsibleParty}
        required
      />
      <FormInput
        label="Next Action"
        placeholder="Draft review pack"
        registration={register("nextAction")}
        error={errors.nextAction}
        containerClassName="md:col-span-2"
      />
      <div className="md:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create matter"}
        </Button>
        {!ownerId && (
          <p className="mt-1 text-xs text-amber-700">
            No signed-in user; owner_id will be blank and may fail RLS. Sign in to set owner automatically.
          </p>
        )}
      </div>
    </form>
  );
}

export default MatterForm;
