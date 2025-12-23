import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isOverdue, formatDueDate, dueDateClass, cn } from "../utils";

describe("cn (className utility)", () => {
  it("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active")).toBe("base active");
    expect(cn("base", false && "inactive")).toBe("base");
  });

  it("merges tailwind classes intelligently", () => {
    // twMerge should resolve conflicting tailwind utilities
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("isOverdue", () => {
  beforeEach(() => {
    // Mock the current date to 2025-12-23
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-23T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for past dates", () => {
    expect(isOverdue("2025-12-22")).toBe(true);
    expect(isOverdue("2025-12-01")).toBe(true);
    expect(isOverdue("2024-12-23")).toBe(true);
  });

  it("returns false for today's date", () => {
    expect(isOverdue("2025-12-23")).toBe(false);
  });

  it("returns false for future dates", () => {
    expect(isOverdue("2025-12-24")).toBe(false);
    expect(isOverdue("2025-12-31")).toBe(false);
    expect(isOverdue("2026-01-01")).toBe(false);
  });
});

describe("formatDueDate", () => {
  it("formats dates in 'Mon DD, YYYY' format", () => {
    expect(formatDueDate("2025-12-23")).toBe("Dec 23, 2025");
    expect(formatDueDate("2025-01-01")).toBe("Jan 1, 2025");
    expect(formatDueDate("2025-06-15")).toBe("Jun 15, 2025");
  });

  it("handles different months correctly", () => {
    expect(formatDueDate("2025-02-14")).toBe("Feb 14, 2025");
    expect(formatDueDate("2025-07-04")).toBe("Jul 4, 2025");
    expect(formatDueDate("2025-11-28")).toBe("Nov 28, 2025");
  });
});

describe("dueDateClass", () => {
  beforeEach(() => {
    // Mock the current date to 2025-12-23
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-23T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns red styling for overdue dates", () => {
    expect(dueDateClass("2025-12-22")).toBe("border-red-300 bg-red-50");
    expect(dueDateClass("2025-12-01")).toBe("border-red-300 bg-red-50");
  });

  it("returns empty string for today's date", () => {
    expect(dueDateClass("2025-12-23")).toBe("");
  });

  it("returns empty string for future dates", () => {
    expect(dueDateClass("2025-12-24")).toBe("");
    expect(dueDateClass("2025-12-31")).toBe("");
  });
});
