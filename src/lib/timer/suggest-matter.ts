/**
 * Smart Matter Suggestion Algorithm
 *
 * This module implements a context-aware matter suggestion algorithm
 * for the 2-click time tracking system. It uses a priority hierarchy
 * to suggest the most relevant matter based on user context.
 *
 * Priority Hierarchy:
 * 1. Current page context (matter ID from route)
 * 2. Recent activity (time entry within last 5 minutes)
 * 3. Last timer matter (within 24 hours)
 * 4. Most active matter this week
 *
 * Performance target: < 100ms execution time
 */

import type {
  MatterSuggestion,
  MatterSuggestionContext,
  MatterSuggestionReason,
  TimeEntry,
} from "@/types/timer.types";

/**
 * Time constants in milliseconds
 */
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Route patterns for extracting matter ID from URLs
 */
const MATTER_ROUTE_PATTERNS = [
  // /matters/[id] - Matter detail page
  /^\/matters\/([a-zA-Z0-9-]+)$/,
  // /matters/[id]/edit - Matter edit page
  /^\/matters\/([a-zA-Z0-9-]+)\/edit$/,
  // /matters/[id]/time - Matter time entries page
  /^\/matters\/([a-zA-Z0-9-]+)\/time$/,
  // /matters/[id]/tasks - Matter tasks page
  /^\/matters\/([a-zA-Z0-9-]+)\/tasks$/,
  // /matters/[id]/billing - Matter billing page
  /^\/matters\/([a-zA-Z0-9-]+)\/billing$/,
  // /matters/[id]/documents - Matter documents page
  /^\/matters\/([a-zA-Z0-9-]+)\/documents$/,
];

/**
 * Extract matter ID from a route pathname.
 *
 * Checks if the current route is a matter-related page and extracts
 * the matter ID from the URL path.
 *
 * @param pathname - The current route pathname
 * @returns The matter ID if found, null otherwise
 */
