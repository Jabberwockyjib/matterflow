import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

// ============================================================================
// Mock Setup
// ============================================================================

// Store for tracking event listeners
type BeforeUnloadHandler = (e: BeforeUnloadEvent) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

const createWindowMock = () => {
  const listeners: Map<string, Set<EventHandler>> = new Map();

  const addEventListenerMock = vi.fn((event: string, handler: EventHandler) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);
  });

  const removeEventListenerMock = vi.fn((event: string, handler: EventHandler) => {
    listeners.get(event)?.delete(handler);
  });

  return {
    addEventListener: addEventListenerMock as unknown as typeof window.addEventListener,
    removeEventListener: removeEventListenerMock as unknown as typeof window.removeEventListener,
    // Test helpers
    __getListeners: (event: string) => listeners.get(event) ?? new Set<EventHandler>(),
    __getListenerCount: (event: string) => listeners.get(event)?.size ?? 0,
    __triggerEvent: (event: string, eventObj: Partial<BeforeUnloadEvent>) => {
      const handlers = listeners.get(event);
      if (handlers) {
        handlers.forEach((handler) => (handler as BeforeUnloadHandler)(eventObj as BeforeUnloadEvent));
      }
    },
    __clear: () => listeners.clear(),
  };
};

// ============================================================================
// Test Suite
// ============================================================================

