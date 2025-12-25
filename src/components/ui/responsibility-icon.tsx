import { User, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsibilityIconProps {
  responsibleParty: "lawyer" | "staff" | "client";
  className?: string;
  showLabel?: boolean;
}

export function ResponsibilityIcon({
  responsibleParty,
  className,
  showLabel = false,
}: ResponsibilityIconProps) {
  const isClient = responsibleParty === "client";
  const Icon = isClient ? Mail : User;
  const label = isClient ? "Client's turn" : "Your turn";
  const colorClass = isClient
    ? "text-blue-600 dark:text-blue-400"
    : "text-amber-600 dark:text-amber-400";

  if (showLabel) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", colorClass, className)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }

  return <Icon className={cn("h-4 w-4", colorClass, className)} />;
}
