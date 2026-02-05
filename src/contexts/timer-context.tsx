"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import type {
  MatterSuggestionReason,
  PersistedTimerState,
  TimerActions,
  TimerContextValue,
  TimerRecoveryInfo,
  TimerState,
  TimerWarningInfo,
} from "@/types/timer.types";
import {
  DEFAULT_TIMER_CONFIG,
  INITIAL_TIMER_STATE,
} from "@/types/timer.types";
import {
  createSuggestionContext,
  suggestMatter,
} from "@/lib/timer/suggest-matter";
import {
  BroadcastSync,
  createBroadcastSync,
} from "@/lib/timer/broadcast-sync";
import {
  trackAutoStop,
  trackModalClosed,
  trackModalOpened,
  trackSuggestionAccepted,
  trackSuggestionOverridden,
  trackSuggestionShown,
  trackTimerStart,
  trackTimerStop,
  trackWarningShown,
  type TimerActionSource,
} from "@/lib/timer/analytics";
import { startTimer, stopTimer } from "@/lib/data/actions";
import { toast } from "sonner";

// Storage key for localStorage persistence
const STORAGE_KEY = DEFAULT_TIMER_CONFIG.storageKey;

// Timer update interval in milliseconds
const TIMER_UPDATE_INTERVAL_MS = 1000;

// Minimum time between start/stop actions in milliseconds
const ACTION_COOLDOWN_MS = DEFAULT_TIMER_CONFIG.actionDebounceMs;

// Time gap warning threshold in seconds (5 minutes)
const RECOVERY_GAP_WARNING_SECONDS = DEFAULT_TIMER_CONFIG.recoveryGapWarningMinutes * 60;

// Timer duration warning threshold in seconds (8 hours)
const WARNING_THRESHOLD_SECONDS = DEFAULT_TIMER_CONFIG.warningHours * 60 * 60;

// Timer duration auto-stop threshold in seconds (24 hours)
const AUTO_STOP_THRESHOLD_SECONDS = DEFAULT_TIMER_CONFIG.autoStopHours * 60 * 60;

/**
 * Action types for timer state reducer
 */
type TimerAction =
  | { type: "START"; payload: { matterId: string; startTime: number; entryId: string; notes: string } }
  | { type: "STOP" }
  | { type: "RESET" }
  | { type: "UPDATE_NOTES"; payload: string }
  | { type: "UPDATE_MATTER"; payload: string }
  | { type: "SET_SUGGESTED_MATTER"; payload: string | null }
  | { type: "UPDATE_ELAPSED"; payload: number }
  | { type: "HYDRATE"; payload: TimerState }
  | { type: "SET_STATUS"; payload: TimerState["status"] }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SYNC_FROM_TAB"; payload: { startTime: number; selectedMatterId: string | null; activeEntryId: string | null } };

/**
 * Reducer function for timer state management
 */
function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        isRunning: true,
        status: "running",
        startTime: action.payload.startTime,
        selectedMatterId: action.payload.matterId,
        activeEntryId: action.payload.entryId,
        notes: action.payload.notes,
        elapsedSeconds: 0,
        error: null,
      };

    case "STOP":
      return {
        ...state,
        isRunning: false,
        status: "idle",
        startTime: null,
        elapsedSeconds: 0,
        activeEntryId: null,
        error: null,
      };

    case "RESET":
      return {
        ...INITIAL_TIMER_STATE,
        suggestedMatterId: state.suggestedMatterId,
      };

    case "UPDATE_NOTES":
      return {
        ...state,
        notes: action.payload,
      };

    case "UPDATE_MATTER":
      return {
        ...state,
        selectedMatterId: action.payload,
      };

    case "SET_SUGGESTED_MATTER":
      return {
        ...state,
        suggestedMatterId: action.payload,
        // Also set selectedMatterId if no matter is currently selected
        selectedMatterId: state.selectedMatterId ?? action.payload,
      };

    case "UPDATE_ELAPSED":
      return {
        ...state,
        elapsedSeconds: action.payload,
      };

    case "HYDRATE":
      return action.payload;

    case "SET_STATUS":
      return {
        ...state,
        status: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        status: "error",
        error: action.payload,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        status: state.isRunning ? "running" : "idle",
        error: null,
      };

    case "SYNC_FROM_TAB":
      // Sync timer state from another tab
      // Only update if we're not already running or if the incoming state is running
      if (action.payload.startTime) {
        return {
          ...state,
          isRunning: true,
          status: "running",
          startTime: action.payload.startTime,
          selectedMatterId: action.payload.selectedMatterId,
          activeEntryId: action.payload.activeEntryId,
          elapsedSeconds: calculateElapsedSeconds(action.payload.startTime),
        };
      }
      return state;

    default:
      return state;
  }
}

