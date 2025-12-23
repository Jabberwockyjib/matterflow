/**
 * Timer Analytics
 *
 * Provides analytics tracking for timer usage to measure engagement,
 * feature adoption, and suggestion accuracy.
 *
 * This module defines event types and a tracking interface that can be
 * connected to various analytics backends (Mixpanel, Amplitude, custom, etc.).
 *
 * @example
 * ```tsx
 * // Track a timer start
 * trackTimerEvent({
 *   type: "timer_started",
 *   matterId: "matter-123",
 *   source: "floating_button",
 *   suggestionUsed: true,
 *   suggestionReason: "current_page",
 *   route: "/matters/123",
 * });
 *
 * // Track a timer stop
 * trackTimerEvent({
 *   type: "timer_stopped",
 *   matterId: "matter-123",
 *   durationSeconds: 3600,
 *   source: "modal_button",
 * });
 * ```
 */

import type { MatterSuggestionReason } from "@/types/timer.types";

/**
 * Sources from which timer actions can be triggered.
 */
export type TimerActionSource =
  | "floating_button"
  | "header_display"
  | "modal_button"
  | "keyboard_shortcut";

/**
 * Types of timer analytics events.
 */
export type TimerEventType =
  | "timer_started"
  | "timer_stopped"
  | "timer_modal_opened"
  | "timer_modal_closed"
  | "keyboard_shortcut_used"
  | "suggestion_shown"
  | "suggestion_accepted"
  | "suggestion_overridden"
  | "auto_stop_triggered"
  | "warning_shown";

/**
 * Base analytics event with common fields.
 */
interface BaseTimerEvent {
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Current route/pathname where the event occurred */
  route?: string;
}

/**
 * Timer started event - tracks when a user starts a timer.
 */
export interface TimerStartedEvent extends BaseTimerEvent {
  type: "timer_started";
  /** Matter ID the timer is tracking */
  matterId: string;
  /** Source of the action (button, keyboard, etc.) */
  source: TimerActionSource;
  /** Whether the suggested matter was used */
  suggestionUsed: boolean;
  /** The reason for the suggestion (if any) */
  suggestionReason: MatterSuggestionReason | null;
  /** Original suggested matter ID (for accuracy tracking) */
  suggestedMatterId: string | null;
}

/**
 * Timer stopped event - tracks when a user stops a timer.
 */
export interface TimerStoppedEvent extends BaseTimerEvent {
  type: "timer_stopped";
  /** Matter ID the timer was tracking */
  matterId: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Source of the action (button, keyboard, etc.) */
  source: TimerActionSource;
  /** Whether notes were added */
  hasNotes: boolean;
}

/**
 * Timer modal opened event - tracks when the modal is opened.
 */
export interface TimerModalOpenedEvent extends BaseTimerEvent {
  type: "timer_modal_opened";
  /** Source of the open action */
  source: TimerActionSource;
  /** Whether a timer was already running when modal opened */
  timerRunning: boolean;
}

/**
 * Timer modal closed event - tracks when the modal is closed.
 */
export interface TimerModalClosedEvent extends BaseTimerEvent {
  type: "timer_modal_closed";
  /** How the modal was closed */
  closeMethod: "backdrop" | "escape" | "button" | "action_completed";
}

/**
 * Keyboard shortcut used event - tracks Cmd/Ctrl+T usage.
 */
export interface KeyboardShortcutUsedEvent extends BaseTimerEvent {
  type: "keyboard_shortcut_used";
  /** The shortcut key combination */
  shortcut: string;
  /** Whether the timer was running before the shortcut */
  timerRunning: boolean;
  /** Action that resulted from the shortcut */
  action: "opened_modal" | "closed_modal";
}

/**
 * Suggestion shown event - tracks when a matter suggestion is displayed.
 */
export interface SuggestionShownEvent extends BaseTimerEvent {
  type: "suggestion_shown";
  /** The suggested matter ID */
  suggestedMatterId: string;
  /** Reason for the suggestion */
  suggestionReason: MatterSuggestionReason;
}

/**
 * Suggestion accepted event - tracks when user accepts a suggestion.
 */
export interface SuggestionAcceptedEvent extends BaseTimerEvent {
  type: "suggestion_accepted";
  /** The suggested matter ID that was accepted */
  matterId: string;
  /** Reason for the suggestion */
  suggestionReason: MatterSuggestionReason;
}

/**
 * Suggestion overridden event - tracks when user changes from suggestion.
 */
export interface SuggestionOverriddenEvent extends BaseTimerEvent {
  type: "suggestion_overridden";
  /** The originally suggested matter ID */
  suggestedMatterId: string;
  /** The matter ID the user selected instead */
  selectedMatterId: string;
  /** Reason for the original suggestion */
  suggestionReason: MatterSuggestionReason | null;
}

