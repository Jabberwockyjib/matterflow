import { describe, expect, it } from "vitest";
import {
  daysBetween,
  isOverdue,
  isDueToday,
  getDaysUntil,
  getDaysSince,
  formatDueDateStatus,
  getDueDateUrgency,
  formatDateForInput,
} from "@/lib/utils/date-helpers";

describe("date-helpers", () => {
  // Use a fixed reference date for consistent testing
  const referenceDate = new Date(2026, 0, 15); // January 15, 2026

  describe("daysBetween", () => {
    it("returns 0 for the same date", () => {
      expect(daysBetween(referenceDate, referenceDate)).toBe(0);
    });

    it("returns positive number for future dates", () => {
      const futureDate = new Date(2026, 0, 20); // 5 days later
      expect(daysBetween(futureDate, referenceDate)).toBe(5);
    });

    it("returns negative number for past dates", () => {
      const pastDate = new Date(2026, 0, 10); // 5 days earlier
      expect(daysBetween(pastDate, referenceDate)).toBe(-5);
    });

    it("handles string dates in YYYY-MM-DD format", () => {
      expect(daysBetween("2026-01-20", referenceDate)).toBe(5);
      expect(daysBetween("2026-01-10", referenceDate)).toBe(-5);
    });

    it("handles ISO timestamp strings", () => {
      expect(daysBetween("2026-01-20T10:30:00Z", referenceDate)).toBe(5);
    });

    it("handles Date objects", () => {
      const dateObj = new Date(2026, 0, 18);
      expect(daysBetween(dateObj, referenceDate)).toBe(3);
    });

    it("ignores time component", () => {
      const dateWithTime = new Date(2026, 0, 15, 23, 59, 59);
      expect(daysBetween(dateWithTime, referenceDate)).toBe(0);
    });
  });

  describe("isOverdue", () => {
    it("returns true for past dates", () => {
      expect(isOverdue("2026-01-10", referenceDate)).toBe(true);
    });

    it("returns false for today", () => {
      expect(isOverdue("2026-01-15", referenceDate)).toBe(false);
    });

    it("returns false for future dates", () => {
      expect(isOverdue("2026-01-20", referenceDate)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isOverdue(null, referenceDate)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isOverdue(undefined, referenceDate)).toBe(false);
    });
  });

  describe("isDueToday", () => {
    it("returns true for today", () => {
      expect(isDueToday("2026-01-15", referenceDate)).toBe(true);
    });

    it("returns false for yesterday", () => {
      expect(isDueToday("2026-01-14", referenceDate)).toBe(false);
    });

    it("returns false for tomorrow", () => {
      expect(isDueToday("2026-01-16", referenceDate)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isDueToday(null, referenceDate)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isDueToday(undefined, referenceDate)).toBe(false);
    });
  });

  describe("getDaysUntil", () => {
    it("returns 0 for today", () => {
      expect(getDaysUntil("2026-01-15", referenceDate)).toBe(0);
    });

    it("returns positive number for future dates", () => {
      expect(getDaysUntil("2026-01-20", referenceDate)).toBe(5);
      expect(getDaysUntil("2026-01-16", referenceDate)).toBe(1);
    });

    it("returns null for past dates", () => {
      expect(getDaysUntil("2026-01-10", referenceDate)).toBeNull();
    });

    it("returns null for null input", () => {
      expect(getDaysUntil(null, referenceDate)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(getDaysUntil(undefined, referenceDate)).toBeNull();
    });
  });

  describe("getDaysSince", () => {
    it("returns null for today", () => {
      expect(getDaysSince("2026-01-15", referenceDate)).toBeNull();
    });

    it("returns positive number for past dates", () => {
      expect(getDaysSince("2026-01-10", referenceDate)).toBe(5);
      expect(getDaysSince("2026-01-14", referenceDate)).toBe(1);
    });

    it("returns null for future dates", () => {
      expect(getDaysSince("2026-01-20", referenceDate)).toBeNull();
    });

    it("returns null for null input", () => {
      expect(getDaysSince(null, referenceDate)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(getDaysSince(undefined, referenceDate)).toBeNull();
    });
  });

  describe("formatDueDateStatus", () => {
    it("returns 'Due today' for today", () => {
      expect(formatDueDateStatus("2026-01-15", referenceDate)).toBe("Due today");
    });

    it("returns 'Due tomorrow' for tomorrow", () => {
      expect(formatDueDateStatus("2026-01-16", referenceDate)).toBe("Due tomorrow");
    });

    it("returns 'Due in X days' for future dates", () => {
      expect(formatDueDateStatus("2026-01-17", referenceDate)).toBe("Due in 2 days");
      expect(formatDueDateStatus("2026-01-20", referenceDate)).toBe("Due in 5 days");
    });

    it("returns '1 day overdue' for yesterday", () => {
      expect(formatDueDateStatus("2026-01-14", referenceDate)).toBe("1 day overdue");
    });

    it("returns 'X days overdue' for past dates", () => {
      expect(formatDueDateStatus("2026-01-13", referenceDate)).toBe("2 days overdue");
      expect(formatDueDateStatus("2026-01-10", referenceDate)).toBe("5 days overdue");
    });

    it("returns null for null input", () => {
      expect(formatDueDateStatus(null, referenceDate)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(formatDueDateStatus(undefined, referenceDate)).toBeNull();
    });
  });

  describe("getDueDateUrgency", () => {
    it("returns 'overdue' for past dates", () => {
      expect(getDueDateUrgency("2026-01-10", referenceDate)).toBe("overdue");
      expect(getDueDateUrgency("2026-01-14", referenceDate)).toBe("overdue");
    });

    it("returns 'today' for today", () => {
      expect(getDueDateUrgency("2026-01-15", referenceDate)).toBe("today");
    });

    it("returns 'soon' for dates within 3 days", () => {
      expect(getDueDateUrgency("2026-01-16", referenceDate)).toBe("soon"); // 1 day
      expect(getDueDateUrgency("2026-01-17", referenceDate)).toBe("soon"); // 2 days
      expect(getDueDateUrgency("2026-01-18", referenceDate)).toBe("soon"); // 3 days
    });

    it("returns 'upcoming' for dates within 7 days but more than 3", () => {
      expect(getDueDateUrgency("2026-01-19", referenceDate)).toBe("upcoming"); // 4 days
      expect(getDueDateUrgency("2026-01-20", referenceDate)).toBe("upcoming"); // 5 days
      expect(getDueDateUrgency("2026-01-22", referenceDate)).toBe("upcoming"); // 7 days
    });

    it("returns 'future' for dates more than 7 days out", () => {
      expect(getDueDateUrgency("2026-01-23", referenceDate)).toBe("future"); // 8 days
      expect(getDueDateUrgency("2026-02-15", referenceDate)).toBe("future"); // 31 days
    });

    it("returns null for null input", () => {
      expect(getDueDateUrgency(null, referenceDate)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(getDueDateUrgency(undefined, referenceDate)).toBeNull();
    });
  });

  describe("formatDateForInput", () => {
    it("formats ISO date string to YYYY-MM-DD", () => {
      expect(formatDateForInput("2024-03-15T10:30:00.000Z")).toBe("2024-03-15");
    });

    it("returns empty string for null", () => {
      expect(formatDateForInput(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(formatDateForInput(undefined)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(formatDateForInput("")).toBe("");
    });

    it("returns empty string for invalid date", () => {
      expect(formatDateForInput("not-a-date")).toBe("");
    });

    it("handles date-only string", () => {
      expect(formatDateForInput("2024-03-15")).toBe("2024-03-15");
    });
  });

  describe("edge cases", () => {
    it("handles month boundaries", () => {
      const monthEnd = new Date(2026, 0, 31); // January 31
      expect(daysBetween("2026-02-01", monthEnd)).toBe(1);
      expect(daysBetween("2026-01-30", monthEnd)).toBe(-1);
    });

    it("handles year boundaries", () => {
      const yearEnd = new Date(2025, 11, 31); // December 31, 2025
      expect(daysBetween("2026-01-01", yearEnd)).toBe(1);
      expect(daysBetween("2025-12-30", yearEnd)).toBe(-1);
    });

    it("handles leap year dates", () => {
      const feb28_2028 = new Date(2028, 1, 28); // 2028 is a leap year
      expect(daysBetween("2028-02-29", feb28_2028)).toBe(1);
      expect(daysBetween("2028-03-01", feb28_2028)).toBe(2);
    });
  });
});
