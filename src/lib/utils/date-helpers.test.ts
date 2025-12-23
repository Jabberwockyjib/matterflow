import { describe, it, expect } from "vitest";
import {
  daysBetween,
  isOverdue,
  isDueToday,
  getDaysUntil,
  getDaysSince,
  formatDueDateStatus,
  getDueDateUrgency,
} from "./date-helpers";

describe("date-helpers", () => {
  // Use a fixed reference date for consistent test results
  const referenceDate = new Date("2024-06-15T12:00:00");

  describe("daysBetween", () => {
    it("returns 0 for same day", () => {
      const sameDay = new Date("2024-06-15T08:00:00");
      expect(daysBetween(sameDay, referenceDate)).toBe(0);
    });

    it("returns positive number for future dates", () => {
      // Use explicit year, month (0-indexed), day to avoid timezone issues
      const future = new Date(2024, 5, 18); // June 18, 2024
      expect(daysBetween(future, referenceDate)).toBe(3);
    });

    it("returns negative number for past dates", () => {
      // Use explicit year, month (0-indexed), day to avoid timezone issues
      const past = new Date(2024, 5, 12); // June 12, 2024
      expect(daysBetween(past, referenceDate)).toBe(-3);
    });

    it("handles string dates", () => {
      expect(daysBetween("2024-06-18", referenceDate)).toBe(3);
    });

    it("handles ISO string dates", () => {
      expect(daysBetween("2024-06-18T10:30:00Z", referenceDate)).toBe(3);
    });

    it("ignores time component when calculating days", () => {
      const endOfDay = new Date("2024-06-15T23:59:59");
      const startOfDay = new Date("2024-06-15T00:00:01");
      expect(daysBetween(endOfDay, referenceDate)).toBe(0);
      expect(daysBetween(startOfDay, referenceDate)).toBe(0);
    });
  });

  describe("isOverdue", () => {
    it("returns true for past dates", () => {
      expect(isOverdue("2024-06-14", referenceDate)).toBe(true);
      expect(isOverdue("2024-06-01", referenceDate)).toBe(true);
    });

    it("returns false for today", () => {
      expect(isOverdue("2024-06-15", referenceDate)).toBe(false);
    });

    it("returns false for future dates", () => {
      expect(isOverdue("2024-06-16", referenceDate)).toBe(false);
      expect(isOverdue("2024-07-01", referenceDate)).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isOverdue(null, referenceDate)).toBe(false);
      expect(isOverdue(undefined, referenceDate)).toBe(false);
    });

    it("handles Date objects", () => {
      expect(isOverdue(new Date("2024-06-14"), referenceDate)).toBe(true);
    });
  });

  describe("isDueToday", () => {
    it("returns true for same day", () => {
      expect(isDueToday("2024-06-15", referenceDate)).toBe(true);
    });

    it("returns true regardless of time on same day", () => {
      expect(isDueToday("2024-06-15T00:00:00", referenceDate)).toBe(true);
      expect(isDueToday("2024-06-15T23:59:59", referenceDate)).toBe(true);
    });

    it("returns false for past dates", () => {
      expect(isDueToday("2024-06-14", referenceDate)).toBe(false);
    });

    it("returns false for future dates", () => {
      expect(isDueToday("2024-06-16", referenceDate)).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isDueToday(null, referenceDate)).toBe(false);
      expect(isDueToday(undefined, referenceDate)).toBe(false);
    });
  });

  describe("getDaysUntil", () => {
    it("returns 0 for today", () => {
      expect(getDaysUntil("2024-06-15", referenceDate)).toBe(0);
    });

    it("returns positive number for future dates", () => {
      expect(getDaysUntil("2024-06-18", referenceDate)).toBe(3);
      expect(getDaysUntil("2024-06-22", referenceDate)).toBe(7);
    });

    it("returns null for past dates", () => {
      expect(getDaysUntil("2024-06-14", referenceDate)).toBe(null);
      expect(getDaysUntil("2024-06-01", referenceDate)).toBe(null);
    });

    it("returns null for null/undefined input", () => {
      expect(getDaysUntil(null, referenceDate)).toBe(null);
      expect(getDaysUntil(undefined, referenceDate)).toBe(null);
    });
  });

  describe("getDaysSince", () => {
    it("returns null for today (not past)", () => {
      expect(getDaysSince("2024-06-15", referenceDate)).toBe(null);
    });

    it("returns positive number for past dates", () => {
      expect(getDaysSince("2024-06-14", referenceDate)).toBe(1);
      expect(getDaysSince("2024-06-12", referenceDate)).toBe(3);
      expect(getDaysSince("2024-06-08", referenceDate)).toBe(7);
    });

    it("returns null for future dates", () => {
      expect(getDaysSince("2024-06-16", referenceDate)).toBe(null);
      expect(getDaysSince("2024-07-01", referenceDate)).toBe(null);
    });

    it("returns null for null/undefined input", () => {
      expect(getDaysSince(null, referenceDate)).toBe(null);
      expect(getDaysSince(undefined, referenceDate)).toBe(null);
    });
  });

  describe("formatDueDateStatus", () => {
    it("returns 'Due today' for today", () => {
      expect(formatDueDateStatus("2024-06-15", referenceDate)).toBe("Due today");
    });

    it("returns 'Due tomorrow' for tomorrow", () => {
      expect(formatDueDateStatus("2024-06-16", referenceDate)).toBe(
        "Due tomorrow",
      );
    });

    it("returns 'Due in X days' for future dates", () => {
      expect(formatDueDateStatus("2024-06-18", referenceDate)).toBe(
        "Due in 3 days",
      );
      expect(formatDueDateStatus("2024-06-22", referenceDate)).toBe(
        "Due in 7 days",
      );
    });

    it("returns '1 day overdue' for yesterday", () => {
      expect(formatDueDateStatus("2024-06-14", referenceDate)).toBe(
        "1 day overdue",
      );
    });

    it("returns 'X days overdue' for past dates", () => {
      expect(formatDueDateStatus("2024-06-12", referenceDate)).toBe(
        "3 days overdue",
      );
      expect(formatDueDateStatus("2024-06-08", referenceDate)).toBe(
        "7 days overdue",
      );
    });

    it("returns null for null/undefined input", () => {
      expect(formatDueDateStatus(null, referenceDate)).toBe(null);
      expect(formatDueDateStatus(undefined, referenceDate)).toBe(null);
    });

    it("handles ISO date strings", () => {
      expect(formatDueDateStatus("2024-06-15T10:30:00Z", referenceDate)).toBe(
        "Due today",
      );
    });
  });

  describe("getDueDateUrgency", () => {
    it("returns 'overdue' for past dates", () => {
      expect(getDueDateUrgency("2024-06-14", referenceDate)).toBe("overdue");
      expect(getDueDateUrgency("2024-06-01", referenceDate)).toBe("overdue");
    });

    it("returns 'today' for same day", () => {
      expect(getDueDateUrgency("2024-06-15", referenceDate)).toBe("today");
    });

    it("returns 'soon' for 1-3 days ahead", () => {
      expect(getDueDateUrgency("2024-06-16", referenceDate)).toBe("soon"); // 1 day
      expect(getDueDateUrgency("2024-06-17", referenceDate)).toBe("soon"); // 2 days
      expect(getDueDateUrgency("2024-06-18", referenceDate)).toBe("soon"); // 3 days
    });

    it("returns 'upcoming' for 4-7 days ahead", () => {
      expect(getDueDateUrgency("2024-06-19", referenceDate)).toBe("upcoming"); // 4 days
      expect(getDueDateUrgency("2024-06-22", referenceDate)).toBe("upcoming"); // 7 days
    });

    it("returns 'future' for more than 7 days ahead", () => {
      expect(getDueDateUrgency("2024-06-23", referenceDate)).toBe("future"); // 8 days
      expect(getDueDateUrgency("2024-07-15", referenceDate)).toBe("future"); // 30 days
    });

    it("returns null for null/undefined input", () => {
      expect(getDueDateUrgency(null, referenceDate)).toBe(null);
      expect(getDueDateUrgency(undefined, referenceDate)).toBe(null);
    });
  });

  describe("default reference date behavior", () => {
    it("uses current date when no reference provided", () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // getDaysUntil should return 1 for tomorrow's date
      expect(getDaysUntil(tomorrow)).toBe(1);

      // Today should be due today - use local date components to build string
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayString = `${year}-${month}-${day}`;
      expect(isDueToday(todayString)).toBe(true);
    });
  });
});
