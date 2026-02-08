"use client";

import * as React from "react";
import { Timer, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MatterSearch } from "@/components/time/matter-search";
import {
  type MatterSearchResult,
  createQuickTimeEntry,
} from "@/lib/data/actions";
import { parseDurationWithValidation } from "@/lib/utils/duration-parser";

export interface QuickAddTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultMatterId?: string;
  defaultMatterTitle?: string;
}

// Generate stable IDs for accessibility
const FORM_IDS = {
  matter: "quick-add-matter",
  matterError: "quick-add-matter-error",
  duration: "quick-add-duration",
  durationHelp: "quick-add-duration-help",
  durationError: "quick-add-duration-error",
  notes: "quick-add-notes",
  date: "quick-add-date",
  formError: "quick-add-form-error",
} as const;

export function QuickAddTimeEntryDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultMatterId,
  defaultMatterTitle,
}: QuickAddTimeEntryDialogProps) {
  const [matterId, setMatterId] = React.useState(defaultMatterId ?? "");
  const [selectedMatter, setSelectedMatter] =
    React.useState<MatterSearchResult | null>(
      defaultMatterId
        ? { id: defaultMatterId, title: defaultMatterTitle ?? "", clientName: null, matterType: "" }
        : null,
    );
  const [duration, setDuration] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState(() => {
    // Default to today's date in local timezone (YYYY-MM-DD format)
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    matter?: string;
    duration?: string;
  }>({});

  // Refs for focus management
  const durationInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Small delay to allow close animation
      const timer = setTimeout(() => {
        setMatterId(defaultMatterId ?? "");
        setSelectedMatter(
          defaultMatterId
            ? { id: defaultMatterId, title: defaultMatterTitle ?? "", clientName: null, matterType: "" }
            : null,
        );
        setDuration("");
        setNotes("");
        setDate(new Date().toISOString().split("T")[0]);
        setError(null);
        setFieldErrors({});
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, defaultMatterId, defaultMatterTitle]);

  const handleMatterChange = (
    id: string,
    matter: MatterSearchResult | null,
  ) => {
    setMatterId(id);
    setSelectedMatter(matter);
    // Clear error when user selects a matter
    if (fieldErrors.matter && id) {
      setFieldErrors((prev) => ({ ...prev, matter: undefined }));
    }
    if (error) {
      setError(null);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(e.target.value);
    // Clear error when user types
    if (fieldErrors.duration) {
      setFieldErrors((prev) => ({ ...prev, duration: undefined }));
    }
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newFieldErrors: { matter?: string; duration?: string } = {};

    // Validate matter is selected
    if (!matterId) {
      newFieldErrors.matter = "Please select a matter";
    }

    // Validate duration is provided
    if (!duration.trim()) {
      newFieldErrors.duration = "Please enter a duration";
    } else {
      // Parse and validate duration format
      const parsedDuration = parseDurationWithValidation(duration);
      if (!parsedDuration.isValid) {
        newFieldErrors.duration = parsedDuration.error;
      }
    }

    // If there are field errors, set them and return
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    // Parse duration (already validated above, so we know it's valid)
    const parsedDuration = parseDurationWithValidation(duration);
    if (!parsedDuration.isValid) {
      // Should never happen since we validated above, but TypeScript needs this
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createQuickTimeEntry({
        matterId,
        minutes: parsedDuration.minutes,
        description: notes.trim() || undefined,
        date: date || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onSuccess?.();
      onOpenChange(false);
    } catch {
      setError("Failed to create time entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Focus duration input after matter is selected
  const handleMatterSelect = (
    id: string,
    matter: MatterSearchResult | null,
  ) => {
    handleMatterChange(id, matter);
    // Focus duration input after matter selection
    if (id && durationInputRef.current) {
      // Small delay to ensure popover is closed
      setTimeout(() => {
        durationInputRef.current?.focus();
      }, 50);
    }
  };

  // Determine aria-describedby for duration input
  const durationDescribedBy = [
    FORM_IDS.durationHelp,
    fieldErrors.duration ? FORM_IDS.durationError : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="quick-add-description">
        <DialogHeader>
          <DialogTitle>{defaultMatterId ? "Add Time Entry" : "Quick Add Time Entry"}</DialogTitle>
          <DialogDescription id="quick-add-description">
            {defaultMatterId
              ? "Log time for this matter. Press Enter to submit, Escape to cancel."
              : "Log time to a matter. Press Enter to submit, Escape to cancel."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2" noValidate>
          {/* Matter Search - hidden when defaultMatterId is provided */}
          {!defaultMatterId && (
            <div className="space-y-1">
              <label
                htmlFor={FORM_IDS.matter}
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Matter <span className="text-red-500" aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <MatterSearch
                id={FORM_IDS.matter}
                value={matterId}
                onValueChange={handleMatterSelect}
                placeholder="Search for a matter..."
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!fieldErrors.matter}
                aria-describedby={fieldErrors.matter ? FORM_IDS.matterError : undefined}
              />
              {fieldErrors.matter && (
                <p
                  id={FORM_IDS.matterError}
                  className="text-sm text-red-600"
                  role="alert"
                >
                  {fieldErrors.matter}
                </p>
              )}
            </div>
          )}

          {/* Duration Input */}
          <div className="space-y-1">
            <label
              htmlFor={FORM_IDS.duration}
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Duration <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              ref={durationInputRef}
              id={FORM_IDS.duration}
              type="text"
              value={duration}
              onChange={handleDurationChange}
              placeholder="e.g. 1.5h, 90m, 1:30"
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 ${
                fieldErrors.duration
                  ? "border-red-300 focus:ring-red-200"
                  : "border-slate-200"
              }`}
              disabled={isSubmitting}
              autoComplete="off"
              aria-required="true"
              aria-invalid={!!fieldErrors.duration}
              aria-describedby={durationDescribedBy || undefined}
            />
            <span
              id={FORM_IDS.durationHelp}
              className="mt-1 block text-xs text-slate-400"
            >
              Formats: 1h, 1.5h, 90m, 1:30, 1h30m
            </span>
            {fieldErrors.duration && (
              <p
                id={FORM_IDS.durationError}
                className="text-sm text-red-600"
                role="alert"
              >
                {fieldErrors.duration}
              </p>
            )}
          </div>

          {/* Notes Textarea */}
          <div className="space-y-1">
            <label
              htmlFor={FORM_IDS.notes}
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id={FORM_IDS.notes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Description of work performed"
              rows={3}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
              disabled={isSubmitting}
            />
          </div>

          {/* Date Input */}
          <div className="space-y-1">
            <label
              htmlFor={FORM_IDS.date}
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Date <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id={FORM_IDS.date}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              disabled={isSubmitting}
            />
          </div>

          {/* General Error Message */}
          {error && (
            <div
              id={FORM_IDS.formError}
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              aria-describedby={error ? FORM_IDS.formError : undefined}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <span>Log time</span>
                  <Timer className="ml-2 h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
