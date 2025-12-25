"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicFormRenderer } from "@/components/intake/dynamic-form-renderer";
import type { IntakeFormTemplate } from "@/lib/intake/types";
import { saveIntakeFormDraft, submitIntakeForm } from "@/lib/intake";

interface IntakeFormClientProps {
  matterId: string;
  template: IntakeFormTemplate;
  initialValues: Record<string, any>;
  status: "draft" | "submitted" | "approved";
}

export function IntakeFormClient({
  matterId,
  template,
  initialValues,
  status,
}: IntakeFormClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (values: Record<string, any>) => {
    setError(null);
    setSuccessMessage(null);

    const result = await submitIntakeForm(matterId, template.name, values);

    if ("error" in result) {
      setError(result.error || "Failed to submit form. Please try again.");
    } else {
      // Redirect to thank you page
      window.location.href = `/intake/${matterId}/thank-you`;
    }
  };

  const handleSaveDraft = async (values: Record<string, any>) => {
    setError(null);
    setSuccessMessage(null);

    const result = await saveIntakeFormDraft(matterId, template.name, values);

    if ("error" in result) {
      setError(result.error || "Failed to save draft. Please try again.");
    } else {
      setSuccessMessage("Draft saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const isReadOnly = status === "submitted" || status === "approved";

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {isReadOnly && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-gray-700">
            This form has been submitted and cannot be edited.
          </p>
        </div>
      )}

      <DynamicFormRenderer
        template={template}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onSaveDraft={isReadOnly ? undefined : handleSaveDraft}
        readOnly={isReadOnly}
        submitButtonText="Submit Intake Form"
        matterId={matterId}
      />
    </div>
  );
}
