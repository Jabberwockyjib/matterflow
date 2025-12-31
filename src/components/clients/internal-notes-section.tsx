"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

interface InternalNotesSectionProps {
  notes: string;
  onChange: (notes: string) => void;
  isSaving?: boolean;
  lastSaved?: Date;
}

export function InternalNotesSection({
  notes,
  onChange,
  isSaving = false,
  lastSaved,
}: InternalNotesSectionProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (seconds < 60) {
        setTimeAgo("just now");
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours} ${hours === 1 ? "hour" : "hours"} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [lastSaved]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="internal-notes" className="text-base font-semibold">
          Internal Notes
        </Label>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Saved {timeAgo}</span>
            </>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Private notes for your team. Not visible to clients.
      </p>
      <Textarea
        id="internal-notes"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add internal notes about this intake..."
        rows={4}
        className="resize-none"
      />
    </div>
  );
}
