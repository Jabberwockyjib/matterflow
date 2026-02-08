import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModalState } from "@/hooks/use-modal-state";

describe("useModalState", () => {
  it("initializes with defaults", () => {
    const { result } = renderHook(() => useModalState());
    expect(result.current.open).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("accepts defaultOpen", () => {
    const { result } = renderHook(() => useModalState(true));
    expect(result.current.open).toBe(true);
  });

  it("setOpen toggles open state", () => {
    const { result } = renderHook(() => useModalState());
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
    act(() => result.current.setOpen(false));
    expect(result.current.open).toBe(false);
  });

  it("setLoading toggles loading state", () => {
    const { result } = renderHook(() => useModalState());
    act(() => result.current.setLoading(true));
    expect(result.current.loading).toBe(true);
  });

  it("setError sets error message", () => {
    const { result } = renderHook(() => useModalState());
    act(() => result.current.setError("Something went wrong"));
    expect(result.current.error).toBe("Something went wrong");
  });

  it("reset clears loading and error", () => {
    const { result } = renderHook(() => useModalState());
    act(() => {
      result.current.setLoading(true);
      result.current.setError("error");
    });
    act(() => result.current.reset());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("openModal resets state and opens", () => {
    const { result } = renderHook(() => useModalState());
    act(() => {
      result.current.setError("old error");
      result.current.setLoading(true);
    });
    act(() => result.current.openModal());
    expect(result.current.open).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
  });
});
