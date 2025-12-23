/**
 * Duration Parser Utility
 *
 * Parses natural language duration strings into minutes.
 * Supports formats: '1h', '1.5h', '90m', '1:30', '2h30m'
 */

export type ParsedDuration = {
  minutes: number;
  isValid: true;
} | {
  minutes: null;
  isValid: false;
  error: string;
};

/**
 * Parses a duration string into minutes.
 *
 * Supported formats:
 * - Hours: '1h', '1.5h', '2.5h'
 * - Minutes: '30m', '90m', '120m'
 * - Time notation: '1:30', '2:15', '0:45'
 * - Combined: '1h30m', '2h15m'
 *
 * @param input - The duration string to parse
 * @returns The duration in minutes, or null if invalid
 */
export function parseDuration(input: string): number | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim().toLowerCase();

  if (trimmed === "") {
    return null;
  }

  // Combined format: '1h30m', '2h15m'
  const combinedMatch = trimmed.match(/^(\d+)h(\d+)m$/);
  if (combinedMatch) {
    const hours = parseInt(combinedMatch[1], 10);
    const minutes = parseInt(combinedMatch[2], 10);
    if (minutes >= 60) {
      return null; // Invalid: minutes should be < 60 in combined format
    }
    return hours * 60 + minutes;
  }

  // Hours format: '1h', '1.5h', '2.5h'
  const hourMatch = trimmed.match(/^(\d+\.?\d*)h$/);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    if (isNaN(hours) || hours < 0) {
      return null;
    }
    return Math.round(hours * 60);
  }

  // Minutes format: '30m', '90m'
  const minuteMatch = trimmed.match(/^(\d+)m$/);
  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1], 10);
    if (isNaN(minutes) || minutes < 0) {
      return null;
    }
    return minutes;
  }

  // Time notation: '1:30', '2:15', '0:45'
  const timeMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
      return null;
    }
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Parses a duration string and returns a detailed result object.
 *
 * @param input - The duration string to parse
 * @returns An object with parsed minutes and validity status
 */
export function parseDurationWithValidation(input: string): ParsedDuration {
  const minutes = parseDuration(input);

  if (minutes === null) {
    return {
      minutes: null,
      isValid: false,
      error: "Invalid format. Try: 1h, 1.5h, 90m, 1:30, or 1h30m",
    };
  }

  return {
    minutes,
    isValid: true,
  };
}

/**
 * Formats minutes back into a human-readable duration string.
 *
 * @param minutes - The duration in minutes
 * @returns A formatted string like '1h 30m' or '45m'
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0 || !Number.isFinite(minutes)) {
    return "";
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}