/**
 * Auto stop triggered event - tracks 24-hour auto-stop.
 */
export interface AutoStopTriggeredEvent extends BaseTimerEvent {
  type: "auto_stop_triggered";
  /** Duration in seconds when auto-stopped */
  durationSeconds: number;
  /** Matter ID that was auto-stopped */
  matterId: string | null;
}

/**
 * Warning shown event - tracks 8-hour warning display.
 */
export interface WarningShownEvent extends BaseTimerEvent {
  type: "warning_shown";
  /** Type of warning */
  warningType: "eight_hour" | "auto_stopped";
  /** Duration in seconds when warning was shown */
  durationSeconds: number;
}

/**
 * Union type of all timer analytics events.
 */
export type TimerAnalyticsEvent =
  | TimerStartedEvent
  | TimerStoppedEvent
  | TimerModalOpenedEvent
  | TimerModalClosedEvent
  | KeyboardShortcutUsedEvent
  | SuggestionShownEvent
  | SuggestionAcceptedEvent
  | SuggestionOverriddenEvent
  | AutoStopTriggeredEvent
  | WarningShownEvent;

/**
 * Distributive Omit - correctly distributes over union types.
 * Standard Omit doesn't work well with union types.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * Event input type without timestamp (added automatically).
 */
export type TimerAnalyticsEventInput = DistributiveOmit<TimerAnalyticsEvent, "timestamp">;

/**
 * Interface for analytics event handlers.
 * Implement this to connect to your analytics backend.
 */
export interface TimerAnalyticsHandler {
  /**
   * Called when a timer event occurs.
   * @param event - The analytics event to track
   */
  track: (event: TimerAnalyticsEvent) => void;
}

/**
 * Default no-op handler that logs to console in development.
 * Replace with actual analytics implementation in production.
 */
const defaultHandler: TimerAnalyticsHandler = {
  track: (event: TimerAnalyticsEvent) => {
    // In development, log to console for debugging
    if (process.env.NODE_ENV === "development") {
      // Using structured console output instead of console.log
      // This will be stripped in production builds
      if (typeof window !== "undefined" && (window as { __TIMER_ANALYTICS_DEBUG__?: boolean }).__TIMER_ANALYTICS_DEBUG__) {
        console.debug("[Timer Analytics]", event.type, event);
      }
    }
    // In production, this would send to your analytics service
    // e.g., mixpanel.track(event.type, event);
  },
};

/**
 * Current analytics handler.
 * Can be replaced with setAnalyticsHandler() to connect to a backend.
 */
let analyticsHandler: TimerAnalyticsHandler = defaultHandler;

/**
 * Set a custom analytics handler.
 * Use this to connect timer analytics to your analytics backend.
 *
 * @param handler - Custom analytics handler
 *
 * @example
 * ```tsx
 * // Connect to Mixpanel
 * setAnalyticsHandler({
 *   track: (event) => {
 *     mixpanel.track(event.type, event);
 *   },
 * });
 *
 * // Connect to custom analytics
 * setAnalyticsHandler({
 *   track: async (event) => {
 *     await fetch("/api/analytics", {
 *       method: "POST",
 *       body: JSON.stringify(event),
 *     });
 *   },
 * });
 * ```
 */
export function setAnalyticsHandler(handler: TimerAnalyticsHandler): void {
  analyticsHandler = handler;
}

/**
 * Reset to the default analytics handler.
 * Useful for testing or when disconnecting from a backend.
 */
export function resetAnalyticsHandler(): void {
  analyticsHandler = defaultHandler;
}

/**
 * Track a timer analytics event.
 * This is the main function to call when tracking timer events.
 *
 * @param event - The event to track (without timestamp, which is added automatically)
 *
 * @example
 * ```tsx
 * // Track timer start
 * trackTimerEvent({
 *   type: "timer_started",
 *   matterId: "123",
 *   source: "floating_button",
 *   suggestionUsed: true,
 *   suggestionReason: "current_page",
 *   suggestedMatterId: "123",
 *   route: "/matters/123",
 * });
 * ```
 */
export function trackTimerEvent(
  event: TimerAnalyticsEventInput
): void {
  try {
    const fullEvent = {
      ...event,
      timestamp: Date.now(),
    } as TimerAnalyticsEvent;

    analyticsHandler.track(fullEvent);
  } catch {
    // Silently fail - analytics should never break the app
  }
}

/**
 * Create helper functions for common tracking patterns.
 * These provide type-safe ways to track specific events.
 */

/**
 * Track timer start with all relevant context.
 */
