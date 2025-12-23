import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimerProvider, useTimer } from "@/contexts/timer-context";
import { DEFAULT_TIMER_CONFIG, INITIAL_TIMER_STATE, TimerActionResult } from "@/types/timer.types";

// Mock next/navigation usePathname
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock server actions
let mockStartTimerResult: TimerActionResult = { ok: true, entryId: "mock-entry-id" };
let mockStopTimerResult: TimerActionResult = { ok: true, entryId: "mock-entry-id" };

vi.mock("@/lib/data/actions", () => ({
  startTimer: vi.fn(() => Promise.resolve(mockStartTimerResult)),
  stopTimer: vi.fn(() => Promise.resolve(mockStopTimerResult)),
}));

const STORAGE_KEY = DEFAULT_TIMER_CONFIG.storageKey;

/**
 * Mock localStorage for testing
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

/**
 * Helper to render useTimer hook with TimerProvider wrapper
 */
function renderTimerHook() {
  return renderHook(() => useTimer(), {
    wrapper: ({ children }) => <TimerProvider>{children}</TimerProvider>,
  });
}

describe("timer-context", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset mock results to defaults
    mockStartTimerResult = { ok: true, entryId: "mock-entry-id" };
    mockStopTimerResult = { ok: true, entryId: "mock-entry-id" };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorageMock.clear();
  });

  describe("useTimer hook", () => {
    it("throws error when used outside TimerProvider", () => {
      // Suppress console.error for this test since we expect it to throw
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTimer());
      }).toThrow("useTimer must be used within a TimerProvider");

      consoleSpy.mockRestore();
    });

    it("provides initial state when used within provider", () => {
      const { result } = renderTimerHook();

      expect(result.current.state).toEqual(INITIAL_TIMER_STATE);
      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.actions).toBeDefined();
    });
  });

  describe("timer start/stop state transitions", () => {
    it("starts timer with correct state", async () => {
      const { result } = renderTimerHook();
      const testMatterId = "matter-123";
      const testNotes = "Test notes";

      await act(async () => {
        await result.current.actions.start(testMatterId, testNotes);
      });

      expect(result.current.state.isRunning).toBe(true);
      expect(result.current.state.status).toBe("running");
      expect(result.current.state.selectedMatterId).toBe(testMatterId);
      expect(result.current.state.notes).toBe(testNotes);
      expect(result.current.state.startTime).not.toBeNull();
      expect(result.current.state.activeEntryId).not.toBeNull();
    });

    it("starts timer with default empty notes", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.notes).toBe("");
    });

    it("stops timer and resets state", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.isRunning).toBe(true);

      // Advance past action cooldown period (500ms)
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      // Stop the timer
      await act(async () => {
        await result.current.actions.stop();
      });

      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.startTime).toBeNull();
      expect(result.current.state.elapsedSeconds).toBe(0);
      expect(result.current.state.activeEntryId).toBeNull();
    });

    it("stops timer with updated notes", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123", "Initial notes");
      });

      // Advance past action cooldown period (500ms)
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      await act(async () => {
        await result.current.actions.stop("Final notes");
      });

      // Notes should be updated before stop
      // Note: Since stop resets state, we can't verify notes after stop
      // This test verifies the flow doesn't error
      expect(result.current.state.isRunning).toBe(false);
    });

    it("resets timer to initial state", async () => {
      const { result } = renderTimerHook();

      // Start timer
      await act(async () => {
        await result.current.actions.start("matter-123", "Some notes");
      });

      // Set suggested matter
      act(() => {
        result.current.actions.setSuggestedMatter("suggested-matter");
      });

      // Reset timer
      act(() => {
        result.current.actions.reset();
      });

      // Should return to initial state but preserve suggestedMatterId
      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.startTime).toBeNull();
      expect(result.current.state.elapsedSeconds).toBe(0);
      expect(result.current.state.suggestedMatterId).toBe("suggested-matter");
      // Modal state is separate from timer state
      expect(result.current.isModalOpen).toBe(false);
    });

    it("updates notes while timer is running", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      act(() => {
        result.current.actions.updateNotes("Updated notes");
      });

      expect(result.current.state.notes).toBe("Updated notes");
    });

    it("updates matter while timer is idle", () => {
      const { result } = renderTimerHook();

      act(() => {
        result.current.actions.updateMatter("new-matter-456");
      });

      expect(result.current.state.selectedMatterId).toBe("new-matter-456");
    });

    it("sets suggested matter and auto-selects when no matter selected", () => {
      const { result } = renderTimerHook();

      act(() => {
        result.current.actions.setSuggestedMatter("suggested-matter-789");
      });

      expect(result.current.state.suggestedMatterId).toBe("suggested-matter-789");
      expect(result.current.state.selectedMatterId).toBe("suggested-matter-789");
    });

    it("sets suggested matter but keeps existing selection", () => {
      const { result } = renderTimerHook();

      // Set initial matter selection
      act(() => {
        result.current.actions.updateMatter("existing-matter");
      });

      // Set suggestion - should not override existing selection
      act(() => {
        result.current.actions.setSuggestedMatter("suggested-matter");
      });

      expect(result.current.state.suggestedMatterId).toBe("suggested-matter");
      expect(result.current.state.selectedMatterId).toBe("existing-matter");
    });
  });

  describe("elapsed time calculation", () => {
    it("calculates elapsed time correctly", async () => {
      const { result } = renderTimerHook();
      const now = Date.now();
      vi.setSystemTime(now);

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Initial elapsed should be 0
      expect(result.current.state.elapsedSeconds).toBe(0);

      // Advance time by 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.state.elapsedSeconds).toBe(5);

      // Advance time by another 10 seconds
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.state.elapsedSeconds).toBe(15);
    });

    it("updates elapsed time every second", async () => {
      const { result } = renderTimerHook();
      const now = Date.now();
      vi.setSystemTime(now);

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      const elapsedValues: number[] = [];

      // Track elapsed values for 3 seconds
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });
        elapsedValues.push(result.current.state.elapsedSeconds);
      }

      expect(elapsedValues).toEqual([1, 2, 3]);
    });

    it("stops updating elapsed time when timer stops", async () => {
      const { result } = renderTimerHook();
      const now = Date.now();
      vi.setSystemTime(now);

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Run for 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.state.elapsedSeconds).toBe(5);

      // Stop the timer
      await act(async () => {
        await result.current.actions.stop();
      });

      // Elapsed should be reset to 0
      expect(result.current.state.elapsedSeconds).toBe(0);

      // Advance time - elapsed should remain 0
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.state.elapsedSeconds).toBe(0);
    });

    it("calculates elapsed from startTime accurately across large intervals", async () => {
      const { result } = renderTimerHook();
      const now = Date.now();
      vi.setSystemTime(now);

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Advance by 1 hour
      await act(async () => {
        vi.advanceTimersByTime(3600000);
      });

      expect(result.current.state.elapsedSeconds).toBe(3600);
    });
  });

  describe("localStorage persistence", () => {
    it("persists timer state to localStorage when running", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123", "Test notes");
      });

      // Advance time to trigger persistence effect
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.isRunning).toBe(true);
      expect(parsed.selectedMatterId).toBe("matter-123");
      expect(parsed.notes).toBe("Test notes");
      expect(parsed.startTime).toBeTypeOf("number");
      expect(parsed.activeEntryId).toBeTypeOf("string");
      expect(parsed.persistedAt).toBeTypeOf("number");
    });

    it("clears localStorage when timer stops", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Verify state is persisted
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(localStorageMock.getItem(STORAGE_KEY)).not.toBeNull();

      // Advance past action cooldown period (500ms)
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      // Stop timer
      await act(async () => {
        await result.current.actions.stop();
      });

      // Allow effects to run
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });

    it("clears localStorage when timer resets", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(localStorageMock.getItem(STORAGE_KEY)).not.toBeNull();

      act(() => {
        result.current.actions.reset();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });

    it("restores timer state from localStorage on mount", async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Pre-populate localStorage with a running timer
      const persistedState = {
        isRunning: true,
        startTime: now - 60000, // Started 60 seconds ago
        selectedMatterId: "restored-matter",
        notes: "Restored notes",
        activeEntryId: "entry-abc",
        persistedAt: now - 1000,
      };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(persistedState));

      // Mount the hook (simulates page refresh)
      const { result } = renderTimerHook();

      // State should be restored from localStorage
      expect(result.current.state.isRunning).toBe(true);
      expect(result.current.state.selectedMatterId).toBe("restored-matter");
      expect(result.current.state.notes).toBe("Restored notes");
      expect(result.current.state.activeEntryId).toBe("entry-abc");
      expect(result.current.state.startTime).toBe(now - 60000);
      // Elapsed should be calculated from the persisted startTime
      expect(result.current.state.elapsedSeconds).toBe(60);
    });

    it("returns initial state when localStorage is empty", () => {
      localStorageMock.clear();

      const { result } = renderTimerHook();

      expect(result.current.state).toEqual(INITIAL_TIMER_STATE);
    });

    it("handles corrupted localStorage data gracefully", () => {
      // Set invalid JSON
      localStorageMock.setItem(STORAGE_KEY, "not-valid-json");

      // Should not throw, should return initial state
      const { result } = renderTimerHook();

      expect(result.current.state).toEqual(INITIAL_TIMER_STATE);
    });

    it("handles localStorage with missing required fields", () => {
      // Set incomplete data (missing isRunning boolean)
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ startTime: Date.now() }));

      const { result } = renderTimerHook();

      expect(result.current.state).toEqual(INITIAL_TIMER_STATE);
    });

    it("handles localStorage with non-boolean isRunning", () => {
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isRunning: "yes", // Should be boolean
          startTime: Date.now(),
        })
      );

      const { result } = renderTimerHook();

      expect(result.current.state).toEqual(INITIAL_TIMER_STATE);
    });
  });

  describe("visibility change handling", () => {
    it("recalculates elapsed time when tab becomes visible", async () => {
      const { result } = renderTimerHook();
      const now = Date.now();
      vi.setSystemTime(now);

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Advance time by 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.state.elapsedSeconds).toBe(30);

      // Simulate tab becoming hidden (this wouldn't update elapsed in real scenario)
      // Then simulate an additional 30 seconds passing while hidden
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Simulate visibility change to visible
      await act(async () => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Elapsed should be updated based on actual time passed
      expect(result.current.state.elapsedSeconds).toBe(60);
    });

    it("does not update elapsed when tab becomes visible and timer is not running", async () => {
      const { result } = renderTimerHook();

      // Timer is not running, visibility change should have no effect
      await act(async () => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(result.current.state.elapsedSeconds).toBe(0);
    });

    it("ignores visibility changes when tab becomes hidden", async () => {
      const { result } = renderTimerHook();
      const now = Date.now();
      vi.setSystemTime(now);

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      const elapsedBefore = result.current.state.elapsedSeconds;

      // Simulate tab becoming hidden
      await act(async () => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Elapsed should not change just from visibility becoming hidden
      // (the interval continues running)
      expect(result.current.state.elapsedSeconds).toBe(elapsedBefore);
    });
  });

  describe("modal controls", () => {
    it("opens modal", () => {
      const { result } = renderTimerHook();

      expect(result.current.isModalOpen).toBe(false);

      act(() => {
        result.current.openModal();
      });

      expect(result.current.isModalOpen).toBe(true);
    });

    it("closes modal", () => {
      const { result } = renderTimerHook();

      act(() => {
        result.current.openModal();
      });
      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isModalOpen).toBe(false);
    });

    it("toggles modal", () => {
      const { result } = renderTimerHook();

      expect(result.current.isModalOpen).toBe(false);

      act(() => {
        result.current.toggleModal();
      });
      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.toggleModal();
      });
      expect(result.current.isModalOpen).toBe(false);
    });

    it("closes modal when timer stops", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
        result.current.openModal();
      });

      expect(result.current.isModalOpen).toBe(true);

      // Advance past action cooldown period (500ms)
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      await act(async () => {
        await result.current.actions.stop();
      });

      expect(result.current.isModalOpen).toBe(false);
    });

    it("closes modal when timer resets", async () => {
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
        result.current.openModal();
      });

      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.isModalOpen).toBe(false);
    });
  });

  describe("API error handling", () => {
    it("sets error state when start timer API fails", async () => {
      mockStartTimerResult = { error: "Network error" };
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.error).toBe("Network error");
    });

    it("sets error state when start timer returns no entry ID", async () => {
      mockStartTimerResult = { ok: true }; // No entryId
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.error).toBe("Failed to start timer: no entry ID returned");
    });

    it("sets error state when stop timer API fails", async () => {
      const { result } = renderTimerHook();

      // Start successfully first
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.isRunning).toBe(true);

      // Advance past action cooldown period (500ms)
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      // Now make stop fail
      mockStopTimerResult = { error: "Server error" };

      await act(async () => {
        await result.current.actions.stop();
      });

      // Timer should still be running after failed stop
      expect(result.current.state.isRunning).toBe(true);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.error).toBe("Server error");
    });

    it("clears error state with clearError action", async () => {
      mockStartTimerResult = { error: "Test error" };
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.error).toBe("Test error");

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBeNull();
      expect(result.current.state.status).toBe("idle");
    });

    it("clears previous error when starting timer successfully", async () => {
      // First, fail to start
      mockStartTimerResult = { error: "Initial error" };
      const { result } = renderTimerHook();

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.error).toBe("Initial error");

      // Advance past action cooldown period (500ms)
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      // Now, succeed
      mockStartTimerResult = { ok: true, entryId: "new-entry" };

      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.error).toBeNull();
      expect(result.current.state.isRunning).toBe(true);
    });
  });

  describe("rapid action prevention", () => {
    it("ignores stop action within cooldown period after start", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.isRunning).toBe(true);

      // Immediately try to stop (should be ignored due to cooldown)
      await act(async () => {
        await result.current.actions.stop();
      });

      // Timer should still be running because stop was ignored
      expect(result.current.state.isRunning).toBe(true);
    });

    it("ignores start action within cooldown period after stop", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Advance past cooldown
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      // Stop the timer
      await act(async () => {
        await result.current.actions.stop();
      });

      expect(result.current.state.isRunning).toBe(false);

      // Immediately try to start again (should be ignored due to cooldown)
      await act(async () => {
        await result.current.actions.start("matter-456");
      });

      // Timer should still be stopped because start was ignored
      expect(result.current.state.isRunning).toBe(false);
    });

    it("allows action after cooldown period expires", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.isRunning).toBe(true);

      // Advance past cooldown period
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      // Now stop should work
      await act(async () => {
        await result.current.actions.stop();
      });

      expect(result.current.state.isRunning).toBe(false);
    });

    it("prevents multiple rapid start attempts", async () => {
      const { result } = renderTimerHook();
      const { startTimer } = await import("@/lib/data/actions");
      const startTimerMock = startTimer as ReturnType<typeof vi.fn>;

      // First start
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Immediately try to start again (should be ignored)
      await act(async () => {
        await result.current.actions.start("matter-456");
      });

      // Should only have called startTimer once
      expect(startTimerMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("context value memoization", () => {
    it("maintains stable action references", async () => {
      const { result, rerender } = renderTimerHook();

      const initialActions = result.current.actions;

      rerender();

      expect(result.current.actions.start).toBe(initialActions.start);
      expect(result.current.actions.stop).toBe(initialActions.stop);
      expect(result.current.actions.reset).toBe(initialActions.reset);
      expect(result.current.actions.updateNotes).toBe(initialActions.updateNotes);
      expect(result.current.actions.updateMatter).toBe(initialActions.updateMatter);
      expect(result.current.actions.setSuggestedMatter).toBe(initialActions.setSuggestedMatter);
    });

    it("maintains stable modal control references", () => {
      const { result, rerender } = renderTimerHook();

      const initialOpenModal = result.current.openModal;
      const initialCloseModal = result.current.closeModal;
      const initialToggleModal = result.current.toggleModal;

      rerender();

      expect(result.current.openModal).toBe(initialOpenModal);
      expect(result.current.closeModal).toBe(initialCloseModal);
      expect(result.current.toggleModal).toBe(initialToggleModal);
    });
  });

  describe("duration warnings and auto-stop", () => {
    const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60;
    const TWENTY_FOUR_HOURS_IN_SECONDS = 24 * 60 * 60;

    it("shows 8-hour warning when timer runs for 8 hours", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.warningInfo).toBeNull();

      // Advance time to just under 8 hours
      await act(async () => {
        vi.advanceTimersByTime((EIGHT_HOURS_IN_SECONDS - 1) * 1000);
      });

      expect(result.current.warningInfo).toBeNull();

      // Advance time to 8 hours
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.warningInfo).not.toBeNull();
      expect(result.current.warningInfo?.type).toBe("eight_hour");
      expect(result.current.warningInfo?.elapsedSeconds).toBeGreaterThanOrEqual(EIGHT_HOURS_IN_SECONDS);
    });

    it("only shows 8-hour warning once per timer session", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Advance time to 8 hours
      await act(async () => {
        vi.advanceTimersByTime(EIGHT_HOURS_IN_SECONDS * 1000);
      });

      expect(result.current.warningInfo?.type).toBe("eight_hour");

      // Clear the warning
      act(() => {
        result.current.clearWarningInfo();
      });

      expect(result.current.warningInfo).toBeNull();

      // Advance time more - warning should not reappear
      await act(async () => {
        vi.advanceTimersByTime(60 * 1000); // 1 more minute
      });

      expect(result.current.warningInfo).toBeNull();
    });

    it("auto-stops timer at 24 hours", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      expect(result.current.state.isRunning).toBe(true);

      // Advance time to 24 hours
      await act(async () => {
        vi.advanceTimersByTime(TWENTY_FOUR_HOURS_IN_SECONDS * 1000);
      });

      // Timer should be auto-stopped
      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.warningInfo?.type).toBe("auto_stopped");
    });

    it("clears warning when timer is manually stopped", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Advance time to trigger 8-hour warning
      await act(async () => {
        vi.advanceTimersByTime(EIGHT_HOURS_IN_SECONDS * 1000);
      });

      expect(result.current.warningInfo).not.toBeNull();

      // Stop the timer
      await act(async () => {
        await result.current.actions.stop();
      });

      // Warning should be cleared when timer stops
      expect(result.current.warningInfo).toBeNull();
    });

    it("resets 8-hour warning flag for new timer session", async () => {
      const { result } = renderTimerHook();

      // Start first timer session
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Advance time to trigger 8-hour warning
      await act(async () => {
        vi.advanceTimersByTime(EIGHT_HOURS_IN_SECONDS * 1000);
      });

      expect(result.current.warningInfo?.type).toBe("eight_hour");

      // Stop the timer (8 hours is well past the cooldown period, no extra advance needed)
      await act(async () => {
        await result.current.actions.stop();
      });

      // Advance past action cooldown period (500ms) before starting again
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 1);
      });

      // Start a new timer session
      await act(async () => {
        await result.current.actions.start("matter-456");
      });

      // Warning should be cleared
      expect(result.current.warningInfo).toBeNull();

      // Advance time to 8 hours again - warning should appear again
      await act(async () => {
        vi.advanceTimersByTime(EIGHT_HOURS_IN_SECONDS * 1000);
      });

      expect(result.current.warningInfo?.type).toBe("eight_hour");
    });

    it("clearWarningInfo clears the warning", async () => {
      const { result } = renderTimerHook();

      // Start the timer
      await act(async () => {
        await result.current.actions.start("matter-123");
      });

      // Advance time to trigger warning
      await act(async () => {
        vi.advanceTimersByTime(EIGHT_HOURS_IN_SECONDS * 1000);
      });

      expect(result.current.warningInfo).not.toBeNull();

      // Clear the warning
      act(() => {
        result.current.clearWarningInfo();
      });

      expect(result.current.warningInfo).toBeNull();
    });

    it("provides warningInfo and clearWarningInfo in context value", () => {
      const { result } = renderTimerHook();

      expect(result.current.warningInfo).toBeNull();
      expect(typeof result.current.clearWarningInfo).toBe("function");
    });
  });
});
