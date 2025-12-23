import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { UseFormWatch, UseFormReset, FieldValues } from "react-hook-form";

import { useDraftPersistence } from "@/hooks/useDraftPersistence";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock localStorage
const createLocalStorageMock = () => {
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
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    // For test access
    __getStore: () => store,
    __setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
};

// Mock React Hook Form's watch and reset functions
// UseFormWatch has multiple overloads, we need to cast to the correct type
const createMockWatch = <T extends FieldValues = FieldValues>() => {
  let callback: ((data: T) => void) | null = null;
  const unsubscribe = vi.fn();

  // Create a mock function that matches the watch callback signature
  const watchFn = vi.fn((cb: (data: T) => void) => {
    callback = cb;
    return { unsubscribe };
  });

  // Cast to UseFormWatch type - the test only uses the callback form
  const watch = watchFn as unknown as UseFormWatch<T> & Mock;

  // Helper to simulate form change
  const triggerChange = (data: T) => {
    if (callback) {
      callback(data);
    }
  };

  return { watch, unsubscribe, triggerChange };
};

const createMockReset = <T extends FieldValues = FieldValues>() =>
  vi.fn() as unknown as UseFormReset<T> & Mock;

// Helper to filter localStorage calls, excluding test availability checks
const getActualSetItemCalls = (mock: ReturnType<typeof createLocalStorageMock>) => {
  return mock.setItem.mock.calls.filter((call) => call[0] !== "__test_storage__");
};

// ============================================================================
// Test Suite
// ============================================================================

