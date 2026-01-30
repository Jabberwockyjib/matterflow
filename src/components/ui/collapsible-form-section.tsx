"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContentCard,
  ContentCardContent,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";

interface CollapsibleFormSectionProps {
  title: string;
  triggerLabel: string;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function CollapsibleFormSection({
  title,
  triggerLabel,
  children,
  onOpenChange,
  defaultOpen = false,
}: CollapsibleFormSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <div className="space-y-4">
      {!isOpen && (
        <Button onClick={() => handleOpenChange(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      )}

      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <ContentCard className="animate-fade-in">
            <ContentCardHeader className="flex flex-row items-center justify-between pb-2">
              <ContentCardTitle>{title}</ContentCardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </ContentCardHeader>
            <ContentCardContent>{children}</ContentCardContent>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}

export function useCollapsibleForm() {
  const [isOpen, setIsOpen] = React.useState(false);

  const close = React.useCallback(() => setIsOpen(false), []);
  const open = React.useCallback(() => setIsOpen(true), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, setIsOpen, close, open, toggle };
}
