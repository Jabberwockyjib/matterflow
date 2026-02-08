/**
 * Date helper functions for due date calculations
 * Used by the Matter Status Dashboard to display days until/since due
 */

/**
 * Parse a date string into year, month, day components.
 * Handles both ISO date strings (YYYY-MM-DD) and full ISO timestamps.
 * For date-only strings, parses as local date to avoid timezone issues.
 */
function parseDateComponents(dateStr: string): { year: number; month: number; day: number } {
  // Check if it's a date-only string (YYYY-MM-DD format)
  const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return {
      year: parseInt(dateOnlyMatch[1], 10),
      month: parseInt(dateOnlyMatch[2], 10) - 1, // JS months are 0-indexed
      day: parseInt(dateOnlyMatch[3], 10),
    };
  }

  // For full timestamps, parse with Date and extract local components
  const parsed = new Date(dateStr);
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
  };
}

/**
 * Calculate the number of days between two dates (ignoring time component)
 * Returns negative number for past dates, positive for future dates
 */
export function daysBetween(
  date: Date | string,
  referenceDate: Date = new Date(),
): number {
  // Get target date components
  let targetYear: number, targetMonth: number, targetDay: number;
  if (typeof date === "string") {
    const components = parseDateComponents(date);
    targetYear = components.year;
    targetMonth = components.month;
    targetDay = components.day;
  } else {
    targetYear = date.getFullYear();
    targetMonth = date.getMonth();
    targetDay = date.getDate();
  }

  // Normalize both dates to start of day in local time for consistent day-based calculations
  const targetDayDate = new Date(targetYear, targetMonth, targetDay);
  const refDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  const diffMs = targetDayDate.getTime() - refDay.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is overdue (in the past)
 */
export function isOverdue(
  date: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  if (!date) return false;
  return daysBetween(date, referenceDate) < 0;
}

/**
 * Check if a date is due today
 */
export function isDueToday(
  date: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  if (!date) return false;
  return daysBetween(date, referenceDate) === 0;
}

/**
 * Get the absolute number of days until a due date (future dates)
 * Returns 0 for today, positive number for future dates
 */
export function getDaysUntil(
  date: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!date) return null;
  const diff = daysBetween(date, referenceDate);
  return diff >= 0 ? diff : null;
}

/**
 * Get the absolute number of days since a due date passed (past dates)
 * Returns 0 for today, positive number for past dates
 */
export function getDaysSince(
  date: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!date) return null;
  const diff = daysBetween(date, referenceDate);
  return diff < 0 ? Math.abs(diff) : null;
}

/**
 * Format a due date as a human-readable string showing days until/since due
 * Examples: "Due today", "Due in 3 days", "5 days overdue", "Due tomorrow"
 */
export function formatDueDateStatus(
  date: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): string | null {
  if (!date) return null;

  const diff = daysBetween(date, referenceDate);

  if (diff === 0) {
    return "Due today";
  } else if (diff === 1) {
    return "Due tomorrow";
  } else if (diff === -1) {
    return "1 day overdue";
  } else if (diff > 1) {
    return `Due in ${diff} days`;
  } else {
    // diff < -1
    return `${Math.abs(diff)} days overdue`;
  }
}

/**
 * Get the urgency level of a due date for styling purposes
 * Returns: "overdue" | "today" | "soon" | "upcoming" | "future" | null
 * - overdue: past due
 * - today: due today
 * - soon: due within 3 days
 * - upcoming: due within 7 days
 * - future: due more than 7 days out
 */
export type DueDateUrgency =
  | "overdue"
  | "today"
  | "soon"
  | "upcoming"
  | "future"
  | null;

export function getDueDateUrgency(
  date: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): DueDateUrgency {
  if (!date) return null;

  const diff = daysBetween(date, referenceDate);

  if (diff < 0) {
    return "overdue";
  } else if (diff === 0) {
    return "today";
  } else if (diff <= 3) {
    return "soon";
  } else if (diff <= 7) {
    return "upcoming";
  } else {
    return "future";
  }
}

/**
 * Format a date string for use in HTML date inputs (YYYY-MM-DD).
 * Returns empty string for null/undefined input.
 */
export function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}
