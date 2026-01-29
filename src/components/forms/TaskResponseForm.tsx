"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, FileText, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitTaskResponse } from "@/lib/data/actions";
import { showFormSuccess, showFormError } from "@/lib/toast";

const responseSchema = z.object({
  responseText: z.string().optional(),
});

type ResponseFormData = z.infer<typeof responseSchema>;

interface UploadedFile {
  id: string;
  name: string;
  webViewLink?: string;
}

interface TaskResponseFormProps {
  taskId: string;
  taskType: string;
  instructions: string | null;
  matterId: string;
  onSuccess?: () => void;
}

export function TaskResponseForm({
  taskId,
  taskType,
  instructions,
  matterId,
  onSuccess,
}: TaskResponseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConfirmation = taskType === "confirmation";
  const requiresText = taskType === "information_request";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResponseFormData>({
    resolver: zodResolver(
      requiresText
        ? responseSchema.extend({
            responseText: z.string().min(1, "Response is required"),
          })
        : responseSchema
    ),
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("matterId", matterId);
        formData.append("taskId", taskId);

        const response = await fetch("/api/tasks/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.ok) {
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: result.data.documentId,
              name: file.name,
              webViewLink: result.data.webViewLink,
            },
          ]);
        } else {
          showFormError("File", "upload");
        }
      } catch (error) {
        console.error("Upload error:", error);
        showFormError("File", "upload");
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const onSubmit = async (data: ResponseFormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("taskId", taskId);
      if (data.responseText) {
        formData.append("responseText", data.responseText);
      }
      formData.append("isConfirmation", String(isConfirmation));

      const result = await submitTaskResponse(formData);

      if (result.error) {
        showFormError("Response", "submit");
      } else {
        showFormSuccess("Response", "submitted");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Submit error:", error);
      showFormError("Response", "submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("isConfirmation", "true");

      const result = await submitTaskResponse(formData);

      if (result.error) {
        showFormError("Confirmation", "submit");
      } else {
        showFormSuccess("Task", "completed");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Confirm error:", error);
      showFormError("Confirmation", "submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation-only form
  if (isConfirmation) {
    return (
      <div className="space-y-4">
        {instructions && (
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
            {instructions}
          </div>
        )}
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              I Confirm
            </>
          )}
        </Button>
      </div>
    );
  }

  // Standard response form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {instructions && (
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
          {instructions}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {requiresText ? "Your Response *" : "Notes (optional)"}
        </label>
        <textarea
          {...register("responseText")}
          className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={
            requiresText
              ? "Please provide your response..."
              : "Add any notes or comments..."
          }
        />
        {errors.responseText && (
          <p className="mt-1 text-sm text-red-600">
            {errors.responseText.message}
          </p>
        )}
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Attachments
        </label>
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Upload className="h-6 w-6" />
              <span className="text-sm">
                Click to upload or drag and drop files
              </span>
            </div>
          )}
        </div>

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          "Submit Response"
        )}
      </Button>
    </form>
  );
}

export default TaskResponseForm;
