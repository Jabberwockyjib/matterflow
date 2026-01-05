"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAndParseTemplate } from "@/lib/document-templates/actions";

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".docx")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Only .docx files are supported");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".docx")) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Only .docx files are supported");
      }
    }
  };

  async function handleSubmit() {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadAndParseTemplate(formData);

    if (!result.success) {
      setError(result.error || "Failed to upload template");
      setLoading(false);
      return;
    }

    // Navigate to the new template's edit page
    router.push(`/admin/templates/${result.data?.template.id}/edit`);
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : file
            ? "border-green-500 bg-green-50"
            : "border-slate-300 hover:border-slate-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">
              Drag and drop your Word document here, or
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                Browse Files
              </span>
            </label>
            <p className="text-xs text-slate-500 mt-4">
              Only .docx files are supported
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/templates")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Upload & Analyze"
          )}
        </Button>
      </div>
    </div>
  );
}
