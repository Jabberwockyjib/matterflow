import * as React from "react";
import { cn } from "@/lib/utils";

export const ContentCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative overflow-hidden rounded-xl border-2 border-border bg-white shadow-md",
      className
    )}
    {...props}
  >
    {/* Decorative corner accent */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />

    {/* Content wrapper to ensure content appears above accent */}
    <div className="relative">{props.children}</div>
  </div>
));
ContentCard.displayName = "ContentCard";

export const ContentCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pb-3", className)} {...props} />
));
ContentCardHeader.displayName = "ContentCardHeader";

export const ContentCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-xl font-lora font-bold", className)} {...props} />
));
ContentCardTitle.displayName = "ContentCardTitle";

export const ContentCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
ContentCardDescription.displayName = "ContentCardDescription";

export const ContentCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
ContentCardContent.displayName = "ContentCardContent";

export const ContentCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
));
ContentCardFooter.displayName = "ContentCardFooter";