describe("useUnsavedChanges", () => {
  let windowMock: ReturnType<typeof createWindowMock>;
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;

  beforeEach(() => {
    // Store original window methods
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;

    // Set up fresh window mock
    windowMock = createWindowMock();

    // Override window methods
    window.addEventListener = windowMock.addEventListener;
    window.removeEventListener = windowMock.removeEventListener;
  });

  afterEach(() => {
    // Restore original window methods
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;

    // Clear mocks
    vi.clearAllMocks();
    windowMock.__clear();
  });

  // ==========================================================================
  // Event Listener Registration Tests
  // ==========================================================================

  describe("event listener registration", () => {
    it("adds beforeunload event listener when isDirty is true", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true }));

      expect(windowMock.addEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);
    });

    it("does not add event listener when isDirty is false", () => {
      renderHook(() => useUnsavedChanges({ isDirty: false }));

      expect(windowMock.addEventListener).not.toHaveBeenCalled();
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });

    it("does not add event listener when disabled is true", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true, disabled: true }));

      expect(windowMock.addEventListener).not.toHaveBeenCalled();
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });

    it("does not add event listener when both isDirty and disabled are true", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true, disabled: true }));

      expect(windowMock.addEventListener).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Event Listener Removal Tests
  // ==========================================================================

  describe("event listener removal", () => {
    it("removes event listener on unmount when isDirty was true", () => {
      const { unmount } = renderHook(() =>
        useUnsavedChanges({ isDirty: true })
      );

      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);

      unmount();

      expect(windowMock.removeEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });

    it("does not call removeEventListener on unmount when isDirty was false", () => {
      const { unmount } = renderHook(() =>
        useUnsavedChanges({ isDirty: false })
      );

      unmount();

      // No listener was added, so no removal should happen
      expect(windowMock.removeEventListener).not.toHaveBeenCalled();
    });

    it("removes event listener when isDirty changes from true to false", () => {
      const { rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: true } }
      );

      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);

      rerender({ isDirty: false });

      expect(windowMock.removeEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });

    it("adds event listener when isDirty changes from false to true", () => {
      const { rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: false } }
      );

      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);

      rerender({ isDirty: true });

      expect(windowMock.addEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);
    });

    it("removes and re-adds listener when isDirty toggles true -> false -> true", () => {
      const { rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: true } }
      );

      expect(windowMock.addEventListener).toHaveBeenCalledTimes(1);

      rerender({ isDirty: false });

      expect(windowMock.removeEventListener).toHaveBeenCalledTimes(1);
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);

      rerender({ isDirty: true });

      expect(windowMock.addEventListener).toHaveBeenCalledTimes(2);
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);
    });
  });

  // ==========================================================================
  // BeforeUnload Event Handler Tests
  // ==========================================================================

  describe("beforeunload event handler", () => {
    it("calls e.preventDefault() when beforeunload is triggered", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true }));

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: undefined as string | undefined,
      };

      windowMock.__triggerEvent("beforeunload", mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("sets e.returnValue to empty string for Chrome compatibility", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true }));

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: undefined as string | undefined,
      };

      windowMock.__triggerEvent("beforeunload", mockEvent);

      expect(mockEvent.returnValue).toBe("");
    });

    it("sets e.returnValue even if it was already set", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true }));

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: "existing value",
      };

      windowMock.__triggerEvent("beforeunload", mockEvent);

      expect(mockEvent.returnValue).toBe("");
    });
  });

  // ==========================================================================
  // Disabled Option Tests
  // ==========================================================================

  describe("disabled option", () => {
    it("removes listener when disabled changes from false to true", () => {
      const { rerender } = renderHook(
        ({ isDirty, disabled }) => useUnsavedChanges({ isDirty, disabled }),
        { initialProps: { isDirty: true, disabled: false } }
      );

      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);

      rerender({ isDirty: true, disabled: true });

      expect(windowMock.removeEventListener).toHaveBeenCalled();
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });

    it("adds listener when disabled changes from true to false (and isDirty is true)", () => {
      const { rerender } = renderHook(
        ({ isDirty, disabled }) => useUnsavedChanges({ isDirty, disabled }),
        { initialProps: { isDirty: true, disabled: true } }
      );

      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);

      rerender({ isDirty: true, disabled: false });

      expect(windowMock.addEventListener).toHaveBeenCalled();
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);
    });

    it("respects disabled even when isDirty is true", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true, disabled: true }));

      expect(windowMock.addEventListener).not.toHaveBeenCalled();
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });

    it("disabled defaults to false", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true }));

      // With isDirty: true and disabled defaulting to false,
      // the listener should be added
      expect(windowMock.addEventListener).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Hook Return Value Tests
  // ==========================================================================

  describe("hook return value", () => {
    it("returns void (no return value)", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({ isDirty: true })
      );

      expect(result.current).toBeUndefined();
    });
  });

  // ==========================================================================
  // Re-render Stability Tests
  // ==========================================================================

  describe("re-render stability", () => {
    it("does not add duplicate listeners on re-render with same isDirty value", () => {
      const { rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: true } }
      );

      expect(windowMock.addEventListener).toHaveBeenCalledTimes(1);
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);

      // Re-render with same props
      rerender({ isDirty: true });
      rerender({ isDirty: true });
      rerender({ isDirty: true });

      // Should still only have one listener (effect doesn't re-run)
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);
    });

    it("maintains listener reference across re-renders", () => {
      const { rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: true } }
      );

      const initialListenerSet = windowMock.__getListeners("beforeunload");
      const initialListener = [...initialListenerSet][0];

      // Re-render with same props
      rerender({ isDirty: true });

      const afterRerenderListenerSet = windowMock.__getListeners("beforeunload");
      const afterRerenderListener = [...afterRerenderListenerSet][0];

      expect(initialListener).toBe(afterRerenderListener);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("edge cases", () => {
    it("handles rapid isDirty toggles correctly", () => {
      const { rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: false } }
      );

      // Rapid toggles
      rerender({ isDirty: true });
      rerender({ isDirty: false });
      rerender({ isDirty: true });
      rerender({ isDirty: false });
      rerender({ isDirty: true });

      // Final state should have exactly one listener
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);
    });

    it("handles starting with isDirty true", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true }));

      // Should add listener on mount
      expect(windowMock.addEventListener).toHaveBeenCalledTimes(1);
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);
    });

    it("handles starting with isDirty false and never changing", () => {
      const { unmount } = renderHook(() =>
        useUnsavedChanges({ isDirty: false })
      );

      expect(windowMock.addEventListener).not.toHaveBeenCalled();

      unmount();

      expect(windowMock.removeEventListener).not.toHaveBeenCalled();
    });

    it("handles disabled toggling independently of isDirty", () => {
      const { rerender } = renderHook(
        ({ isDirty, disabled }) => useUnsavedChanges({ isDirty, disabled }),
        { initialProps: { isDirty: true, disabled: false } }
      );

      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);

      // Disable while isDirty is true
      rerender({ isDirty: true, disabled: true });
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);

      // Re-enable while isDirty is still true
      rerender({ isDirty: true, disabled: false });
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);

      // Set isDirty to false while enabled
      rerender({ isDirty: false, disabled: false });
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });
  });

  // ==========================================================================
  // Multiple Hook Instances Tests
  // ==========================================================================

  describe("multiple hook instances", () => {
    it("allows multiple independent hook instances", () => {
      renderHook(() => useUnsavedChanges({ isDirty: true }));
      renderHook(() => useUnsavedChanges({ isDirty: true }));

      // Each hook instance adds its own listener
      expect(windowMock.addEventListener).toHaveBeenCalledTimes(2);
      expect(windowMock.__getListenerCount("beforeunload")).toBe(2);
    });

    it("each instance manages its own listener independently", () => {
      const { unmount: unmount1 } = renderHook(() =>
        useUnsavedChanges({ isDirty: true })
      );
      const { unmount: unmount2 } = renderHook(() =>
        useUnsavedChanges({ isDirty: true })
      );

      expect(windowMock.__getListenerCount("beforeunload")).toBe(2);

      unmount1();
      expect(windowMock.__getListenerCount("beforeunload")).toBe(1);

      unmount2();
      expect(windowMock.__getListenerCount("beforeunload")).toBe(0);
    });
  });
});
