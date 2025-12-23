"use client";

import { useCallback, useId, useTransition } from "react";
import { Clock, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTimer } from "@/contexts/timer-context";
import { cn } from "@/lib/utils";
import type { MatterSummary } from "@/lib/data/queries";

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
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

interface HeaderTimerDisplayProps {
  /**
   * List of matters to look up the selected matter name.
   * Should be the same list passed to TimerModal.
   */
  matters: MatterSummary[];
}

/**
 * HeaderTimerDisplay
 *
 * A compact timer display component for the application header.
 * Shows elapsed time in HH:MM:SS format with the selected matter name.
 * Only visible when a timer is running.
 *
 * Features:
 * - Elapsed time updates every second (via timer context)
 * - Clickable to open timer modal
 * - Inline stop button
 * - Truncated matter name for compact display
 * - Smooth appearance/disappearance animation
 * - Responsive design (icon only on small screens)
 * - Full keyboard navigation and screen reader support
 */
export function HeaderTimerDisplay({ matters }: HeaderTimerDisplayProps) {
  const { state, actions, openModal } = useTimer();
  const { isRunning, elapsedSeconds, selectedMatterId, notes } = state;

  const [isPending, startTransition] = useTransition();

  // Generate unique IDs for accessibility
  const timeDisplayId = useId();
  const matterDisplayId = useId();

  // Find the selected matter for display
  const selectedMatter = matters.find((m) => m.id === selectedMatterId);
  const matterName = selectedMatter?.title ?? "Unknown Matter";

  /**
   * Handle click on the timer display to open modal
   */
  const handleClick = useCallback(() => {
    // Pass source for analytics tracking
    openModal("header_display");
  }, [openModal]);

  /**
   * Handle keyboard activation for timer display
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        // Pass source for analytics tracking
        openModal("header_display");
      }
    },
    [openModal]
  );

  /**
   * Handle stop button click
   */
  const handleStop = useCallback(
    (e: React.MouseEvent) => {
      // Prevent the click from bubbling to the parent (which opens modal)
      e.stopPropagation();

      startTransition(async () => {
        await actions.stop(notes);
      });
    },
    [actions, notes]
  );

  /**
   * Handle keyboard activation for stop button
   */
  const handleStopKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          await actions.stop(notes);
        });
      }
    },
    [actions, notes]
  );

  // Don't render if timer is not running
  if (!isRunning) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        "animate-in fade-in-0 slide-in-from-right-4 duration-300"
      )}
      role="region"
      aria-label="Active timer"
    >
      {/* Timer Display - Clickable to open modal */}
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5",
          "bg-blue-50 border border-blue-200 text-blue-700",
          "hover:bg-blue-100 hover:border-blue-300 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1"
        )}
        aria-label={`Timer running: ${formatElapsedTime(elapsedSeconds)} on ${matterName}. Click to open timer details.`}
        aria-describedby={`${timeDisplayId} ${matterDisplayId}`}
      >
        {/* Clock icon - always visible */}
        <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />

        {/* Elapsed time - always visible */}
        <span
          id={timeDisplayId}
          className="font-mono text-sm font-medium tabular-nums"
        >
          {formatElapsedTime(elapsedSeconds)}
        </span>

        {/* Matter name - hidden on small screens */}
        <span
          id={matterDisplayId}
          className="hidden sm:inline text-sm font-medium max-w-[120px] truncate"
          title={matterName}
        >
          · {truncateText(matterName, 15)}
        </span>
      </button>

      {/* Stop Button */}
      <Button
        type="button"
        onClick={handleStop}
        onKeyDown={handleStopKeyDown}
        disabled={isPending}
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 rounded-full",
          "bg-red-50 border border-red-200 text-red-600",
          "hover:bg-red-100 hover:border-red-300 hover:text-red-700",
          "focus:ring-red-300",
          "disabled:opacity-50"
        )}
        aria-label={isPending ? "Stopping timer..." : "Stop timer"}
        aria-busy={isPending}
      >
        {isPending ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600"
            aria-hidden="true"
          />
        ) : (
          <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
