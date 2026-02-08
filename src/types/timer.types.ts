/**
 * Timer Types
 *
 * TypeScript interfaces for the 2-click time tracking system.
 * These types support the global timer state management, persistence,
 * and cross-tab synchronization features.
 */

import type { Database } from "./database.types";

// Re-export relevant database types for convenience
export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
export type TimeEntryInsert = Database["public"]["Tables"]["time_entries"]["Insert"];
export type Matter = Database["public"]["Tables"]["matters"]["Row"];

/**
 * Timer status enum for clarity
 */
export type TimerStatus = "idle" | "running" | "stopping" | "error";

/**
 * Core timer state managed by the TimerContext.
 * This state is persisted to localStorage for refresh recovery
 * and synced across browser tabs.
 */
export interface TimerState {
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Current status of the timer (idle, running, stopping, error) */
  status: TimerStatus;
  /** Timestamp (ms since epoch) when the timer was started */
  startTime: number | null;
  /** Calculated elapsed time in seconds (updated every second while running) */
  elapsedSeconds: number;
  /** Matter ID suggested by the context detection algorithm */
  suggestedMatterId: string | null;
  /** Matter ID selected by the user (may differ from suggested) */
  selectedMatterId: string | null;
  /** Notes/description for the time entry */
  notes: string;
  /** Active time entry ID from the database (set after timer starts) */
  activeEntryId: string | null;
  /** Error message from API failures (null if no error) */
  error: string | null;
}

/**
 * Actions available for timer control.
 * These are provided by the TimerContext for consumers.
 */
export interface TimerActions {
  /**
   * Start the timer with the selected matter.
   * Creates a time_entry in the database with no end time.
   * @param matterId - The matter to track time against
   * @param notes - Optional initial notes
   * @param taskId - Optional task to associate with the entry
   */
  start: (matterId: string, notes?: string, taskId?: string) => Promise<void>;

  /**
   * Stop the timer and finalize the time entry.
   * Updates the time_entry with end time and duration.
   * @param notes - Final notes for the time entry
   */
  stop: (notes?: string) => Promise<void>;

  /**
   * Reset the timer to initial state without saving.
   * Used for canceling a timer without creating an entry.
   */
  reset: () => void;

  /**
   * Update the notes while timer is running or stopped.
   * @param notes - Updated notes text
   */
  updateNotes: (notes: string) => void;

  /**
   * Update the selected matter ID.
   * @param matterId - New matter ID to associate with timer
   */
  updateMatter: (matterId: string) => void;

  /**
   * Set the suggested matter based on context.
   * Called by the suggestion algorithm when context changes.
   * @param matterId - Suggested matter ID (or null if none)
   */
  setSuggestedMatter: (matterId: string | null) => void;

  /**
   * Clear any error state.
   * Called after user acknowledges an error.
   */
  clearError: () => void;
}

/**
 * Sources from which timer actions can be triggered (for analytics).
 */
export type TimerActionSource =
  | "floating_button"
  | "header_display"
  | "modal_button"
  | "keyboard_shortcut";

/**
 * Combined context value providing both state and actions.
 * This is the shape of the value provided by TimerContext.
 */
export interface TimerContextValue {
  /** Current timer state */
  state: TimerState;
  /** Timer control actions */
  actions: TimerActions;
  /** Whether the timer modal is open */
  isModalOpen: boolean;
  /** Open the timer modal (optionally specify source for analytics) */
  openModal: (source?: TimerActionSource) => void;
  /** Close the timer modal (optionally specify close method for analytics) */
  closeModal: (closeMethod?: "backdrop" | "escape" | "button") => void;
  /** Toggle the timer modal (optionally specify source for analytics) */
  toggleModal: (source?: TimerActionSource) => void;
  /** Reason why the current matter was suggested (for UI display) */
  suggestionReason: MatterSuggestionReason | null;
  /** Information about timer recovery after browser refresh (null if no recovery) */
  recoveryInfo: TimerRecoveryInfo | null;
  /** Clear the recovery info after user acknowledges the warning */
  clearRecoveryInfo: () => void;
  /** Information about timer duration warnings (8 hour warning, 24 hour auto-stop) */
  warningInfo: TimerWarningInfo | null;
  /** Clear the warning info after user acknowledges it */
  clearWarningInfo: () => void;
}

/**
 * LocalStorage persistence schema for timer state.
 * Minimal data needed to restore timer after page refresh.
 */
