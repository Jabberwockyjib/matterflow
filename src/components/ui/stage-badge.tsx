import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StageBadgeProps {
  stage: string;
  className?: string;
}

const stageColors: Record<string, string> = {
  "Lead Created": "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
  "Intake Sent": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Intake Received": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Waiting on Client": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Under Review": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Conflict Check": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Draft Ready": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Sent to Client": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Billing Pending": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Completed": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  "Archived": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500",
  "Declined": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function getStageColors(stage: string): string {
  return stageColors[stage] || "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(getStageColors(stage), "border-0", className)}
    >
      {stage}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Workflow Status Badge (for intake / info-request statuses)
// ---------------------------------------------------------------------------

interface WorkflowStatusBadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  responded: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
};

export function getStatusColors(status: string): string {
  return statusColors[status] || "bg-slate-100 text-slate-700";
}

export function WorkflowStatusBadge({ status, className }: WorkflowStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(getStatusColors(status), "border-0", className)}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