export function trackTimerStart(params: {
  matterId: string;
  source: TimerActionSource;
  suggestedMatterId: string | null;
  suggestionReason: MatterSuggestionReason | null;
  route?: string;
}): void {
  const { matterId, source, suggestedMatterId, suggestionReason, route } = params;

  trackTimerEvent({
    type: "timer_started",
    matterId,
    source,
    suggestionUsed: suggestedMatterId !== null && matterId === suggestedMatterId,
    suggestionReason,
    suggestedMatterId,
    route,
  });
}

/**
 * Track timer stop with duration.
 */
export function trackTimerStop(params: {
  matterId: string;
  durationSeconds: number;
  source: TimerActionSource;
  hasNotes: boolean;
  route?: string;
}): void {
  trackTimerEvent({
    type: "timer_stopped",
    ...params,
  });
}

/**
 * Track keyboard shortcut usage.
 */
export function trackKeyboardShortcut(params: {
  shortcut: string;
  timerRunning: boolean;
  action: "opened_modal" | "closed_modal";
  route?: string;
}): void {
  trackTimerEvent({
    type: "keyboard_shortcut_used",
    ...params,
  });
}

/**
 * Track when a suggestion is shown.
 */
export function trackSuggestionShown(params: {
  suggestedMatterId: string;
  suggestionReason: MatterSuggestionReason;
  route?: string;
}): void {
  trackTimerEvent({
    type: "suggestion_shown",
    ...params,
  });
}

/**
 * Track when a suggestion is accepted.
 */
export function trackSuggestionAccepted(params: {
  matterId: string;
  suggestionReason: MatterSuggestionReason;
  route?: string;
}): void {
  trackTimerEvent({
    type: "suggestion_accepted",
    ...params,
  });
}

/**
 * Track when a suggestion is overridden.
 */
export function trackSuggestionOverridden(params: {
  suggestedMatterId: string;
  selectedMatterId: string;
  suggestionReason: MatterSuggestionReason | null;
  route?: string;
}): void {
  trackTimerEvent({
    type: "suggestion_overridden",
    ...params,
  });
}

/**
 * Track modal open.
 */
export function trackModalOpened(params: {
  source: TimerActionSource;
  timerRunning: boolean;
  route?: string;
}): void {
  trackTimerEvent({
    type: "timer_modal_opened",
    ...params,
  });
}

/**
 * Track modal close.
 */
export function trackModalClosed(params: {
  closeMethod: "backdrop" | "escape" | "button" | "action_completed";
  route?: string;
}): void {
  trackTimerEvent({
    type: "timer_modal_closed",
    ...params,
  });
}

/**
 * Track auto-stop event.
 */
export function trackAutoStop(params: {
  durationSeconds: number;
  matterId: string | null;
  route?: string;
}): void {
  trackTimerEvent({
    type: "auto_stop_triggered",
    ...params,
  });
}

/**
 * Track warning shown.
 */
export function trackWarningShown(params: {
  warningType: "eight_hour" | "auto_stopped";
  durationSeconds: number;
  route?: string;
}): void {
  trackTimerEvent({
    type: "warning_shown",
    ...params,
  });
}

/**
 * Analytics metrics aggregation helpers.
 * These can be used to calculate suggestion accuracy and other metrics.
 */

/**
 * Calculate suggestion accuracy from a set of events.
 * Returns the percentage of suggestions that were accepted.
 *
 * @param events - Array of timer started events
 * @returns Accuracy percentage (0-100) or null if no suggestions
 */
export function calculateSuggestionAccuracy(
  events: Pick<TimerStartedEvent, "suggestionUsed" | "suggestedMatterId">[]
): number | null {
  const eventsWithSuggestion = events.filter((e) => e.suggestedMatterId !== null);

  if (eventsWithSuggestion.length === 0) {
    return null;
  }

  const acceptedCount = eventsWithSuggestion.filter((e) => e.suggestionUsed).length;
  return Math.round((acceptedCount / eventsWithSuggestion.length) * 100);
}

/**
 * Calculate average timer duration from stopped events.
 *
 * @param events - Array of timer stopped events
 * @returns Average duration in seconds or null if no events
 */
export function calculateAverageDuration(
  events: Pick<TimerStoppedEvent, "durationSeconds">[]
): number | null {
  if (events.length === 0) {
    return null;
  }

  const totalDuration = events.reduce((sum, e) => sum + e.durationSeconds, 0);
  return Math.round(totalDuration / events.length);
}

/**
 * Calculate keyboard shortcut usage rate.
 *
 * @param shortcutEvents - Number of keyboard shortcut events
 * @param totalEvents - Total timer start/stop events
 * @returns Usage rate percentage (0-100) or null if no events
 */
export function calculateKeyboardShortcutUsage(
  shortcutEvents: number,
  totalEvents: number
): number | null {
  if (totalEvents === 0) {
    return null;
  }

  return Math.round((shortcutEvents / totalEvents) * 100);
}
