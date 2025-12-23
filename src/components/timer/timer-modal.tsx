"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { Play, Square, X, Clock, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTimer } from "@/contexts/timer-context";
import { cn } from "@/lib/utils";
import type { MatterSummary } from "@/lib/data/queries";
import { getSuggestionReasonLabel } from "@/lib/timer/suggest-matter";

/**
 * Format seconds into HH:MM:SS display
 */
function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map((val) => val.toString().padStart(2, "0"))
    .join(":");
}

/**
 * Format elapsed time for screen reader announcements (spoken format)
 * Only announces hours and minutes to avoid overwhelming users with second updates
 */
function formatElapsedTimeForSR(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

  if (parts.length === 0) return "less than a minute";
  return parts.join(" and ");
}

interface TimerModalProps {
  /**
   * List of available matters for selection.
   * Passed from parent to allow server-side fetching.
   */
  matters: MatterSummary[];
}

/**
 * TimerModal
 *
 * Modal dialog for timer control with:
 * - Matter selection dropdown
 * - Notes text area
 * - Start/Stop button based on timer state
 * - Elapsed time display when running
 * - Close on backdrop click or Escape key
 * - Focus trap for accessibility
 * - Keyboard navigation support
 * - Full ARIA support for screen readers
 */
export function TimerModal({ matters }: TimerModalProps) {
  const { state, actions, isModalOpen, closeModal, suggestionReason } = useTimer();
  const { isRunning, elapsedSeconds, selectedMatterId, notes, suggestedMatterId, error, status } = state;

  const [isPending, startTransition] = useTransition();
  const [localNotes, setLocalNotes] = useState(notes);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLSelectElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Generate unique IDs for accessibility
  const modalDescriptionId = useId();
  const elapsedTimeId = useId();
  const matterSelectId = useId();
  const notesInputId = useId();

  // Sync local notes with timer state
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Store reference to previously focused element when opening
  useEffect(() => {
    if (isModalOpen) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isModalOpen]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isModalOpen && previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, [isModalOpen]);

  /**
   * Handle backdrop click to close modal
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        // Pass close method for analytics tracking
        closeModal("backdrop");
      }
    },
    [closeModal]
  );

  /**
   * Handle Escape key to close modal
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        // Pass close method for analytics tracking
        closeModal("escape");
      }

      // Focus trap: Tab and Shift+Tab navigation
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: If on first element, go to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: If on last element, go to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  /**
   * Focus first element when modal opens
   */
  useEffect(() => {
    if (isModalOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isModalOpen]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  /**
   * Handle matter selection change
   */
  const handleMatterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      actions.updateMatter(e.target.value);
    },
    [actions]
  );

  /**
   * Handle notes change
   */
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalNotes(e.target.value);
      actions.updateNotes(e.target.value);
    },
    [actions]
  );

  /**
   * Handle start timer
   */
  const handleStart = useCallback(() => {
    if (!selectedMatterId) return;

    startTransition(async () => {
      await actions.start(selectedMatterId, localNotes);
    });
  }, [selectedMatterId, localNotes, actions]);

  /**
   * Handle stop timer
   */
  const handleStop = useCallback(() => {
    startTransition(async () => {
      await actions.stop(localNotes);
    });
  }, [localNotes, actions]);

  /**
   * Handle dismissing error message
   */
  const handleDismissError = useCallback(() => {
    actions.clearError();
  }, [actions]);

  // Don't render if modal is not open
  if (!isModalOpen) return null;

  // Find selected matter for display
  const selectedMatter = matters.find((m) => m.id === selectedMatterId);
  const isSuggested = selectedMatterId === suggestedMatterId && suggestedMatterId !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-modal-title"
      aria-describedby={modalDescriptionId}
    >
      {/* Hidden description for screen readers */}
      <p id={modalDescriptionId} className="sr-only">
        {isRunning
          ? `Timer is running. Elapsed time: ${formatElapsedTimeForSR(elapsedSeconds)}. Use the form below to add notes or stop the timer.`
          : "Use this dialog to select a matter and start tracking time. Select a matter, optionally add notes, then click Start Timer."}
      </p>

      <div
        ref={modalRef}
        className={cn(
          "relative w-full max-w-md mx-4 rounded-xl border border-slate-200 bg-white shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" aria-hidden="true" />
            <h2 id="timer-modal-title" className="text-lg font-semibold text-slate-900">
              {isRunning ? "Timer Running" : "Start Timer"}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => closeModal("button")}
            className="h-8 w-8 p-0 rounded-full"
            aria-label="Close timer modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Elapsed Time Display (when running) */}
        {isRunning && (
          <div
            className="border-b border-slate-200 bg-blue-50 px-5 py-4"
            role="timer"
            aria-label={`Elapsed time: ${formatElapsedTimeForSR(elapsedSeconds)}`}
          >
            <div className="flex items-center justify-center gap-2">
              <span
                id={elapsedTimeId}
                className="text-3xl font-mono font-bold text-blue-700 tabular-nums"
                aria-live="off"
              >
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </div>
            {selectedMatter && (
              <p className="mt-1 text-center text-sm text-blue-600">
                {selectedMatter.title}
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            className="border-b border-red-200 bg-red-50 px-5 py-3"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">
                  {isRunning ? "Failed to stop timer" : "Failed to start timer"}
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissError}
                className="flex-shrink-0 rounded-md p-1 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="space-y-4 px-5 py-4" role="form" aria-label="Timer settings">
          {/* Matter Selection */}
          <div className="block text-sm text-slate-700">
            <label
              htmlFor={matterSelectId}
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Matter {!selectedMatterId && !isRunning && <span className="text-red-500" aria-hidden="true">*</span>}
              {!selectedMatterId && !isRunning && <span className="sr-only">(required)</span>}
            </label>
            <select
              id={matterSelectId}
              ref={firstFocusableRef}
              value={selectedMatterId || ""}
              onChange={handleMatterChange}
              disabled={isRunning}
              className={cn(
                "w-full rounded-md border border-slate-200 px-3 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-blue-300",
                "disabled:bg-slate-100 disabled:cursor-not-allowed"
              )}
              aria-required={!isRunning}
              aria-invalid={!isRunning && !selectedMatterId ? "true" : undefined}
              aria-describedby={
                isSuggested && !isRunning && suggestionReason
                  ? "matter-suggestion-hint"
                  : undefined
              }
            >
              <option value="" disabled>
                Select a matter
              </option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.matterType})
                </option>
              ))}
            </select>
            {isSuggested && !isRunning && suggestionReason && (
              <p id="matter-suggestion-hint" className="mt-1 text-xs text-blue-600">
                {getSuggestionReasonLabel(suggestionReason)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="block text-sm text-slate-700">
            <label
              htmlFor={notesInputId}
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Notes <span className="sr-only">(optional)</span>
            </label>
            <textarea
              id={notesInputId}
              value={localNotes}
              onChange={handleNotesChange}
              placeholder="What are you working on?"
              rows={3}
              className={cn(
                "w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none",
                "focus:outline-none focus:ring-2 focus:ring-blue-300"
              )}
              aria-describedby={`${notesInputId}-hint`}
            />
            <p id={`${notesInputId}-hint`} className="sr-only">
              Optional notes to describe what you are working on
            </p>
          </div>
        </div>

        {/* Footer with Actions */}
        <div
          className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4"
          role="group"
          aria-label="Timer actions"
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => closeModal("button")}
            disabled={isPending || status === "stopping"}
          >
            Cancel
          </Button>
          {isRunning ? (
            <Button
              type="button"
              ref={lastFocusableRef}
              onClick={handleStop}
              disabled={isPending || status === "stopping"}
              className="bg-red-600 hover:bg-red-700 text-white"
              aria-busy={isPending || status === "stopping"}
              aria-describedby={elapsedTimeId}
            >
              {isPending || status === "stopping" ? (
                <>
                  <span className="sr-only">Stopping timer</span>
                  Stopping...
                </>
              ) : (
                <>
                  <Square className="mr-2 h-4 w-4 fill-current" aria-hidden="true" />
                  Stop Timer
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              ref={lastFocusableRef}
              onClick={handleStart}
              disabled={!selectedMatterId || isPending || status === "stopping"}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              aria-busy={isPending || status === "stopping"}
              aria-describedby={!selectedMatterId ? undefined : matterSelectId}
            >
              {isPending || status === "stopping" ? (
                <>
                  <span className="sr-only">Starting timer</span>
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" aria-hidden="true" />
                  Start Timer
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
