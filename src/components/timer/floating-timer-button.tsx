"use client";

import { Timer, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTimer } from "@/contexts/timer-context";
import { cn } from "@/lib/utils";

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
 * FloatingTimerButton
 *
 * A fixed-position button that appears on all pages.
 * Shows different visual states for idle (timer icon) vs running (stop icon with elapsed time).
 * Includes pulse animation when timer is running.
 * Click opens the timer modal.
 */
export function FloatingTimerButton() {
  const { state, openModal } = useTimer();
  const { isRunning, elapsedSeconds } = state;

  const handleClick = () => {
    // Pass source for analytics tracking
    openModal("floating_button");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 sm:bottom-8 sm:right-8">

      {/* Pulse animation ring when timer is running */}
      {isRunning && (
        <span
          className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75"
          aria-hidden="true"
        />
      )}

      <Button
        onClick={handleClick}
        variant={isRunning ? "default" : "secondary"}
        className={cn(
          "relative h-14 min-w-14 rounded-full shadow-lg transition-all",
          "hover:scale-105 active:scale-95",
          isRunning
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-white border-slate-300 hover:bg-slate-100",
          // Responsive padding for elapsed time display
          isRunning && "px-4"
        )}
        aria-label={
          isRunning
            ? `Stop timer. Elapsed time: ${formatElapsedTime(elapsedSeconds)}`
            : "Start timer"
        }
        aria-keyshortcuts="Control+T Meta+T"
        aria-pressed={isRunning}
      >
        {isRunning ? (
          <div className="flex items-center gap-2">
            <Square className="h-5 w-5 fill-current" aria-hidden="true" />
            <span className="text-sm font-mono font-medium tabular-nums">
              {formatElapsedTime(elapsedSeconds)}
            </span>
          </div>
        ) : (
          <Timer className="h-6 w-6" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
