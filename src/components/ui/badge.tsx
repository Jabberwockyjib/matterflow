import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-100 text-slate-900",
        success: "border-transparent bg-cyan-50 text-cyan-700",
        warning: "border-transparent bg-amber-50 text-amber-700",
        danger: "border-transparent bg-rose-50 text-rose-700",
        outline: "border-slate-200 text-slate-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
