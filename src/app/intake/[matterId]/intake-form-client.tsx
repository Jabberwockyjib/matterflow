"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicFormRenderer } from "@/components/intake/dynamic-form-renderer";
import type { IntakeFormTemplate } from "@/lib/intake/types";
import { saveIntakeFormDraft, submitIntakeForm } from "@/lib/intake";
import { uploadIntakeFile } from "@/lib/intake/client-actions";

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
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  /**
   * Process form values and upload any files to Google Drive
   */
  const processFilesInValues = async (
    values: Record<string, any>
  ): Promise<Record<string, any>> => {
    const processedValues = { ...values };

    for (const [key, value] of Object.entries(values)) {
      // Check if this is an array of file objects
      if (Array.isArray(value) && value.length > 0 && value[0]?.file instanceof File) {
        setUploadProgress(`Uploading ${value.length} file(s)...`);

        const uploadedFiles = [];
        for (const fileData of value) {
          if (fileData.file instanceof File) {
            const result = await uploadIntakeFile(matterId, fileData.file, "intake");
            if (result.ok) {
              uploadedFiles.push({
                id: result.data.documentId,
                driveFileId: result.data.driveFileId,
                fileName: fileData.fileName,
                fileSize: fileData.fileSize,
                fileType: fileData.fileType,
                webViewLink: result.data.webViewLink,
              });
            } else {
              throw new Error(result.error || `Failed to upload ${fileData.fileName}`);
            }
          } else {
            // Already processed file (from previous save)
            uploadedFiles.push(fileData);
          }
        }
        processedValues[key] = uploadedFiles;
        setUploadProgress(null);
      }
    }

    return processedValues;
  };

  const handleSubmit = async (values: Record<string, any>) => {
    setError(null);
    setSuccessMessage(null);

    try {
      // Process and upload any files first
      const processedValues = await processFilesInValues(values);

      const result = await submitIntakeForm(matterId, template.name, processedValues);

      if ("error" in result) {
        setError(result.error || "Failed to submit form. Please try again.");
      } else {
        // Redirect to thank you page
        router.push(`/intake/${matterId}/thank-you`);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload files");
    }
  };

  const handleSaveDraft = async (values: Record<string, any>) => {
    setError(null);
    setSuccessMessage(null);

    try {
      // Process and upload any files first
      const processedValues = await processFilesInValues(values);

      const result = await saveIntakeFormDraft(matterId, template.name, processedValues);

      if ("error" in result) {
        setError(result.error || "Failed to save draft. Please try again.");
      } else {
        setSuccessMessage("Draft saved successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload files");
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

      {uploadProgress && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800">{uploadProgress}</p>
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
