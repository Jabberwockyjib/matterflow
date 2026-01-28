import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, helper, icon: Icon, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-border bg-white shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {/* Decorative corner accent with icon integration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/8 to-transparent rounded-bl-full" />
      {Icon && (
        <div className="absolute top-4 right-4 text-primary/30">
          <Icon className="h-7 w-7" />
        </div>
      )}

      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative p-5 pb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="mt-2 text-3xl font-lora font-bold text-foreground tabular-nums">
          {value}
        </p>
      </div>
      {helper && (
        <div className="relative px-5 pb-5 pt-0">
          <p className="text-sm text-muted-foreground">{helper}</p>
        </div>
      )}
    </div>
  );
}
