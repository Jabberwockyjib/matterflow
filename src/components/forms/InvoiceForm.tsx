"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { createInvoice } from "@/lib/data/actions";
import { invoiceStatusValues } from "@/lib/validation/schemas";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the invoice creation form
 * Uses string inputs that will be transformed to the appropriate types
 * by the server action.
 */
const invoiceFormSchema = z.object({
  matterId: z
    .string({ error: "Please select a matter" })
    .min(1, { error: "Please select a matter" }),
  amount: z
    .string({ error: "Amount is required" })
    .min(1, { error: "Amount is required" })
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: "Amount must be a valid positive number" }
    ),
  status: z.enum(invoiceStatusValues, {
    error: "Please select a valid status",
  }),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface InvoiceFormProps {
  /** List of available matters for the select dropdown */
  matters: Array<{ id: string; title: string }>;
  /** Callback fired after successful form submission */
  onSuccess?: () => void;
}

// ============================================================================
// Option Arrays for Select Fields
// ============================================================================

const statusOptions = invoiceStatusValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

// ============================================================================
// Component
// ============================================================================

/**
 * InvoiceForm - Client component for creating new invoices
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
 * <InvoiceForm
 *   matters={[{ id: "123", title: "Matter A" }]}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function InvoiceForm({ matters, onSuccess }: InvoiceFormProps) {
  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      matterId: "",
      amount: "",
      status: "draft",
    },
  });

  // Enable draft persistence for form state across page refreshes
  const { clearDraft } = useDraftPersistence({
    formId: "invoice-create",
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
  const onSubmit = async (data: InvoiceFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("matterId", data.matterId);
    formData.append("amount", data.amount);
    formData.append("status", data.status);

    const result = await createInvoice(formData);

    if (result.error) {
      showFormError("Invoice", "create", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      // Clear draft and reset form on success
      clearDraft();
      reset();
      showFormSuccess("Invoice", "created");
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
      <FormSelect
        label="Matter"
        options={matterOptions}
        placeholder="Select a matter"
        registration={register("matterId")}
        error={errors.matterId}
        required
      />
      <FormInput
        label="Amount"
        type="number"
        placeholder="0.00"
        registration={register("amount")}
        error={errors.amount}
        required
      />
      <FormSelect
        label="Status"
        options={statusOptions}
        registration={register("status")}
        error={errors.status}
        required
      />
      <div className="md:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}

export default InvoiceForm;
