import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  setAnalyticsHandler,
  resetAnalyticsHandler,
  trackTimerEvent,
  trackTimerStart,
  trackTimerStop,
  trackKeyboardShortcut,
  trackSuggestionShown,
  trackSuggestionAccepted,
  trackSuggestionOverridden,
  trackModalOpened,
  trackModalClosed,
  trackAutoStop,
  trackWarningShown,
  calculateSuggestionAccuracy,
  calculateAverageDuration,
  calculateKeyboardShortcutUsage,
  type TimerAnalyticsHandler,
  type TimerAnalyticsEvent,
} from "@/lib/timer/analytics";

describe("Timer Analytics", () => {
  let mockHandler: TimerAnalyticsHandler;
  let trackedEvents: TimerAnalyticsEvent[];

  beforeEach(() => {
    trackedEvents = [];
    mockHandler = {
      track: vi.fn((event) => {
        trackedEvents.push(event);
      }),
    };
    setAnalyticsHandler(mockHandler);
  });

  afterEach(() => {
    resetAnalyticsHandler();
  });

  describe("setAnalyticsHandler", () => {
    it("replaces the default handler", () => {
      trackTimerEvent({
        type: "timer_started",
        matterId: "m1",
        source: "floating_button",
        suggestionUsed: false,
        suggestionReason: null,
        suggestedMatterId: null,
      });

      expect(mockHandler.track).toHaveBeenCalled();
    });
  });

  describe("resetAnalyticsHandler", () => {
    it("resets to default handler", () => {
      resetAnalyticsHandler();

      // After reset, the custom handler should not be called
      trackTimerEvent({
        type: "timer_started",
        matterId: "m1",
        source: "floating_button",
        suggestionUsed: false,
        suggestionReason: null,
        suggestedMatterId: null,
      });

      // The mock handler should not have been called after reset
      expect(trackedEvents).toHaveLength(0);
    });
  });

  describe("trackTimerEvent", () => {
    it("adds timestamp to events", () => {
      const before = Date.now();

      trackTimerEvent({
        type: "timer_started",
        matterId: "m1",
        source: "floating_button",
        suggestionUsed: false,
        suggestionReason: null,
        suggestedMatterId: null,
      });

      const after = Date.now();

      expect(trackedEvents[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(trackedEvents[0].timestamp).toBeLessThanOrEqual(after);
    });

    it("handles errors silently", () => {
      setAnalyticsHandler({
        track: () => {
          throw new Error("Analytics error");
        },
      });

      // Should not throw
      expect(() => {
        trackTimerEvent({
          type: "timer_started",
          matterId: "m1",
          source: "floating_button",
          suggestionUsed: false,
          suggestionReason: null,
          suggestedMatterId: null,
        });
      }).not.toThrow();
    });
  });

  describe("trackTimerStart", () => {
    it("tracks timer start with suggestion used", () => {
      trackTimerStart({
        matterId: "m1",
        source: "floating_button",
        suggestedMatterId: "m1",
        suggestionReason: "current_page",
        route: "/matters/m1",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("timer_started");
      expect((event as any).matterId).toBe("m1");
      expect((event as any).suggestionUsed).toBe(true);
      expect((event as any).suggestionReason).toBe("current_page");
    });

    it("tracks timer start with suggestion not used", () => {
      trackTimerStart({
        matterId: "m2",
        source: "modal_button",
        suggestedMatterId: "m1",
        suggestionReason: "current_page",
      });

      const event = trackedEvents[0];
      expect((event as any).suggestionUsed).toBe(false);
    });

    it("tracks timer start without suggestion", () => {
      trackTimerStart({
        matterId: "m1",
        source: "keyboard_shortcut",
        suggestedMatterId: null,
        suggestionReason: null,
      });

      const event = trackedEvents[0];
      expect((event as any).suggestionUsed).toBe(false);
      expect((event as any).suggestedMatterId).toBeNull();
    });
  });

  describe("trackTimerStop", () => {
    it("tracks timer stop with notes", () => {
      trackTimerStop({
        matterId: "m1",
        durationSeconds: 3600,
        source: "modal_button",
        hasNotes: true,
        route: "/matters/m1",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("timer_stopped");
      expect((event as any).durationSeconds).toBe(3600);
      expect((event as any).hasNotes).toBe(true);
    });

    it("tracks timer stop without notes", () => {
      trackTimerStop({
        matterId: "m1",
        durationSeconds: 1800,
        source: "header_display",
        hasNotes: false,
      });

      const event = trackedEvents[0];
      expect((event as any).hasNotes).toBe(false);
    });
  });

  describe("trackKeyboardShortcut", () => {
    it("tracks shortcut for opening modal", () => {
      trackKeyboardShortcut({
        shortcut: "Cmd+T",
        timerRunning: false,
        action: "opened_modal",
        route: "/matters",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("keyboard_shortcut_used");
      expect((event as any).shortcut).toBe("Cmd+T");
      expect((event as any).action).toBe("opened_modal");
    });

    it("tracks shortcut for closing modal", () => {
      trackKeyboardShortcut({
        shortcut: "Cmd+T",
        timerRunning: true,
        action: "closed_modal",
      });

      const event = trackedEvents[0];
      expect((event as any).action).toBe("closed_modal");
      expect((event as any).timerRunning).toBe(true);
    });
  });

  describe("trackSuggestionShown", () => {
    it("tracks suggestion display", () => {
      trackSuggestionShown({
        suggestedMatterId: "m1",
        suggestionReason: "recent_activity",
        route: "/dashboard",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("suggestion_shown");
      expect((event as any).suggestedMatterId).toBe("m1");
      expect((event as any).suggestionReason).toBe("recent_activity");
    });
  });

  describe("trackSuggestionAccepted", () => {
    it("tracks suggestion acceptance", () => {
      trackSuggestionAccepted({
        matterId: "m1",
        suggestionReason: "current_page",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("suggestion_accepted");
      expect((event as any).matterId).toBe("m1");
    });
  });

  describe("trackSuggestionOverridden", () => {
    it("tracks when user selects different matter", () => {
      trackSuggestionOverridden({
        suggestedMatterId: "m1",
        selectedMatterId: "m2",
        suggestionReason: "recent_activity",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("suggestion_overridden");
      expect((event as any).suggestedMatterId).toBe("m1");
      expect((event as any).selectedMatterId).toBe("m2");
    });
  });

  describe("trackModalOpened", () => {
    it("tracks modal open with timer running", () => {
      trackModalOpened({
        source: "floating_button",
        timerRunning: true,
        route: "/tasks",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("timer_modal_opened");
      expect((event as any).timerRunning).toBe(true);
    });
  });

  describe("trackModalClosed", () => {
    it("tracks modal close with escape key", () => {
      trackModalClosed({
        closeMethod: "escape",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("timer_modal_closed");
      expect((event as any).closeMethod).toBe("escape");
    });

    it("tracks modal close with backdrop click", () => {
      trackModalClosed({
        closeMethod: "backdrop",
      });

      expect((trackedEvents[0] as any).closeMethod).toBe("backdrop");
    });

    it("tracks modal close with action completed", () => {
      trackModalClosed({
        closeMethod: "action_completed",
      });

      expect((trackedEvents[0] as any).closeMethod).toBe("action_completed");
    });
  });

  describe("trackAutoStop", () => {
    it("tracks auto-stop with matter", () => {
      trackAutoStop({
        durationSeconds: 86400,
        matterId: "m1",
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("auto_stop_triggered");
      expect((event as any).durationSeconds).toBe(86400);
      expect((event as any).matterId).toBe("m1");
    });

    it("tracks auto-stop without matter", () => {
      trackAutoStop({
        durationSeconds: 86400,
        matterId: null,
      });

      expect((trackedEvents[0] as any).matterId).toBeNull();
    });
  });

  describe("trackWarningShown", () => {
    it("tracks eight hour warning", () => {
      trackWarningShown({
        warningType: "eight_hour",
        durationSeconds: 28800,
      });

      const event = trackedEvents[0];
      expect(event.type).toBe("warning_shown");
      expect((event as any).warningType).toBe("eight_hour");
    });

    it("tracks auto-stopped warning", () => {
      trackWarningShown({
        warningType: "auto_stopped",
        durationSeconds: 86400,
      });

      expect((trackedEvents[0] as any).warningType).toBe("auto_stopped");
    });
  });

  describe("calculateSuggestionAccuracy", () => {
    it("returns null for empty array", () => {
      expect(calculateSuggestionAccuracy([])).toBeNull();
    });

    it("returns null when no suggestions were shown", () => {
      const events = [
        { suggestionUsed: false, suggestedMatterId: null },
        { suggestionUsed: false, suggestedMatterId: null },
      ];

      expect(calculateSuggestionAccuracy(events)).toBeNull();
    });

    it("returns 100 when all suggestions accepted", () => {
      const events = [
        { suggestionUsed: true, suggestedMatterId: "m1" },
        { suggestionUsed: true, suggestedMatterId: "m2" },
      ];

      expect(calculateSuggestionAccuracy(events)).toBe(100);
    });

    it("returns 0 when no suggestions accepted", () => {
      const events = [
        { suggestionUsed: false, suggestedMatterId: "m1" },
        { suggestionUsed: false, suggestedMatterId: "m2" },
      ];

      expect(calculateSuggestionAccuracy(events)).toBe(0);
    });

    it("calculates correct percentage", () => {
      const events = [
        { suggestionUsed: true, suggestedMatterId: "m1" },
        { suggestionUsed: false, suggestedMatterId: "m2" },
        { suggestionUsed: true, suggestedMatterId: "m3" },
        { suggestionUsed: false, suggestedMatterId: "m4" },
      ];

      expect(calculateSuggestionAccuracy(events)).toBe(50);
    });

    it("ignores events without suggestions", () => {
      const events = [
        { suggestionUsed: true, suggestedMatterId: "m1" },
        { suggestionUsed: false, suggestedMatterId: null },
        { suggestionUsed: false, suggestedMatterId: "m2" },
      ];

      // Only 2 events have suggestions, 1 accepted = 50%
      expect(calculateSuggestionAccuracy(events)).toBe(50);
    });
  });

  describe("calculateAverageDuration", () => {
    it("returns null for empty array", () => {
      expect(calculateAverageDuration([])).toBeNull();
    });

    it("returns exact duration for single event", () => {
      const events = [{ durationSeconds: 3600 }];

      expect(calculateAverageDuration(events)).toBe(3600);
    });

    it("calculates average of multiple events", () => {
      const events = [
        { durationSeconds: 1000 },
        { durationSeconds: 2000 },
        { durationSeconds: 3000 },
      ];

      expect(calculateAverageDuration(events)).toBe(2000);
    });

    it("rounds to nearest second", () => {
      const events = [
        { durationSeconds: 100 },
        { durationSeconds: 101 },
        { durationSeconds: 102 },
      ];

      // Average is 101
      expect(calculateAverageDuration(events)).toBe(101);
    });
  });

  describe("calculateKeyboardShortcutUsage", () => {
    it("returns null when no events", () => {
      expect(calculateKeyboardShortcutUsage(0, 0)).toBeNull();
    });

    it("returns 0 when no shortcuts used", () => {
      expect(calculateKeyboardShortcutUsage(0, 100)).toBe(0);
    });

    it("returns 100 when all events from shortcuts", () => {
      expect(calculateKeyboardShortcutUsage(50, 50)).toBe(100);
    });

    it("calculates correct percentage", () => {
      expect(calculateKeyboardShortcutUsage(25, 100)).toBe(25);
    });

    it("rounds to nearest percentage", () => {
      // 33.33% rounds to 33
      expect(calculateKeyboardShortcutUsage(1, 3)).toBe(33);
    });
  });
});
