import { cn } from "@/lib/utils";

interface StageBadgeProps {
  stage: string;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const colors = getStageColors(stage);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors,
        className
      )}
    >
      {stage}
    </span>
  );
}

function getStageColors(stage: string): string {
  switch (stage) {
    case "Lead Created":
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
    case "Intake Sent":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "Intake Received":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "Waiting on Client":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Under Review":
    case "Conflict Check":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "Draft Ready":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "Sent to Client":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "Billing Pending":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "Completed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    case "Archived":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
  }
}
