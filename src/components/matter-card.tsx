import Link from "next/link";
import type { MatterSummary } from "@/lib/data/queries";
import {
  formatDueDateStatus,
  getDueDateUrgency,
  type DueDateUrgency,
} from "@/lib/utils/date-helpers";

export type MatterCardProps = {
  matter: MatterSummary;
};

/**
 * Get Tailwind CSS classes for due date urgency badge styling
 */
function getUrgencyClasses(urgency: DueDateUrgency): string {
  switch (urgency) {
    case "overdue":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "today":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "soon":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "upcoming":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "future":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

/**
 * MatterCard component displays essential matter information in a card format.
 * Used in the Matter Status Dashboard kanban columns.
 *
 * Displays:
 * - Client name
 * - Matter type
 * - Next action summary
 * - Days until/since due date with visual urgency indicators
 *
 * Clicking the card navigates to the matter detail page.
 */
export function MatterCard({ matter }: MatterCardProps) {
  const dueDateStatus = formatDueDateStatus(matter.dueDate);
  const urgency = getDueDateUrgency(matter.dueDate);
  const urgencyClasses = getUrgencyClasses(urgency);

  return (
    <Link
      href={`/matters/${matter.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
      data-testid="matter-card"
    >
      {/* Client Name */}
      <p
        className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
        title={matter.clientName ?? undefined}
        data-testid="matter-card-client"
      >
        {matter.clientName || "No client assigned"}
      </p>

      {/* Matter Type Badge */}
      <span
        className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        data-testid="matter-card-type"
      >
        {matter.matterType}
      </span>

      {/* Next Action Summary */}
      <p
        className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400"
        title={matter.nextAction ?? undefined}
        data-testid="matter-card-next-action"
      >
        {matter.nextAction || "No next action"}
      </p>

      {/* Due Date Status */}
      {dueDateStatus && (
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${urgencyClasses}`}
          data-testid="matter-card-due-date"
        >
          {dueDateStatus}
        </span>
      )}
    </Link>
  );
}