describe("useDraftPersistence", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    // Set up fresh localStorage mock
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Reset timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorageMock.clear();
  });

  // ==========================================================================
  // Basic Functionality Tests
  // ==========================================================================

  describe("basic functionality", () => {
    it("returns clearDraft function and hasDraft boolean", () => {
      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { result } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      expect(typeof result.current.clearDraft).toBe("function");
      expect(typeof result.current.hasDraft).toBe("boolean");
    });

    it("uses correct localStorage key with prefix", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "my-form",
          watch,
          reset,
        })
      );

      // Trigger a form change and wait for debounce
      triggerChange({ name: "test" });
      vi.advanceTimersByTime(500);

      const actualCalls = getActualSetItemCalls(localStorageMock);
      expect(actualCalls).toHaveLength(1);
      expect(actualCalls[0][0]).toBe("form_draft_my-form");
    });
  });

  // ==========================================================================
  // Draft Saving Tests
  // ==========================================================================

  describe("saving draft to localStorage", () => {
    it("saves draft to localStorage on form change after debounce", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      const formData = { email: "test@example.com", password: "12345678" };
      triggerChange(formData);

      // Should not save immediately (debounced) - filter out test storage calls
      const callsBeforeDebounce = getActualSetItemCalls(localStorageMock);
      expect(callsBeforeDebounce).toHaveLength(0);

      // Advance timers past debounce delay
      vi.advanceTimersByTime(500);

      const callsAfterDebounce = getActualSetItemCalls(localStorageMock);
      expect(callsAfterDebounce).toHaveLength(1);
      expect(callsAfterDebounce[0]).toEqual([
        "form_draft_test-form",
        JSON.stringify(formData),
      ]);
    });

    it("debounces multiple rapid changes", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      // Trigger multiple rapid changes
      triggerChange({ value: "a" });
      vi.advanceTimersByTime(100);
      triggerChange({ value: "ab" });
      vi.advanceTimersByTime(100);
      triggerChange({ value: "abc" });
      vi.advanceTimersByTime(100);
      triggerChange({ value: "abcd" });

      // Only 400ms passed, not enough for debounce
      const callsBeforeDebounce = getActualSetItemCalls(localStorageMock);
      expect(callsBeforeDebounce).toHaveLength(0);

      // Advance past debounce time from last change
      vi.advanceTimersByTime(500);

      // Should only save the final value once
      const callsAfterDebounce = getActualSetItemCalls(localStorageMock);
      expect(callsAfterDebounce).toHaveLength(1);
      expect(callsAfterDebounce[0]).toEqual([
        "form_draft_test-form",
        JSON.stringify({ value: "abcd" }),
      ]);
    });

    it("subscribes to watch on mount", () => {
      const { watch } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      expect(watch).toHaveBeenCalled();
    });

    it("unsubscribes from watch on unmount", () => {
      const { watch, unsubscribe } = createMockWatch();
      const reset = createMockReset();

      const { unmount } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it("clears pending timeout on unmount", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      const { unmount } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      // Trigger change but don't wait for debounce
      triggerChange({ name: "test" });

      // Unmount before debounce completes
      unmount();
      vi.advanceTimersByTime(1000);

      // Should not save after unmount (filter out test storage calls)
      const actualCalls = getActualSetItemCalls(localStorageMock);
      expect(actualCalls).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Draft Loading Tests
  // ==========================================================================

  describe("loading draft from localStorage", () => {
    it("restores draft from localStorage on mount", () => {
      const savedDraft = { email: "saved@example.com", password: "savedpass" };
      // Directly set the store to bypass the mock
      localStorageMock.__setStore({ "form_draft_test-form": JSON.stringify(savedDraft) });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      // Run the effect
      vi.runAllTimers();

      expect(reset).toHaveBeenCalledWith(savedDraft, { keepDefaultValues: false });
    });

    it("does not call reset when no draft exists", () => {
      const { watch } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      vi.runAllTimers();

      expect(reset).not.toHaveBeenCalled();
    });

    it("only restores draft once (does not re-run on re-render)", () => {
      const savedDraft = { email: "saved@example.com" };
      localStorageMock.__setStore({ "form_draft_test-form": JSON.stringify(savedDraft) });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { rerender } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      vi.runAllTimers();

      expect(reset).toHaveBeenCalledTimes(1);

      // Re-render the hook
      rerender();
      vi.runAllTimers();

      // Reset should still only have been called once
      expect(reset).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Clear Draft Tests
  // ==========================================================================

  describe("clearDraft function", () => {
    it("removes draft from localStorage when clearDraft is called", () => {
      localStorageMock.__setStore({ "form_draft_test-form": JSON.stringify({ data: "test" }) });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { result } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      act(() => {
        result.current.clearDraft();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("form_draft_test-form");
    });

    it("clearDraft is memoized and stable across re-renders", () => {
      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { result, rerender } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      const clearDraftRef = result.current.clearDraft;
      rerender();

      expect(result.current.clearDraft).toBe(clearDraftRef);
    });
  });

  // ==========================================================================
  // hasDraft Tests
  // ==========================================================================

  describe("hasDraft property", () => {
    it("returns true when draft exists in localStorage", () => {
      localStorageMock.__setStore({ "form_draft_test-form": JSON.stringify({ data: "test" }) });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { result } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      expect(result.current.hasDraft).toBe(true);
    });

    it("returns false when no draft exists", () => {
      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { result } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      expect(result.current.hasDraft).toBe(false);
    });

    it("returns false after clearDraft is called", () => {
      localStorageMock.__setStore({ "form_draft_test-form": JSON.stringify({ data: "test" }) });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { result, rerender } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      expect(result.current.hasDraft).toBe(true);

      act(() => {
        result.current.clearDraft();
      });

      // Need to rerender to pick up the new value since hasDraft is computed
      rerender();

      expect(result.current.hasDraft).toBe(false);
    });
  });

  // ==========================================================================
  // Disabled Option Tests
  // ==========================================================================

  describe("disabled option", () => {
    it("does not restore draft when disabled is true", () => {
      const savedDraft = { email: "saved@example.com" };
      localStorageMock.__setStore({ "form_draft_test-form": JSON.stringify(savedDraft) });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
          disabled: true,
        })
      );

      vi.runAllTimers();

      expect(reset).not.toHaveBeenCalled();
    });

    it("does not save draft when disabled is true", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
          disabled: true,
        })
      );

      triggerChange({ name: "test" });
      vi.advanceTimersByTime(500);

      // Filter out test storage availability checks
      const actualCalls = getActualSetItemCalls(localStorageMock);
      expect(actualCalls).toHaveLength(0);
    });

    it("does not subscribe to watch when disabled", () => {
      const { watch } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
          disabled: true,
        })
      );

      // watch is called but the effect returns early, so subscription doesn't happen
      // The behavior is that the subscription effect is a no-op when disabled
      expect(watch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("error handling", () => {
    it("handles corrupted JSON in localStorage gracefully", () => {
      // Set invalid JSON directly in the store
      localStorageMock.__setStore({ "form_draft_test-form": "not valid json {{{" });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      // Should not throw
      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      vi.runAllTimers();

      // Reset should not be called with corrupted data
      expect(reset).not.toHaveBeenCalled();

      // Corrupted draft should be removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("form_draft_test-form");
    });

    it("gracefully handles localStorage.getItem throwing an error", () => {
      const { watch } = createMockWatch();
      const reset = createMockReset();

      // Make getItem throw
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage is disabled");
      });

      // Should not throw
      expect(() => {
        renderHook(() =>
          useDraftPersistence({
            formId: "test-form",
            watch,
            reset,
          })
        );
      }).not.toThrow();

      // Reset should not be called
      expect(reset).not.toHaveBeenCalled();
    });

    it("gracefully handles localStorage.setItem throwing an error", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      // Make setItem throw (e.g., quota exceeded)
      localStorageMock.setItem.mockImplementation(() => {
        const error = new DOMException("Quota exceeded", "QuotaExceededError");
        Object.defineProperty(error, "code", { value: 22 });
        throw error;
      });

      // Should not throw when trying to save
      expect(() => {
        triggerChange({ name: "test" });
        vi.advanceTimersByTime(500);
      }).not.toThrow();
    });

    it("gracefully handles localStorage.removeItem throwing an error", () => {
      localStorageMock.__setStore({ "form_draft_test-form": JSON.stringify({ data: "test" }) });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      const { result } = renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      // Make removeItem throw
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      // Should not throw when clearing
      expect(() => {
        act(() => {
          result.current.clearDraft();
        });
      }).not.toThrow();
    });

    it("handles non-serializable data gracefully", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      // Create a circular reference that can't be serialized
      const circularData: { self?: unknown } = {};
      circularData.self = circularData;

      // Should not throw when trying to save non-serializable data
      expect(() => {
        triggerChange(circularData);
        vi.advanceTimersByTime(500);
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // localStorage Availability Tests
  // ==========================================================================

  describe("localStorage availability", () => {
    it("handles localStorage being undefined (SSR)", () => {
      // Temporarily make localStorage undefined
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, "localStorage", {
        value: undefined,
        writable: true,
      });

      const { watch } = createMockWatch();
      const reset = createMockReset();

      // Should not throw
      expect(() => {
        renderHook(() =>
          useDraftPersistence({
            formId: "test-form",
            watch,
            reset,
          })
        );
      }).not.toThrow();

      // Restore localStorage
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it("handles localStorage test write failing (private browsing)", () => {
      const { watch, triggerChange } = createMockWatch();
      const reset = createMockReset();

      // Simulate private browsing where localStorage.setItem throws
      let testWriteCount = 0;
      localStorageMock.setItem.mockImplementation((key: string) => {
        // First call is the availability test
        if (key === "__test_storage__") {
          testWriteCount++;
          throw new Error("Private browsing - localStorage unavailable");
        }
      });

      renderHook(() =>
        useDraftPersistence({
          formId: "test-form",
          watch,
          reset,
        })
      );

      triggerChange({ name: "test" });
      vi.advanceTimersByTime(500);

      // Hook should gracefully handle unavailable localStorage
      expect(testWriteCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Multiple Form Instances Tests
  // ==========================================================================

  describe("multiple form instances", () => {
    it("different formIds use different localStorage keys", () => {
      const { watch: watch1, triggerChange: trigger1 } = createMockWatch();
      const { watch: watch2, triggerChange: trigger2 } = createMockWatch();
      const reset1 = createMockReset();
      const reset2 = createMockReset();

      renderHook(() =>
        useDraftPersistence({
          formId: "form-a",
          watch: watch1,
          reset: reset1,
        })
      );

      renderHook(() =>
        useDraftPersistence({
          formId: "form-b",
          watch: watch2,
          reset: reset2,
        })
      );

      trigger1({ field: "form-a-data" });
      trigger2({ field: "form-b-data" });
      vi.advanceTimersByTime(500);

      const actualCalls = getActualSetItemCalls(localStorageMock);
      expect(actualCalls).toContainEqual([
        "form_draft_form-a",
        JSON.stringify({ field: "form-a-data" }),
      ]);
      expect(actualCalls).toContainEqual([
        "form_draft_form-b",
        JSON.stringify({ field: "form-b-data" }),
      ]);
    });

    it("clearing one form draft does not affect another", () => {
      localStorageMock.__setStore({
        "form_draft_form-a": JSON.stringify({ a: 1 }),
        "form_draft_form-b": JSON.stringify({ b: 2 }),
      });

      const { watch: watch1 } = createMockWatch();
      const reset1 = createMockReset();

      const { result } = renderHook(() =>
        useDraftPersistence({
          formId: "form-a",
          watch: watch1,
          reset: reset1,
        })
      );

      act(() => {
        result.current.clearDraft();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("form_draft_form-a");
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith("form_draft_form-b");
    });
  });
});
