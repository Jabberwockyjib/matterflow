import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with clsx for conditional className handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a date is overdue (in the past compared to today)
 * Compares dates in UTC to ensure consistent behavior across timezones
 * @param date - ISO 8601 date string (YYYY-MM-DD)
 * @returns true if the date is before today, false otherwise
 */
export function isOverdue(date: string): boolean {
  // Get today's date in YYYY-MM-DD format (local timezone)
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Compare ISO date strings directly (YYYY-MM-DD format)
  return date < todayStr;
}

/**
 * Formats a date string for display
 * @param date - ISO 8601 date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Dec 23, 2025")
 */
export function formatDueDate(date: string): string {
  const dateObj = new Date(date + "T00:00:00");
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns CSS classes for due date styling based on overdue status
 * @param date - ISO 8601 date string (YYYY-MM-DD)
 * @returns CSS class string for styling (red for overdue, default otherwise)
 */
export function dueDateClass(date: string): string {
  if (isOverdue(date)) {
    return "border-red-300 bg-red-50";
  }
  return "";
}