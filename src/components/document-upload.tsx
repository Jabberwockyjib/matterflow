"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadDocument } from "@/lib/google-drive/actions";
import { useState } from "react";

interface DocumentUploadProps {
  matterId: string;
  folderType: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({
  matterId,
  folderType,
  onUploadComplete,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("matterId", matterId);
    formData.append("folderType", folderType);

    const result = await uploadDocument(formData);

    setUploading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onUploadComplete?.();
      }, 2000);
    }

    // Reset input
    e.target.value = "";
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Upload to {folderType}
          </span>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
        </label>

        {uploading && (
          <div className="text-sm text-blue-600">
            Uploading to Google Drive...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            ✓ Document uploaded successfully!
          </div>
        )}
      </div>
    </Card>
  );
}
