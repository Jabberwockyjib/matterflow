"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchMatters, type MatterSearchResult } from "@/lib/data/actions";

export interface MatterSearchProps {
  id?: string;
  value?: string;
  onValueChange?: (matterId: string, matter: MatterSearchResult | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  "aria-required"?: boolean | "true" | "false";
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const DEBOUNCE_MS = 300;

export function MatterSearch({
  id,
  value,
  onValueChange,
  placeholder = "Select matter...",
  searchPlaceholder = "Search matters...",
  emptyText = "No matters found.",
  className,
  disabled = false,
  "aria-required": ariaRequired,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: MatterSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<MatterSearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedMatter, setSelectedMatter] =
    React.useState<MatterSearchResult | null>(null);

  // Generate unique IDs for accessibility
  const listboxId = id ? `${id}-listbox` : "matter-search-listbox";
  const statusId = id ? `${id}-status` : "matter-search-status";

  // Debounced search effect
  React.useEffect(() => {
    // Skip search if query is too short
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await searchMatters(query);
        setResults(response.data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Load initial results when popover opens (if no query)
  React.useEffect(() => {
    if (open && query.length < 2) {
      setIsLoading(true);
      searchMatters("")
        .then((response) => {
          setResults(response.data);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, query.length]);

  const handleSelect = (matterId: string) => {
    const matter = results.find((m) => m.id === matterId) ?? null;
    const newValue = matterId === value ? "" : matterId;

    setSelectedMatter(newValue ? matter : null);
    onValueChange?.(newValue, newValue ? matter : null);
    setOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Open on arrow down when closed
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
    }
    // Close on Escape
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const displayLabel = selectedMatter?.title ?? placeholder;

  // Build aria-describedby including status announcements
  const combinedAriaDescribedBy = [ariaDescribedBy, statusId]
    .filter(Boolean)
    .join(" ");

  // Generate status message for screen readers
  const getStatusMessage = (): string => {
    if (isLoading) {
      return "Searching for matters...";
    }
    if (query.length < 2 && results.length > 0) {
      return `${results.length} matters available. Type to search.`;
    }
    if (query.length >= 2 && results.length === 0) {
      return emptyText;
    }
    if (results.length > 0) {
      return `${results.length} result${results.length === 1 ? "" : "s"} found. Use arrow keys to navigate.`;
    }
    return "";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-label={selectedMatter ? `Selected matter: ${selectedMatter.title}` : "Select a matter"}
          aria-required={ariaRequired}
          aria-invalid={ariaInvalid}
          aria-describedby={combinedAriaDescribedBy || undefined}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
          onKeyDown={handleKeyDown}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            aria-label="Search matters"
            aria-controls={listboxId}
          />
          <CommandList
            id={listboxId}
            role="listbox"
            aria-label="Matters"
          >
            {isLoading ? (
              <div
                className="flex items-center justify-center py-6"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" />
                <span className="ml-2 text-sm text-slate-500">Searching...</span>
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty role="status" aria-live="polite">
                {query.length < 2
                  ? "Type at least 2 characters to search"
                  : emptyText}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((matter) => (
                  <CommandItem
                    key={matter.id}
                    value={matter.id}
                    onSelect={handleSelect}
                    role="option"
                    aria-selected={value === matter.id}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === matter.id ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{matter.title}</span>
                      <span className="text-xs text-slate-500">
                        {matter.matterType}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
      {/* Screen reader status announcements */}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {open && getStatusMessage()}
      </div>
    </Popover>
  );
}
