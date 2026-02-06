"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

interface LogoUploadProps {
  currentLogoUrl: string | null;
  onLogoChange?: (url: string | null) => void;
}

export function LogoUpload({ currentLogoUrl, onLogoChange }: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting the same file triggers onChange
    e.target.value = "";

    // Client-side validation
    if (file.size > MAX_SIZE) {
      toast.error("Logo file too large. Maximum size is 2MB.");
      return;
    }

    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Invalid format. Use PNG, JPG, WebP, or SVG.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to upload logo");
        return;
      }

      setLogoUrl(data.url);
      onLogoChange?.(data.url);
      toast.success("Logo uploaded successfully");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to remove logo");
        return;
      }

      setLogoUrl(null);
      onLogoChange?.(null);
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Firm logo"
            className="max-h-20 max-w-[200px] object-contain"
            onError={() => setLogoUrl(null)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">No logo uploaded</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || removing}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {logoUrl ? "Replace Logo" : "Upload Logo"}
            </>
          )}
        </Button>

        {logoUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || removing}
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700"
          >
            {removing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        PNG, JPG, WebP, or SVG. Max 2MB. Recommended: 400x200px or smaller.
      </p>
    </div>
  );
}