/**
 * Persist timer state to localStorage
 */
function persistTimerState(state: TimerState): void {
  if (typeof window === "undefined") return;

  const persistedState: PersistedTimerState = {
    isRunning: state.isRunning,
    startTime: state.startTime,
    selectedMatterId: state.selectedMatterId,
    notes: state.notes,
    activeEntryId: state.activeEntryId,
    persistedAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch {
    // Handle localStorage quota exceeded or other errors silently
    // The timer will still work, just without persistence
  }
}

/**
 * Load timer state from localStorage
 */
function loadPersistedState(): PersistedTimerState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedTimerState;

    // Validate required fields
    if (typeof parsed.isRunning !== "boolean") return null;

    return parsed;
  } catch {
    // Handle corrupted localStorage data
    return null;
  }
}

/**
 * Clear persisted timer state from localStorage
 */
function clearPersistedState(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors when clearing
  }
}

/**
 * Calculate elapsed seconds from start time
 */
function calculateElapsedSeconds(startTime: number | null): number {
  if (startTime === null) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Calculate recovery info from persisted state.
 * Detects if there was a significant time gap (browser closed for >5 min).
 */
function calculateRecoveryInfo(
  persisted: PersistedTimerState | null
): TimerRecoveryInfo | null {
  // No recovery if nothing was persisted or timer wasn't running
  if (!persisted || !persisted.isRunning || !persisted.startTime) {
    return null;
  }

  const now = Date.now();
  const persistedAt = persisted.persistedAt || persisted.startTime;
  const timeGapMs = now - persistedAt;
  const timeGapSeconds = Math.floor(timeGapMs / 1000);

  return {
    wasRecovered: true,
    timeGapSeconds,
    hasSignificantGap: timeGapSeconds >= RECOVERY_GAP_WARNING_SECONDS,
    persistedAt,
    recoveredAt: now,
  };
}

/**
 * React Context for timer state
 */
const TimerContext = createContext<TimerContextValue | null>(null);

/**
 * Custom hook to consume the timer context
 * @throws Error if used outside of TimerProvider
 */
export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);

  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }

  return context;
}

/**
 * Recent time entry data for suggestion algorithm.
 * Minimal type for client-side use.
 */
interface RecentEntryData {
  matter_id: string;
  started_at: string;
}

/**
 * Props for TimerProvider component
 */
interface TimerProviderProps {
  children: React.ReactNode;
  /**
   * Recent time entries for matter suggestion algorithm.
   * Optional - if not provided, only route-based suggestions will work.
   */
  recentEntries?: RecentEntryData[];
}

// Stable empty array for default recentEntries to avoid recreating on each render
const EMPTY_RECENT_ENTRIES: RecentEntryData[] = [];

/**
 * Create initial state by checking localStorage
 * This runs during the initial render to avoid hydration mismatches
 */
function getInitialState(): TimerState {
  // On server-side rendering, return default state
  if (typeof window === "undefined") return INITIAL_TIMER_STATE;

  const persisted = loadPersistedState();

  if (persisted && persisted.isRunning && persisted.startTime) {
    // Calculate current elapsed time since the persisted start time
    const elapsedSeconds = calculateElapsedSeconds(persisted.startTime);

    return {
      isRunning: true,
      status: "running",
      startTime: persisted.startTime,
      elapsedSeconds,
      suggestedMatterId: null,
      selectedMatterId: persisted.selectedMatterId,
      notes: persisted.notes,
      activeEntryId: persisted.activeEntryId,
      error: null,
    };
  }

  return INITIAL_TIMER_STATE;
}

/**
 * Get initial recovery info by checking localStorage
 * Called once on mount to detect if timer was recovered with a time gap
 */
function getInitialRecoveryInfo(): TimerRecoveryInfo | null {
  // On server-side rendering, return null
  if (typeof window === "undefined") return null;

  const persisted = loadPersistedState();
  return calculateRecoveryInfo(persisted);
}