export function extractMatterIdFromRoute(pathname: string): string | null {
  for (const pattern of MATTER_ROUTE_PATTERNS) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Find the most recent time entry within a given time window.
 *
 * @param entries - Array of time entries with matter_id and started_at
 * @param windowMs - Time window in milliseconds (default: 5 minutes)
 * @returns The matter ID of the most recent entry within the window, or null
 */
export function findRecentActivityMatter(
  entries: Pick<TimeEntry, "matter_id" | "started_at">[],
  windowMs: number = FIVE_MINUTES_MS
): string | null {
  if (entries.length === 0) return null;

  const now = Date.now();
  const windowStart = now - windowMs;

  // Entries should already be sorted by recency, but we filter by time window
  for (const entry of entries) {
    const entryTime = new Date(entry.started_at).getTime();

    // If entry is within the time window, return its matter ID
    if (entryTime >= windowStart) {
      return entry.matter_id;
    }

    // Since entries are sorted by recency, if this entry is outside
    // the window, all subsequent entries will also be outside
    break;
  }

  return null;
}

/**
 * Find the matter from the last timer entry within 24 hours.
 *
 * @param entries - Array of time entries with matter_id and started_at
 * @returns The matter ID of the last timer if within 24 hours, or null
 */
export function findLastTimerMatter(
  entries: Pick<TimeEntry, "matter_id" | "started_at">[]
): string | null {
  if (entries.length === 0) return null;

  const now = Date.now();
  const windowStart = now - TWENTY_FOUR_HOURS_MS;

  // Get the most recent entry (first in sorted array)
  const lastEntry = entries[0];
  if (!lastEntry) return null;

  const entryTime = new Date(lastEntry.started_at).getTime();

  // Check if within 24-hour window
  if (entryTime >= windowStart) {
    return lastEntry.matter_id;
  }

  return null;
}

/**
 * Find the most active matter this week based on entry count.
 *
 * Analyzes time entries from the last 7 days and returns the matter
 * with the highest number of entries.
 *
 * @param entries - Array of time entries with matter_id and started_at
 * @returns The most active matter ID, or null if no entries
 */
export function findMostActiveMatterThisWeek(
  entries: Pick<TimeEntry, "matter_id" | "started_at">[]
): string | null {
  if (entries.length === 0) return null;

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Count entries per matter within the last week
  const matterCounts = new Map<string, number>();

  for (const entry of entries) {
    const entryTime = new Date(entry.started_at).getTime();

    if (entryTime >= oneWeekAgo) {
      const count = matterCounts.get(entry.matter_id) ?? 0;
      matterCounts.set(entry.matter_id, count + 1);
    }
  }

  // Find the matter with the highest count
  let mostActiveMatter: string | null = null;
  let highestCount = 0;

  for (const [matterId, count] of matterCounts) {
    if (count > highestCount) {
      highestCount = count;
      mostActiveMatter = matterId;
    }
  }

  return mostActiveMatter;
}

/**
 * Suggest the most relevant matter based on the provided context.
 *
 * Implements a priority hierarchy for matter suggestion:
 * 1. Current page context (matter ID from route)
 * 2. Recent activity (time entry within last 5 minutes)
 * 3. Last timer matter (within 24 hours)
 * 4. Most active matter this week
 *
 * @param context - The current user context including route and recent entries
 * @returns A suggestion with matter ID and reason, or null values if no suggestion
 */
export function suggestMatter(context: MatterSuggestionContext): MatterSuggestion {
  // Priority 1: Current page context - extract from route
  const routeMatterId =
    context.routeMatterId ?? extractMatterIdFromRoute(context.pathname);

  if (routeMatterId) {
    return {
      matterId: routeMatterId,
      reason: "current_page",
    };
  }

  // Priority 2: Recent activity (within last 5 minutes)
  const recentMatterId = findRecentActivityMatter(context.recentEntries);

  if (recentMatterId) {
    return {
      matterId: recentMatterId,
      reason: "recent_activity",
    };
  }

  // Priority 3: Last timer's matter (within 24 hours)
  const lastTimerMatterId = findLastTimerMatter(context.recentEntries);

  if (lastTimerMatterId) {
    return {
      matterId: lastTimerMatterId,
      reason: "last_timer",
    };
  }

  // Priority 4: Most active matter this week
  const mostActiveMatterId = findMostActiveMatterThisWeek(context.recentEntries);

  if (mostActiveMatterId) {
    return {
      matterId: mostActiveMatterId,
      reason: "most_active_this_week",
    };
  }

  // No suggestion available
  return {
    matterId: null,
    reason: null,
  };
}

/**
 * Get the human-readable label for a suggestion reason.
 *
 * @param reason - The suggestion reason
 * @returns A user-friendly description of why the matter was suggested
 */
export function getSuggestionReasonLabel(reason: MatterSuggestionReason | null): string {
  switch (reason) {
    case "current_page":
      return "Suggested based on current page";
    case "recent_activity":
      return "Suggested based on recent activity";
    case "last_timer":
      return "Suggested based on your last timer";
    case "most_active_this_week":
      return "Suggested based on this week's activity";
    case "none":
    case null:
      return "";
    default:
      return "";
  }
}

/**
 * Create a suggestion context from available data.
 *
 * Helper function to construct the context object needed for suggestion.
 *
 * @param pathname - Current route pathname
 * @param routeMatterId - Pre-extracted matter ID from route params (optional)
 * @param recentEntries - Array of recent time entries (optional)
 * @returns A fully formed MatterSuggestionContext
 */
export function createSuggestionContext(
  pathname: string,
  routeMatterId?: string | null,
  recentEntries?: Pick<TimeEntry, "matter_id" | "started_at">[]
): MatterSuggestionContext {
  return {
    pathname,
    routeMatterId: routeMatterId ?? null,
    recentEntries: recentEntries ?? [],
  };
}
