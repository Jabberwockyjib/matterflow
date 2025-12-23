import type { MatterSummary } from "@/lib/data/queries";
import type { StatusCategory } from "@/lib/utils/matter-helpers";
import { MatterCard } from "./matter-card";

export type DashboardColumnProps = {
  title: string;
  statusCategory: StatusCategory;
  matters: MatterSummary[];
};

/**
 * Get Tailwind CSS classes for column header styling based on status category
 */
function getColumnHeaderClasses(category: StatusCategory): string {
  switch (category) {
    case "Active":
      return "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300";
    case "Waiting on Client":
      return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300";
    case "Waiting on Court":
      return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300";
    case "Complete":
      return "bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-400";
    case "On Hold":
      return "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300";
    default:
      return "bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300";
  }
}

/**
 * Get Tailwind CSS classes for count badge styling based on status category
 */
function getCountBadgeClasses(category: StatusCategory): string {
  switch (category) {
    case "Active":
      return "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100";
    case "Waiting on Client":
      return "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100";
    case "Waiting on Court":
      return "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100";
    case "Complete":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
    case "On Hold":
      return "bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100";
    default:
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
  }
}

/**
 * DashboardColumn component displays a vertical column of matter cards
 * grouped by status category in the Matter Status Dashboard.
 *
 * Features:
 * - Column header with title and count badge
 * - Vertical stack of MatterCard components
 * - Empty state message when no matters in column
 * - Color-coded styling per status category
 */
export function DashboardColumn({
  title,
  statusCategory,
  matters,
}: DashboardColumnProps) {
  const headerClasses = getColumnHeaderClasses(statusCategory);
  const badgeClasses = getCountBadgeClasses(statusCategory);
  const isEmpty = matters.length === 0;

  return (
    <div
      className="flex min-w-[280px] flex-col"
      data-testid="dashboard-column"
      data-status-category={statusCategory}
    >
      {/* Column Header */}
      <div
        className={`mb-3 flex items-center justify-between rounded-lg border px-3 py-2 ${headerClasses}`}
        data-testid="dashboard-column-header"
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        <span
          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClasses}`}
          data-testid="dashboard-column-count"
        >
          {matters.length}
        </span>
      </div>

      {/* Matter Cards Stack */}
      <div
        className="flex flex-1 flex-col gap-3"
        data-testid="dashboard-column-content"
      >
        {isEmpty ? (
          <div
            className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400"
            data-testid="dashboard-column-empty"
          >
            No matters
          </div>
        ) : (
          matters.map((matter) => (
            <MatterCard key={matter.id} matter={matter} />
          ))
        )}
      </div>
    </div>
  );
}