/**
 * Timer Provider Component
 *
 * Provides global timer state management with:
 * - localStorage persistence for refresh recovery
 * - Real-time elapsed time updates
 * - Browser tab visibility handling
 * - Smart matter suggestion when modal opens
 */
export function TimerProvider({ children, recentEntries = EMPTY_RECENT_ENTRIES }: TimerProviderProps) {
  const [state, dispatch] = useReducer(timerReducer, INITIAL_TIMER_STATE, getInitialState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestionReason, setSuggestionReason] = useState<MatterSuggestionReason | null>(null);
  // Use lazy initialization to calculate recovery info once on mount
  const [recoveryInfo, setRecoveryInfo] = useState<TimerRecoveryInfo | null>(() => {
    const info = getInitialRecoveryInfo();
    return info && info.wasRecovered ? info : null;
  });
  // Warning info for long-running timers (8 hour warning, 24 hour auto-stop)
  const [warningInfo, setWarningInfo] = useState<TimerWarningInfo | null>(null);
  // Track if 8-hour warning has been shown for current timer session
  const hasShownEightHourWarningRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHydratedRef = useRef(false);
  const broadcastSyncRef = useRef<BroadcastSync | null>(null);
  const stateRef = useRef<TimerState>(state);
  // Track last action timestamp to prevent rapid start/stop cycles
  const lastActionTimestampRef = useRef<number>(0);
  // Track the source of the next action for analytics
  const nextActionSourceRef = useRef<TimerActionSource>("modal_button");
  const pathname = usePathname();

  // Keep stateRef in sync with current state for use in broadcast callbacks
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Mark as hydrated after first mount
   */
  useEffect(() => {
    isHydratedRef.current = true;
  }, []);

  /**
   * Persist state to localStorage on changes
   */
  useEffect(() => {
    // Don't persist during initial hydration
    if (!isHydratedRef.current) {
      // Mark as hydrated after this effect runs
      isHydratedRef.current = true;
      return;
    }

    if (state.isRunning) {
      persistTimerState(state);
    } else {
      // Clear persisted state when timer is not running
      clearPersistedState();
    }
  }, [state]);

  /**
   * Update elapsed time every second while timer is running
   */
  useEffect(() => {
    if (state.isRunning && state.startTime) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Update immediately
      dispatch({
        type: "UPDATE_ELAPSED",
        payload: calculateElapsedSeconds(state.startTime),
      });

      // Set up interval for continuous updates
      intervalRef.current = setInterval(() => {
        dispatch({
          type: "UPDATE_ELAPSED",
          payload: calculateElapsedSeconds(state.startTime!),
        });
      }, TIMER_UPDATE_INTERVAL_MS);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    // Clear interval when timer stops
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [state.isRunning, state.startTime]);

  /**
   * Handle browser tab visibility changes
   * Recalculate elapsed time when tab becomes visible again
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && state.isRunning && state.startTime) {
        dispatch({
          type: "UPDATE_ELAPSED",
          payload: calculateElapsedSeconds(state.startTime),
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state.isRunning, state.startTime]);

  /**
   * Check for long-running timer warnings.
   * Reset the 8-hour warning flag when a new timer starts.
   */
  useEffect(() => {
    // Reset warning flag when timer starts fresh (not recovered)
    if (!state.isRunning) {
      hasShownEightHourWarningRef.current = false;
      // Clear any existing warning when timer stops, but preserve auto_stopped warning
      // so user knows the timer was auto-stopped at 24 hours
      // This is intentional: warning state needs to sync with timer state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWarningInfo((prev) => (prev?.type === "auto_stopped" ? prev : null));
    }
  }, [state.isRunning]);

  /**
   * Create a ref to hold the stop function for use in the auto-stop effect.
   * This avoids circular dependency issues with useCallback.
   */
  const stopRef = useRef<((notes?: string) => Promise<void>) | null>(null);

  /**
   * Check for duration warnings and auto-stop at 24 hours.
   * This effect watches elapsed time and triggers warnings/auto-stop.
   */
  useEffect(() => {
    if (!state.isRunning || state.elapsedSeconds === 0) {
      return;
    }

    const elapsedSeconds = state.elapsedSeconds;

    // Check for 24-hour auto-stop first (takes priority)
    if (elapsedSeconds >= AUTO_STOP_THRESHOLD_SECONDS) {
      // Track auto-stop event
      trackAutoStop({
        durationSeconds: elapsedSeconds,
        matterId: stateRef.current.selectedMatterId,
        route: pathname ?? undefined,
      });
      trackWarningShown({
        warningType: "auto_stopped",
        durationSeconds: elapsedSeconds,
        route: pathname ?? undefined,
      });

      // Trigger auto-stop - this is intentional: warning needs to be shown when auto-stop threshold is reached
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWarningInfo({
        type: "auto_stopped",
        elapsedSeconds,
        triggeredAt: Date.now(),
      });
      // Auto-stop the timer using the ref
      if (stopRef.current) {
        stopRef.current();
      }
      return;
    }

    // Check for 8-hour warning (only show once per timer session)
    if (
      elapsedSeconds >= WARNING_THRESHOLD_SECONDS &&
      !hasShownEightHourWarningRef.current
    ) {
      hasShownEightHourWarningRef.current = true;

      // Track 8-hour warning
      trackWarningShown({
        warningType: "eight_hour",
        durationSeconds: elapsedSeconds,
        route: pathname ?? undefined,
      });

      setWarningInfo({
        type: "eight_hour",
        elapsedSeconds,
        triggeredAt: Date.now(),
      });
    }
  }, [state.isRunning, state.elapsedSeconds, pathname]);

  /**
   * Initialize BroadcastChannel for cross-tab sync
   * This allows timer state to be synchronized across browser tabs
   */
  useEffect(() => {
    // Create BroadcastSync instance with callbacks
    broadcastSyncRef.current = createBroadcastSync({
      onTimerStarted: (payload) => {
        // Another tab started the timer - sync our state
        dispatch({
          type: "SYNC_FROM_TAB",
          payload: {
            startTime: payload.startTime ?? 0,
            selectedMatterId: payload.selectedMatterId,
            activeEntryId: payload.activeEntryId,
          },
        });
      },

      onTimerStopped: () => {
        // Another tab stopped the timer - stop ours too
        dispatch({ type: "STOP" });
        setIsModalOpen(false);
      },

      onTimerReset: () => {
        // Another tab reset the timer - reset ours too
        dispatch({ type: "RESET" });
        setIsModalOpen(false);
      },

      onStateRequest: () => {
        // Another tab is asking for our current state
        // Use stateRef to get the latest state
        const currentState = stateRef.current;
        if (!currentState.isRunning) return null;

        return {
          isRunning: currentState.isRunning,
          startTime: currentState.startTime,
          selectedMatterId: currentState.selectedMatterId,
          notes: currentState.notes,
          activeEntryId: currentState.activeEntryId,
          persistedAt: Date.now(),
        };
      },

      onStateResponse: (persistedState) => {
        // Another tab responded with its state
        // Only sync if we're not running and they are
        // Use stateRef to get the latest state
        const currentState = stateRef.current;
        if (!currentState.isRunning && persistedState.isRunning && persistedState.startTime) {
          dispatch({
            type: "SYNC_FROM_TAB",
            payload: {
              startTime: persistedState.startTime,
              selectedMatterId: persistedState.selectedMatterId,
              activeEntryId: persistedState.activeEntryId,
            },
          });
        }
      },
    });

    // Request state from other tabs on mount
    // This handles the case where a new tab is opened while a timer is running in another tab
    // Use stateRef to check current state
    if (broadcastSyncRef.current && !stateRef.current.isRunning) {
      broadcastSyncRef.current.requestState();
    }

    // Clean up on unmount
    return () => {
      if (broadcastSyncRef.current) {
        broadcastSyncRef.current.disconnect();
        broadcastSyncRef.current = null;
      }
    };
  // Note: We intentionally only set up the BroadcastSync once on mount
  // The callbacks use stateRef to always access the latest state
  }, []);

  /**
   * Check if an action is within the cooldown period.
   * Returns true if the action should be blocked.
   */
  const isWithinCooldown = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTimestampRef.current;
    return timeSinceLastAction < ACTION_COOLDOWN_MS;
  }, []);

  /**
   * Record that an action was taken (for cooldown tracking).
   */
  const recordAction = useCallback(() => {
    lastActionTimestampRef.current = Date.now();
  }, []);

  /**
   * Timer Actions
   */
  const start = useCallback(async (matterId: string, notes: string = "") => {
    // Prevent rapid start/stop cycles
    if (isWithinCooldown()) {
      return;
    }
    recordAction();

    // Clear any previous errors
    dispatch({ type: "CLEAR_ERROR" });

    // Set status to indicate we're starting (for UI feedback)
    dispatch({ type: "SET_STATUS", payload: "stopping" }); // Reuse stopping status for "starting"

    try {
      // Call the server action to create a time entry
      const result = await startTimer(matterId, notes);

      if (result.error) {
        // API returned an error
        dispatch({ type: "SET_ERROR", payload: result.error });
        return;
      }

      if (!result.entryId) {
        dispatch({ type: "SET_ERROR", payload: "Failed to start timer: no entry ID returned" });
        return;
      }

      // Success - update local state with actual entry ID from server
      const startTime = Date.now();

      // Get current suggestion state for analytics tracking
      const currentState = stateRef.current;
      const suggestedMatterId = currentState.suggestedMatterId;
      const currentSuggestionReason = suggestionReason;

      // Track timer start with suggestion accuracy
      trackTimerStart({
        matterId,
        source: nextActionSourceRef.current,
        suggestedMatterId,
        suggestionReason: currentSuggestionReason,
        route: pathname ?? undefined,
      });

      // Track if suggestion was used or overridden
      if (suggestedMatterId) {
        if (matterId === suggestedMatterId && currentSuggestionReason) {
          trackSuggestionAccepted({
            matterId,
            suggestionReason: currentSuggestionReason,
            route: pathname ?? undefined,
          });
        } else if (matterId !== suggestedMatterId) {
          trackSuggestionOverridden({
            suggestedMatterId,
            selectedMatterId: matterId,
            suggestionReason: currentSuggestionReason,
            route: pathname ?? undefined,
          });
        }
      }

      dispatch({
        type: "START",
        payload: {
          matterId,
          startTime,
          entryId: result.entryId,
          notes,
        },
      });

      // Reset action source to default after use
      nextActionSourceRef.current = "modal_button";

      // Broadcast to other tabs that timer has started
      if (broadcastSyncRef.current) {
        broadcastSyncRef.current.broadcastTimerStarted({
          startTime,
          selectedMatterId: matterId,
          activeEntryId: result.entryId,
        });
      }
    } catch (err) {
      // Network error or other unexpected failure
      const errorMessage = err instanceof Error ? err.message : "Failed to start timer";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  }, [isWithinCooldown, recordAction, suggestionReason, pathname]);

  const stop = useCallback(async (notes?: string) => {
    // Prevent rapid start/stop cycles
    if (isWithinCooldown()) {
      return;
    }
    recordAction();

    // Get the current entry ID from state
    const currentState = stateRef.current;
    const entryId = currentState.activeEntryId;

    if (!entryId) {
      // No active entry to stop - just reset local state
      dispatch({ type: "STOP" });
      setIsModalOpen(false);
      return;
    }

    // Clear any previous errors
    dispatch({ type: "CLEAR_ERROR" });

    // Set status to indicate we're stopping (for UI feedback)
    dispatch({ type: "SET_STATUS", payload: "stopping" });

    try {
      // Call the server action to stop the time entry
      const result = await stopTimer(entryId, notes);

      if (result.error) {
        // API returned an error - but keep timer running so user can retry
        dispatch({ type: "SET_ERROR", payload: result.error });
        return;
      }

      // Track timer stop with duration
      trackTimerStop({
        matterId: currentState.selectedMatterId ?? "",
        durationSeconds: currentState.elapsedSeconds,
        source: nextActionSourceRef.current,
        hasNotes: Boolean(notes && notes.trim().length > 0),
        route: pathname ?? undefined,
      });

      // Track modal close if it was open
      if (isModalOpen) {
        trackModalClosed({
          closeMethod: "action_completed",
          route: pathname ?? undefined,
        });
      }

      // Success - update local state
      dispatch({ type: "STOP" });
      setIsModalOpen(false);

      // Show toast with billing info
      if (result.actualMinutes !== undefined && result.billableMinutes !== undefined) {
        if (result.actualMinutes === result.billableMinutes) {
          toast.success(`Time logged: ${result.billableMinutes} min`);
        } else {
          toast.success(`Time logged: ${result.actualMinutes} min actual → ${result.billableMinutes} min billed`);
        }
      }

      // Reset action source to default after use
      nextActionSourceRef.current = "modal_button";

      // Broadcast to other tabs that timer has stopped
      if (broadcastSyncRef.current) {
        broadcastSyncRef.current.broadcastTimerStopped();
      }
    } catch (err) {
      // Network error or other unexpected failure - keep timer running so user can retry
      const errorMessage = err instanceof Error ? err.message : "Failed to stop timer";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  }, [isWithinCooldown, recordAction, pathname, isModalOpen]);

  // Keep stopRef updated with the latest stop function for use in duration warning effect
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    clearPersistedState();
    setIsModalOpen(false);

    // Broadcast to other tabs that timer has been reset
    if (broadcastSyncRef.current) {
      broadcastSyncRef.current.broadcastTimerReset();
    }
  }, []);

  const updateNotes = useCallback((notes: string) => {
    dispatch({ type: "UPDATE_NOTES", payload: notes });
  }, []);

  const updateMatter = useCallback((matterId: string) => {
    dispatch({ type: "UPDATE_MATTER", payload: matterId });
  }, []);

  const setSuggestedMatter = useCallback((matterId: string | null) => {
    dispatch({ type: "SET_SUGGESTED_MATTER", payload: matterId });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  /**
   * Modal controls
   */
  const openModal = useCallback((source: TimerActionSource = "modal_button") => {
    // Track the source for subsequent actions
    nextActionSourceRef.current = source;

    // Only calculate suggestion when timer is not running
    // (don't change matter when timer is already tracking)
    if (!state.isRunning && pathname) {
      // Calculate matter suggestion based on current context
      const context = createSuggestionContext(
        pathname,
        null, // routeMatterId extracted from pathname
        recentEntries
      );
      const suggestion = suggestMatter(context);

      // Set the suggested matter if found
      if (suggestion.matterId) {
        dispatch({ type: "SET_SUGGESTED_MATTER", payload: suggestion.matterId });
        setSuggestionReason(suggestion.reason);

        // Track suggestion shown
        if (suggestion.reason) {
          trackSuggestionShown({
            suggestedMatterId: suggestion.matterId,
            suggestionReason: suggestion.reason,
            route: pathname,
          });
        }
      } else {
        // Clear previous suggestion
        dispatch({ type: "SET_SUGGESTED_MATTER", payload: null });
        setSuggestionReason(null);
      }
    }

    // Track modal open
    trackModalOpened({
      source,
      timerRunning: state.isRunning,
      route: pathname ?? undefined,
    });

    setIsModalOpen(true);
  }, [state.isRunning, pathname, recentEntries]);

  const closeModal = useCallback((closeMethod: "backdrop" | "escape" | "button" = "button") => {
    // Track modal close
    trackModalClosed({
      closeMethod,
      route: pathname ?? undefined,
    });

    setIsModalOpen(false);
  }, [pathname]);

  const toggleModal = useCallback((source: TimerActionSource = "modal_button") => {
    if (isModalOpen) {
      closeModal("button");
    } else {
      openModal(source);
    }
  }, [isModalOpen, closeModal, openModal]);

  /**
   * Clear recovery info after user acknowledges the warning
   */
  const clearRecoveryInfo = useCallback(() => {
    setRecoveryInfo(null);
  }, []);

  /**
   * Clear warning info after user acknowledges the warning
   */
  const clearWarningInfo = useCallback(() => {
    setWarningInfo(null);
  }, []);

  /**
   * Memoized actions object
   */
  const actions: TimerActions = useMemo(
    () => ({
      start,
      stop,
      reset,
      updateNotes,
      updateMatter,
      setSuggestedMatter,
      clearError,
    }),
    [start, stop, reset, updateNotes, updateMatter, setSuggestedMatter, clearError]
  );

  /**
   * Memoized context value
   */
  const contextValue: TimerContextValue = useMemo(
    () => ({
      state,
      actions,
      isModalOpen,
      openModal,
      closeModal,
      toggleModal,
      suggestionReason,
      recoveryInfo,
      clearRecoveryInfo,
      warningInfo,
      clearWarningInfo,
    }),
    [state, actions, isModalOpen, openModal, closeModal, toggleModal, suggestionReason, recoveryInfo, clearRecoveryInfo, warningInfo, clearWarningInfo]
  );

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
}
