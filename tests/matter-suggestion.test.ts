import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSuggestionContext,
  extractMatterIdFromRoute,
  findLastTimerMatter,
  findMostActiveMatterThisWeek,
  findRecentActivityMatter,
  getSuggestionReasonLabel,
  suggestMatter,
} from "@/lib/timer/suggest-matter";
import type { MatterSuggestionContext, TimeEntry } from "@/types/timer.types";

/**
 * Helper to create a time entry with matter_id and started_at
 */
function createTimeEntry(
  matterId: string,
  minutesAgo: number
): Pick<TimeEntry, "matter_id" | "started_at"> {
  const now = Date.now();
  const startedAt = new Date(now - minutesAgo * 60 * 1000);
  return {
    matter_id: matterId,
    started_at: startedAt.toISOString(),
  };
}

/**
 * Helper to create multiple time entries for a matter
 */
function createMultipleEntries(
  matterId: string,
  count: number,
  startingMinutesAgo: number
): Pick<TimeEntry, "matter_id" | "started_at">[] {
  const entries: Pick<TimeEntry, "matter_id" | "started_at">[] = [];
  for (let i = 0; i < count; i++) {
    entries.push(createTimeEntry(matterId, startingMinutesAgo + i * 60));
  }
  return entries;
}

describe("matter-suggestion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("extractMatterIdFromRoute", () => {
    it("extracts matter ID from /matters/[id]", () => {
      expect(extractMatterIdFromRoute("/matters/abc-123")).toBe("abc-123");
    });

    it("extracts matter ID from /matters/[id]/edit", () => {
      expect(extractMatterIdFromRoute("/matters/matter-456/edit")).toBe("matter-456");
    });

    it("extracts matter ID from /matters/[id]/time", () => {
      expect(extractMatterIdFromRoute("/matters/xyz-789/time")).toBe("xyz-789");
    });

    it("extracts matter ID from /matters/[id]/tasks", () => {
      expect(extractMatterIdFromRoute("/matters/task-matter/tasks")).toBe("task-matter");
    });

    it("extracts matter ID from /matters/[id]/billing", () => {
      expect(extractMatterIdFromRoute("/matters/billing-matter/billing")).toBe("billing-matter");
    });

    it("extracts matter ID from /matters/[id]/documents", () => {
      expect(extractMatterIdFromRoute("/matters/doc-matter/documents")).toBe("doc-matter");
    });

    it("returns null for non-matter routes", () => {
      expect(extractMatterIdFromRoute("/dashboard")).toBeNull();
      expect(extractMatterIdFromRoute("/clients")).toBeNull();
      expect(extractMatterIdFromRoute("/")).toBeNull();
    });

    it("returns null for /matters list page", () => {
      expect(extractMatterIdFromRoute("/matters")).toBeNull();
    });

    it("returns null for unsupported matter sub-routes", () => {
      expect(extractMatterIdFromRoute("/matters/abc/unknown")).toBeNull();
      expect(extractMatterIdFromRoute("/matters/abc/settings/advanced")).toBeNull();
    });

    it("handles UUID-format IDs", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(extractMatterIdFromRoute(`/matters/${uuid}`)).toBe(uuid);
    });

    it("handles alphanumeric IDs with hyphens", () => {
      expect(extractMatterIdFromRoute("/matters/abc-DEF-123")).toBe("abc-DEF-123");
    });

    it("returns null for paths with invalid characters in ID", () => {
      expect(extractMatterIdFromRoute("/matters/abc_def")).toBeNull();
      expect(extractMatterIdFromRoute("/matters/abc.def")).toBeNull();
    });
  });

  describe("findRecentActivityMatter", () => {
    it("returns matter ID from entry within 5 minutes", () => {
      const entries = [createTimeEntry("recent-matter", 2)]; // 2 minutes ago
      expect(findRecentActivityMatter(entries)).toBe("recent-matter");
    });

    it("returns matter ID for entry exactly at 5 minutes", () => {
      // 5 minutes ago is at the boundary (>= check includes it)
      const entries = [createTimeEntry("edge-matter", 5)];
      expect(findRecentActivityMatter(entries)).toBe("edge-matter");
    });

    it("returns null for entry just over 5 minutes", () => {
      // 5.1 minutes ago is outside the window
      const entries = [createTimeEntry("old-matter", 5.1)];
      expect(findRecentActivityMatter(entries)).toBeNull();
    });

    it("returns null for entry older than 5 minutes", () => {
      const entries = [createTimeEntry("old-matter", 10)]; // 10 minutes ago
      expect(findRecentActivityMatter(entries)).toBeNull();
    });

    it("returns null for empty entries array", () => {
      expect(findRecentActivityMatter([])).toBeNull();
    });

    it("returns most recent entry (first in sorted array)", () => {
      const entries = [
        createTimeEntry("most-recent", 1),
        createTimeEntry("older-but-recent", 3),
        createTimeEntry("oldest", 4),
      ];
      expect(findRecentActivityMatter(entries)).toBe("most-recent");
    });

    it("skips entries outside window even if others are inside", () => {
      // If first entry is outside window, function should return null
      // because entries are assumed sorted by recency
      const entries = [
        createTimeEntry("too-old", 10),
        createTimeEntry("recent-but-second", 2),
      ];
      // The algorithm breaks early if first entry is outside window
      expect(findRecentActivityMatter(entries)).toBeNull();
    });

    it("accepts custom time window", () => {
      const entries = [createTimeEntry("matter", 8)]; // 8 minutes ago
      // Default 5 min window - should be null
      expect(findRecentActivityMatter(entries)).toBeNull();
      // Custom 10 min window - should find it
      expect(findRecentActivityMatter(entries, 10 * 60 * 1000)).toBe("matter");
    });
  });

  describe("findLastTimerMatter", () => {
    it("returns matter ID from entry within 24 hours", () => {
      const entries = [createTimeEntry("last-timer-matter", 60)]; // 1 hour ago
      expect(findLastTimerMatter(entries)).toBe("last-timer-matter");
    });

    it("returns matter ID from entry at 23 hours", () => {
      const entries = [createTimeEntry("almost-day-old", 23 * 60)]; // 23 hours ago
      expect(findLastTimerMatter(entries)).toBe("almost-day-old");
    });

    it("returns matter ID for entry exactly at 24 hours", () => {
      // 24 hours ago is at the boundary (>= check includes it)
      const entries = [createTimeEntry("day-old", 24 * 60)]; // 24 hours ago
      expect(findLastTimerMatter(entries)).toBe("day-old");
    });

    it("returns null for entry just over 24 hours", () => {
      const entries = [createTimeEntry("old-matter", 24 * 60 + 1)]; // 24 hours + 1 minute ago
      expect(findLastTimerMatter(entries)).toBeNull();
    });

    it("returns null for entry older than 24 hours", () => {
      const entries = [createTimeEntry("old-matter", 25 * 60)]; // 25 hours ago
      expect(findLastTimerMatter(entries)).toBeNull();
    });

    it("returns null for empty entries array", () => {
      expect(findLastTimerMatter([])).toBeNull();
    });

    it("only checks the first (most recent) entry", () => {
      const entries = [
        createTimeEntry("too-old", 30 * 60), // 30 hours ago
        createTimeEntry("recent-but-second", 60), // 1 hour ago
      ];
      // Should return null because only first entry is checked
      expect(findLastTimerMatter(entries)).toBeNull();
    });
  });

  describe("findMostActiveMatterThisWeek", () => {
    it("returns matter with most entries in past 7 days", () => {
      const entries = [
        // Matter A: 3 entries
        ...createMultipleEntries("matter-a", 3, 60),
        // Matter B: 5 entries
        ...createMultipleEntries("matter-b", 5, 120),
        // Matter C: 2 entries
        ...createMultipleEntries("matter-c", 2, 200),
      ];
      expect(findMostActiveMatterThisWeek(entries)).toBe("matter-b");
    });

    it("returns null for empty entries array", () => {
      expect(findMostActiveMatterThisWeek([])).toBeNull();
    });

    it("excludes entries older than 7 days", () => {
      const entries = [
        // Old entries (8+ days ago) - should be ignored
        createTimeEntry("old-matter", 8 * 24 * 60),
        createTimeEntry("old-matter", 8 * 24 * 60 + 60),
        createTimeEntry("old-matter", 8 * 24 * 60 + 120),
        // Recent entry (1 hour ago)
        createTimeEntry("recent-matter", 60),
      ];
      expect(findMostActiveMatterThisWeek(entries)).toBe("recent-matter");
    });

    it("returns null when all entries are older than 7 days", () => {
      const entries = [
        createTimeEntry("old-1", 8 * 24 * 60),
        createTimeEntry("old-2", 9 * 24 * 60),
      ];
      expect(findMostActiveMatterThisWeek(entries)).toBeNull();
    });

    it("handles tie by returning first encountered matter with highest count", () => {
      // When two matters have the same count, the one encountered first in iteration wins
      const entries = [
        createTimeEntry("matter-a", 60),
        createTimeEntry("matter-b", 120),
        createTimeEntry("matter-a", 180),
        createTimeEntry("matter-b", 240),
      ];
      // Both have 2 entries, matter-a is encountered first
      expect(findMostActiveMatterThisWeek(entries)).toBe("matter-a");
    });

    it("correctly counts entries for the same matter", () => {
      const entries = [
        createTimeEntry("single-matter", 60),
        createTimeEntry("single-matter", 120),
        createTimeEntry("single-matter", 180),
      ];
      expect(findMostActiveMatterThisWeek(entries)).toBe("single-matter");
    });

    it("includes entries at exactly 7 days boundary", () => {
      // Entry at exactly 7 days ago is at the boundary (>= check includes it)
      const sevenDaysInMinutes = 7 * 24 * 60;
      const entries = [
        createTimeEntry("boundary-matter", sevenDaysInMinutes),
        createTimeEntry("recent-matter", 60),
      ];
      // Both have 1 entry each, boundary-matter is encountered first
      expect(findMostActiveMatterThisWeek(entries)).toBe("boundary-matter");
    });

    it("excludes entries just over 7 days boundary", () => {
      // Entry at 7 days + 1 minute ago should be outside the window
      const sevenDaysInMinutes = 7 * 24 * 60;
      const entries = [
        createTimeEntry("old-matter", sevenDaysInMinutes + 1),
        createTimeEntry("recent-matter", 60),
      ];
      expect(findMostActiveMatterThisWeek(entries)).toBe("recent-matter");
    });
  });

  describe("suggestMatter - priority hierarchy", () => {
    it("Priority 1: returns current page matter from route", () => {
      const context: MatterSuggestionContext = {
        pathname: "/matters/route-matter",
        routeMatterId: null,
        recentEntries: [
          createTimeEntry("recent-matter", 2),
          createTimeEntry("last-timer-matter", 60),
        ],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBe("route-matter");
      expect(result.reason).toBe("current_page");
    });

    it("Priority 1: prefers pre-extracted routeMatterId over pathname parsing", () => {
      const context: MatterSuggestionContext = {
        pathname: "/matters/pathname-matter",
        routeMatterId: "pre-extracted-matter",
        recentEntries: [],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBe("pre-extracted-matter");
      expect(result.reason).toBe("current_page");
    });

    it("Priority 2: returns recent activity matter when no route context", () => {
      const context: MatterSuggestionContext = {
        pathname: "/dashboard", // Non-matter route
        routeMatterId: null,
        recentEntries: [
          createTimeEntry("recent-matter", 2), // 2 minutes ago
          createTimeEntry("older-matter", 60),
        ],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBe("recent-matter");
      expect(result.reason).toBe("recent_activity");
    });

    it("Priority 3: returns last timer matter when no recent activity", () => {
      const context: MatterSuggestionContext = {
        pathname: "/dashboard",
        routeMatterId: null,
        recentEntries: [
          createTimeEntry("last-timer-matter", 60), // 1 hour ago (outside 5 min window)
        ],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBe("last-timer-matter");
      expect(result.reason).toBe("last_timer");
    });

    it("Priority 4: returns most active matter when no last timer within 24h", () => {
      const context: MatterSuggestionContext = {
        pathname: "/dashboard",
        routeMatterId: null,
        recentEntries: [
          // All entries are within past week but oldest entry is > 24h ago
          createTimeEntry("old-matter", 25 * 60), // 25 hours ago
          createTimeEntry("active-matter", 48 * 60), // 2 days ago
          createTimeEntry("active-matter", 50 * 60), // 2+ days ago
          createTimeEntry("active-matter", 52 * 60), // 2+ days ago
          createTimeEntry("old-matter", 60 * 60), // 2.5 days ago
        ],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBe("active-matter");
      expect(result.reason).toBe("most_active_this_week");
    });

    it("returns null when no context available", () => {
      const context: MatterSuggestionContext = {
        pathname: "/dashboard",
        routeMatterId: null,
        recentEntries: [],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBeNull();
      expect(result.reason).toBeNull();
    });

    it("returns null when all entries are too old", () => {
      const context: MatterSuggestionContext = {
        pathname: "/clients",
        routeMatterId: null,
        recentEntries: [
          createTimeEntry("ancient-matter", 10 * 24 * 60), // 10 days ago
        ],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBeNull();
      expect(result.reason).toBeNull();
    });
  });

  describe("suggestMatter - edge cases", () => {
    it("handles matter detail subpages correctly", () => {
      const subpages = ["/edit", "/time", "/tasks", "/billing", "/documents"];

      for (const subpage of subpages) {
        const context: MatterSuggestionContext = {
          pathname: `/matters/test-matter${subpage}`,
          routeMatterId: null,
          recentEntries: [],
        };

        const result = suggestMatter(context);
        expect(result.matterId).toBe("test-matter");
        expect(result.reason).toBe("current_page");
      }
    });

    it("handles empty string pathname", () => {
      const context: MatterSuggestionContext = {
        pathname: "",
        routeMatterId: null,
        recentEntries: [],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBeNull();
      expect(result.reason).toBeNull();
    });

    it("correctly transitions between priority levels", () => {
      // Test that when a higher priority fails, it correctly falls through
      const context: MatterSuggestionContext = {
        pathname: "/time-tracking", // Not a matter page
        routeMatterId: null,
        recentEntries: [
          // No entries within 5 minutes (priority 2 fails)
          // Entry within 24 hours (priority 3 succeeds)
          createTimeEntry("fallback-matter", 2 * 60), // 2 hours ago
        ],
      };

      const result = suggestMatter(context);

      expect(result.matterId).toBe("fallback-matter");
      expect(result.reason).toBe("last_timer");
    });
  });

  describe("getSuggestionReasonLabel", () => {
    it("returns correct label for current_page", () => {
      expect(getSuggestionReasonLabel("current_page")).toBe(
        "Suggested based on current page"
      );
    });

    it("returns correct label for recent_activity", () => {
      expect(getSuggestionReasonLabel("recent_activity")).toBe(
        "Suggested based on recent activity"
      );
    });

    it("returns correct label for last_timer", () => {
      expect(getSuggestionReasonLabel("last_timer")).toBe(
        "Suggested based on your last timer"
      );
    });

    it("returns correct label for most_active_this_week", () => {
      expect(getSuggestionReasonLabel("most_active_this_week")).toBe(
        "Suggested based on this week's activity"
      );
    });

    it("returns empty string for none", () => {
      expect(getSuggestionReasonLabel("none")).toBe("");
    });

    it("returns empty string for null", () => {
      expect(getSuggestionReasonLabel(null)).toBe("");
    });
  });

  describe("createSuggestionContext", () => {
    it("creates context with all provided values", () => {
      const entries = [createTimeEntry("matter-1", 60)];
      const context = createSuggestionContext("/matters/abc", "route-matter", entries);

      expect(context).toEqual({
        pathname: "/matters/abc",
        routeMatterId: "route-matter",
        recentEntries: entries,
      });
    });

    it("creates context with defaults for optional values", () => {
      const context = createSuggestionContext("/dashboard");

      expect(context).toEqual({
        pathname: "/dashboard",
        routeMatterId: null,
        recentEntries: [],
      });
    });

    it("handles null routeMatterId", () => {
      const context = createSuggestionContext("/dashboard", null);

      expect(context.routeMatterId).toBeNull();
    });

    it("handles undefined recentEntries", () => {
      const context = createSuggestionContext("/dashboard", "matter-id", undefined);

      expect(context.recentEntries).toEqual([]);
    });
  });

  describe("performance", () => {
    it("executes suggestMatter in under 100ms with large dataset", () => {
      // Create 1000 entries to simulate heavy usage
      const entries: Pick<TimeEntry, "matter_id" | "started_at">[] = [];
      for (let i = 0; i < 1000; i++) {
        entries.push(createTimeEntry(`matter-${i % 100}`, i * 10)); // Varied time distribution
      }

      const context: MatterSuggestionContext = {
        pathname: "/dashboard",
        routeMatterId: null,
        recentEntries: entries,
      };

      const start = performance.now();
      suggestMatter(context);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it("executes extractMatterIdFromRoute in under 1ms", () => {
      const iterations = 1000;
      const paths = [
        "/matters/abc-123",
        "/matters/xyz/edit",
        "/dashboard",
        "/matters/long-uuid-like-id-here/tasks",
      ];

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const path of paths) {
          extractMatterIdFromRoute(path);
        }
      }
      const duration = performance.now() - start;

      // Average per call should be well under 1ms
      const avgPerCall = duration / (iterations * paths.length);
      expect(avgPerCall).toBeLessThan(1);
    });

    it("handles empty entries array efficiently", () => {
      const context: MatterSuggestionContext = {
        pathname: "/dashboard",
        routeMatterId: null,
        recentEntries: [],
      };

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        suggestMatter(context);
      }
      const duration = performance.now() - start;

      // 10000 calls should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe("integration scenarios", () => {
    it("typical workflow: user on matter page starts timer", () => {
      const context: MatterSuggestionContext = {
        pathname: "/matters/client-case-123/time",
        routeMatterId: null,
        recentEntries: [
          createTimeEntry("different-matter", 30), // 30 min ago
        ],
      };

      const result = suggestMatter(context);

      // Should suggest the matter from the current page, not recent activity
      expect(result.matterId).toBe("client-case-123");
      expect(result.reason).toBe("current_page");
    });

    it("typical workflow: user on dashboard resumes work from earlier", () => {
      const context: MatterSuggestionContext = {
        pathname: "/dashboard",
        routeMatterId: null,
        recentEntries: [
          createTimeEntry("morning-work", 3 * 60), // 3 hours ago
        ],
      };

      const result = suggestMatter(context);

      // Should suggest the last timer matter
      expect(result.matterId).toBe("morning-work");
      expect(result.reason).toBe("last_timer");
    });

    it("typical workflow: user frequently works on same matter throughout week", () => {
      const context: MatterSuggestionContext = {
        pathname: "/clients",
        routeMatterId: null,
        recentEntries: [
          // Oldest entry (most recent) is 2 days ago
          createTimeEntry("primary-client", 48 * 60),
          createTimeEntry("primary-client", 72 * 60),
          createTimeEntry("primary-client", 96 * 60),
          createTimeEntry("secondary-client", 100 * 60),
        ],
      };

      const result = suggestMatter(context);

      // Should suggest the most frequently worked matter this week
      expect(result.matterId).toBe("primary-client");
      expect(result.reason).toBe("most_active_this_week");
    });

    it("typical workflow: brand new user with no history", () => {
      const context: MatterSuggestionContext = {
        pathname: "/",
        routeMatterId: null,
        recentEntries: [],
      };

      const result = suggestMatter(context);

      // Should return null - user must manually select
      expect(result.matterId).toBeNull();
      expect(result.reason).toBeNull();
    });

    it("typical workflow: user on matter page with exact match in recent entries", () => {
      const context: MatterSuggestionContext = {
        pathname: "/matters/same-matter",
        routeMatterId: null,
        recentEntries: [
          createTimeEntry("same-matter", 2), // Same matter, also recent
        ],
      };

      const result = suggestMatter(context);

      // Route context should take priority even if recent entries have same matter
      expect(result.matterId).toBe("same-matter");
      expect(result.reason).toBe("current_page");
    });
  });
});
