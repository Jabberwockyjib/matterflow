import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));

    expect(result.current).toBe("initial");
  });

  it("debounces value changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "first" } }
    );

    expect(result.current).toBe("first");

    // Update the value
    rerender({ value: "second" });

    // Value should not have changed yet
    expect(result.current).toBe("first");

    // Fast-forward time by less than delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Still the old value
    expect(result.current).toBe("first");

    // Fast-forward past the delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now it should be updated
    expect(result.current).toBe("second");
  });

  it("cancels pending updates when value changes rapidly", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "first" } }
    );

    // Rapid changes
    rerender({ value: "second" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "third" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "fourth" });

    // Still the original value
    expect(result.current).toBe("first");

    // Fast-forward past the delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should only have the final value
    expect(result.current).toBe("fourth");
  });

  it("uses default delay of 500ms", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: "first" } }
    );

    rerender({ value: "second" });

    // At 400ms, should still be old value
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe("first");

    // At 500ms, should update
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("second");
  });

  it("works with different types", () => {
    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 1 } }
    );
    numberRerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(42);

    // Object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { name: "first" } } }
    );
    objectRerender({ value: { name: "second" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(objectResult.current).toEqual({ name: "second" });

    // Array
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: [1, 2] } }
    );
    arrayRerender({ value: [3, 4, 5] });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(arrayResult.current).toEqual([3, 4, 5]);
  });

  it("respects custom delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000),
      { initialProps: { value: "first" } }
    );

    rerender({ value: "second" });

    // At 999ms, should still be old value
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe("first");

    // At 1000ms, should update
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("second");
  });

  it("cleans up timeout on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { unmount } = renderHook(() => useDebounce("value", 500));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