export interface PersistedTimerState {
  /** Whether timer was running when persisted */
  isRunning: boolean;
  /** Start timestamp for elapsed time calculation */
  startTime: number | null;
  /** Selected matter ID */
  selectedMatterId: string | null;
  /** Notes entered */
  notes: string;
  /** Active entry ID for stop action */
  activeEntryId: string | null;
  /** Timestamp when state was persisted (for stale detection) */
  persistedAt: number;
}

/**
 * BroadcastChannel message types for cross-tab sync.
 */
export type TimerBroadcastMessage =
  | { type: "TIMER_STARTED"; payload: Pick<TimerState, "startTime" | "selectedMatterId" | "activeEntryId"> }
  | { type: "TIMER_STOPPED"; payload: null }
  | { type: "TIMER_RESET"; payload: null }
  | { type: "TIMER_STATE_REQUEST"; payload: null }
  | { type: "TIMER_STATE_RESPONSE"; payload: PersistedTimerState };

/**
 * Result type for timer server actions.
 * Extends the base ActionResult pattern used in the project.
 */
export interface TimerActionResult {
  /** Error message if action failed */
  error?: string;
  /** Success indicator */
  ok?: boolean;
  /** Created/updated entry ID on success */
  entryId?: string;
}

/**
 * Parameters for starting a timer (server action input).
 */
export interface StartTimerParams {
  matterId: string;
  notes?: string;
}

/**
 * Parameters for stopping a timer (server action input).
 */
export interface StopTimerParams {
  entryId: string;
  notes?: string;
}

/**
 * Context for matter suggestion algorithm.
 * Provides all the information needed to suggest a relevant matter.
 */
export interface MatterSuggestionContext {
  /** Current route pathname */
  pathname: string;
  /** Matter ID extracted from route params (if on matter page) */
  routeMatterId: string | null;
  /** Recent time entries for activity-based suggestion */
  recentEntries: Pick<TimeEntry, "matter_id" | "started_at">[];
}

/**
 * Result from the matter suggestion algorithm.
 */
export interface MatterSuggestion {
  /** Suggested matter ID (null if no suggestion) */
  matterId: string | null;
  /** Reason for the suggestion (for UI display) */
  reason: MatterSuggestionReason | null;
}

/**
 * Reasons why a particular matter was suggested.
 * Used to display context to the user.
 */
export type MatterSuggestionReason =
  | "current_page"
  | "recent_activity"
  | "last_timer"
  | "most_active_this_week"
  | "none";

/**
 * Information about timer recovery after browser refresh.
 * Used to display warnings if there was a significant time gap.
 */
export interface TimerRecoveryInfo {
  /** Whether the timer was recovered from localStorage */
  wasRecovered: boolean;
  /** Time gap in seconds between when state was persisted and when it was recovered */
  timeGapSeconds: number;
  /** Whether the time gap exceeds the warning threshold (5 minutes) */
  hasSignificantGap: boolean;
  /** Timestamp when the state was originally persisted */
  persistedAt: number;
  /** Timestamp when the state was recovered */
  recoveredAt: number;
}

/**
 * Warning type for long-running timers.
 */
export type TimerWarningType = "eight_hour" | "auto_stopped";

/**
 * Information about timer warnings for long-running timers.
 * Used to display warnings at 8 hours and notification when auto-stopped at 24 hours.
 */
export interface TimerWarningInfo {
  /** Type of warning being shown */
  type: TimerWarningType;
  /** Elapsed time in seconds when the warning was triggered */
  elapsedSeconds: number;
  /** Timestamp when the warning was triggered */
  triggeredAt: number;
}

/**
 * Timer warning thresholds and configuration.
 */
export interface TimerConfig {
  /** Hours after which to show warning (default: 8) */
  warningHours: number;
  /** Hours after which to auto-stop timer (default: 24) */
  autoStopHours: number;
  /** Debounce delay for actions in ms (default: 500) */
  actionDebounceMs: number;
  /** LocalStorage key for timer state */
  storageKey: string;
  /** BroadcastChannel name for cross-tab sync */
  broadcastChannelName: string;
  /** Minutes of gap after which to show recovery warning (default: 5) */
  recoveryGapWarningMinutes: number;
}

/**
 * Default timer configuration values.
 */
export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  warningHours: 8,
  autoStopHours: 24,
  actionDebounceMs: 500,
  storageKey: "therapy-timer-state",
  broadcastChannelName: "therapy-timer-sync",
  recoveryGapWarningMinutes: 5,
};

/**
 * Initial timer state values.
 */
export const INITIAL_TIMER_STATE: TimerState = {
  isRunning: false,
  status: "idle",
  startTime: null,
  elapsedSeconds: 0,
  suggestedMatterId: null,
  selectedMatterId: null,
  notes: "",
  activeEntryId: null,
  error: null,
};
