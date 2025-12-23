/**
 * Matter helper functions for status grouping and mapping
 * Used by the Matter Status Dashboard to organize matters into kanban columns
 */

import type { MatterSummary } from "@/lib/data/queries";

/**
 * Status categories for dashboard columns
 * These represent the high-level groupings displayed in the kanban view
 */
export const STATUS_CATEGORIES = [
  "Active",
  "Waiting on Client",
  "Waiting on Court",
  "Complete",
  "On Hold",
] as const;

export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

/**
 * Mapping of stage values to status categories
 * Unknown stages default to "Active"
 */
const STAGE_TO_CATEGORY: Record<string, StatusCategory> = {
  // Active stages
  "Active": "Active",
  "Under Review": "Active",
  "In Progress": "Active",
  "Drafting": "Active",
  "Review": "Active",
  "New": "Active",
  "Open": "Active",

  // Waiting on Client
  "Waiting on Client": "Waiting on Client",
  "Pending Client": "Waiting on Client",
  "Client Review": "Waiting on Client",
  "Awaiting Client": "Waiting on Client",
  "Needs Client Input": "Waiting on Client",

  // Waiting on Court
  "Waiting on Court": "Waiting on Court",
  "Court Review": "Waiting on Court",
  "Filed": "Waiting on Court",
  "Pending Court": "Waiting on Court",
  "Awaiting Court": "Waiting on Court",

  // Complete
  "Complete": "Complete",
  "Completed": "Complete",
  "Closed": "Complete",
  "Done": "Complete",
  "Resolved": "Complete",
  "Finished": "Complete",

  // On Hold
  "On Hold": "On Hold",
  "Hold": "On Hold",
  "Paused": "On Hold",
  "Suspended": "On Hold",
  "Inactive": "On Hold",
};

/**
 * Get the status category for a given stage value
 * Unknown stages default to "Active"
 */
export function getStatusCategory(stage: string): StatusCategory {
  return STAGE_TO_CATEGORY[stage] ?? "Active";
}

/**
 * Type for matters grouped by status category
 */
export type GroupedMatters = Record<StatusCategory, MatterSummary[]>;

/**
 * Create an empty grouped matters object with all categories initialized
 */
export function createEmptyGroupedMatters(): GroupedMatters {
  return {
    "Active": [],
    "Waiting on Client": [],
    "Waiting on Court": [],
    "Complete": [],
    "On Hold": [],
  };
}

/**
 * Group an array of matters by their status category
 * Returns an object with all status categories as keys, each containing an array of matters
 */
export function groupMattersByStatus(matters: MatterSummary[]): GroupedMatters {
  const grouped = createEmptyGroupedMatters();

  for (const matter of matters) {
    const category = getStatusCategory(matter.stage);
    grouped[category].push(matter);
  }

  return grouped;
}

/**
 * Get the count of matters in each status category
 */
export function getMatterCountsByStatus(
  matters: MatterSummary[],
): Record<StatusCategory, number> {
  const grouped = groupMattersByStatus(matters);
  return {
    "Active": grouped["Active"].length,
    "Waiting on Client": grouped["Waiting on Client"].length,
    "Waiting on Court": grouped["Waiting on Court"].length,
    "Complete": grouped["Complete"].length,
    "On Hold": grouped["On Hold"].length,
  };
}

/**
 * Get all unique stages from an array of matters
 * Useful for populating filter dropdowns
 */
export function getUniqueStages(matters: MatterSummary[]): string[] {
  const stages = new Set(matters.map((m) => m.stage));
  return Array.from(stages).sort();
}

/**
 * Get all unique matter types from an array of matters
 * Useful for populating filter dropdowns
 */
export function getUniqueMatterTypes(matters: MatterSummary[]): string[] {
  const types = new Set(matters.map((m) => m.matterType));
  return Array.from(types).sort();
}

/**
 * Filter matters by one or more status categories
 */
export function filterMattersByCategories(
  matters: MatterSummary[],
  categories: StatusCategory[],
): MatterSummary[] {
  if (categories.length === 0) {
    return matters;
  }
  return matters.filter((m) => categories.includes(getStatusCategory(m.stage)));
}

/**
 * Sort matters within a category by due date (earliest first, null last)
 */
export function sortMattersByDueDate(matters: MatterSummary[]): MatterSummary[] {
  return [...matters].sort((a, b) => {
    // Null due dates go to the end
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    // Sort by date (earliest first)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

/**
 * Group matters by status and sort each group by due date
 */
export function groupAndSortMatters(matters: MatterSummary[]): GroupedMatters {
  const grouped = groupMattersByStatus(matters);

  return {
    "Active": sortMattersByDueDate(grouped["Active"]),
    "Waiting on Client": sortMattersByDueDate(grouped["Waiting on Client"]),
    "Waiting on Court": sortMattersByDueDate(grouped["Waiting on Court"]),
    "Complete": sortMattersByDueDate(grouped["Complete"]),
    "On Hold": sortMattersByDueDate(grouped["On Hold"]),
  };
}
