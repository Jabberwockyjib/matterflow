import * as React from "react";
import Link from "next/link";
import type { MatterSummary } from "@/lib/data/queries";
import { cn, isOverdue, formatDueDate } from "@/lib/utils";
import {
  formatDueDateStatus,
  getDueDateUrgency,
  type DueDateUrgency,
} from "@/lib/utils/date-helpers";

export type MatterCardProps = {
  matter: MatterSummary;
  className?: string;
  style?: React.CSSProperties;
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
 * Get Tailwind CSS classes for responsible party badge styling
 */
function responsiblePartyColor(party: string): string {
  switch (party) {
    case "lawyer":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "staff":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200";
    case "client":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
  }
}

/**
 * MatterCard component displays essential matter information in a card format.
 * Used in the Matter Status Dashboard kanban columns, the main dashboard,
 * and the matters list page.
 *
 * Displays:
 * - Client name
 * - Matter type, stage, and billing model
 * - Next action summary with responsible party badge
 * - Due date with urgency indicators
 * - Overdue visual treatment (red border + warning icon)
 *
 * Clicking the card navigates to the matter detail page.
 */
export function MatterCard({ matter, className, style }: MatterCardProps) {
  const dueDateStatus = formatDueDateStatus(matter.dueDate);
  const urgency = getDueDateUrgency(matter.dueDate);
  const urgencyClasses = getUrgencyClasses(urgency);
  const overdue = isOverdue(matter.nextActionDueDate);

  return (
    <Link
      href={`/matters/${matter.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border-2 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2",
        overdue
          ? "border-red-400 bg-red-50 shadow-lg ring-2 ring-red-400/30 dark:border-red-700 dark:bg-red-950"
          : "border-border shadow-md dark:border-zinc-700 dark:bg-zinc-900",
        className
      )}
      style={style}
      data-testid="matter-card"
    >
      {/* Decorative corner accent */}
      {overdue ? (
        <>
          <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-1.5 bg-red-500 transform rotate-45 origin-top-right" style={{ top: '12px' }} />
            <div className="absolute top-0 right-0 w-32 h-1.5 bg-red-500 transform rotate-45 origin-top-right" style={{ top: '16px' }} />
            <div className="absolute top-0 right-0 w-32 h-1.5 bg-red-500 transform rotate-45 origin-top-right" style={{ top: '20px' }} />
            <div className="absolute top-0 right-0 w-32 h-1.5 bg-red-500 transform rotate-45 origin-top-right" style={{ top: '24px' }} />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/15 to-transparent rounded-bl-full" />
        </>
      ) : (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
      )}

      {/* Content */}
      <div className="relative p-4">
        {/* Matter Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex-1">
            {/* Client Name */}
            <p
              className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
              title={matter.clientName ?? undefined}
              data-testid="matter-card-client"
            >
              {matter.clientName || "No client assigned"}
            </p>
            {/* Matter Type / Stage / Billing */}
            <p className="mt-0.5 text-sm text-muted-foreground">
              {matter.matterType && `${matter.matterType} \u2022 `}
              {matter.stage}
              {matter.billingModel && ` \u2022 ${matter.billingModel}`}
            </p>
          </div>

          {/* Due Date Badge */}
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              overdue
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                : urgencyClasses
            )}
            data-testid="matter-card-due-date"
          >
            {overdue && (
              <svg
                className="mr-1 h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {dueDateStatus || `Due: ${formatDueDate(matter.nextActionDueDate)}`}
          </span>
        </div>

        {/* Next Action Section */}
        <div className="rounded-md bg-stone-50 p-3 dark:bg-stone-800">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Next Action
              </p>
              <p
                className="mt-1 line-clamp-2 text-sm text-foreground"
                title={matter.nextAction ?? undefined}
                data-testid="matter-card-next-action"
              >
                {matter.nextAction || "No next action"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Responsible
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  responsiblePartyColor(matter.responsibleParty)
                )}
              >
                {matter.responsibleParty}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Metadata */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span data-testid="matter-card-type">
            {matter.matterType}
          </span>
          <span>
            Updated{" "}
            {new Date(matter.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}
