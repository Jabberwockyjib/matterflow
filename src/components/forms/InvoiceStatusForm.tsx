"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-field";
import { updateInvoiceStatus } from "@/lib/data/actions";
import { invoiceStatusValues } from "@/lib/validation/schemas";
import { showFormSuccess, showFormError } from "@/lib/toast";

// ============================================================================
// Schema (Form Input)
// ============================================================================

/**
 * Schema for the invoice status update form
 * All fields are strings since they come from form inputs.
 */
const invoiceStatusFormSchema = z.object({
  status: z.enum(invoiceStatusValues, {
    error: "Please select a valid status",
  }),
});

type InvoiceStatusFormData = z.infer<typeof invoiceStatusFormSchema>;

// ============================================================================
// Types
// ============================================================================

export interface InvoiceStatusFormProps {
  /** The invoice ID to update */
  invoiceId: string;
  /** Current status of the invoice */
  currentStatus: string;
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
 * InvoiceStatusForm - Client component for updating invoice status inline
 *
 * This is an inline form displayed within each invoice card to allow
 * quick updates to the invoice's status.
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
 * <InvoiceStatusForm
 *   invoiceId={invoice.id}
 *   currentStatus={invoice.status}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function InvoiceStatusForm({
  invoiceId,
  currentStatus,
  onSuccess,
}: InvoiceStatusFormProps) {
  // Default values from current invoice state
  const defaultValues: InvoiceStatusFormData = {
    status: (invoiceStatusValues.includes(currentStatus as typeof invoiceStatusValues[number])
      ? currentStatus
      : "draft") as typeof invoiceStatusValues[number],
  };

  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceStatusFormData>({
    resolver: zodResolver(invoiceStatusFormSchema),
    defaultValues,
  });

  // Handle form submission
  const onSubmit = async (data: InvoiceStatusFormData) => {
    // Create FormData for server action
    const formData = new FormData();
    formData.append("id", invoiceId);
    formData.append("status", data.status);

    const result = await updateInvoiceStatus(formData);

    if (result.error) {
      // Reset form to original values on error
      reset(defaultValues);
      showFormError("Invoice", "update", {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      showFormSuccess("Invoice", "updated");
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

export default InvoiceStatusForm;
