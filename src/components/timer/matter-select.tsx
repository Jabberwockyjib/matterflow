"use client";

import { useCallback, useId, forwardRef } from "react";
import { ChevronDown, Briefcase } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MatterSummary } from "@/lib/data/queries";

export interface MatterSelectProps {
  /**
   * List of available matters for selection.
   * Should be fetched server-side and passed down.
   */
  matters: MatterSummary[];

  /**
   * Currently selected matter ID.
   */
  value: string | null;

  /**
   * Suggested matter ID (used to show suggestion hint).
   */
  suggestedMatterId?: string | null;

  /**
   * Callback when selection changes.
   */
  onChange: (matterId: string) => void;

  /**
   * Whether the select is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the field is required.
   */
  required?: boolean;

  /**
   * Additional CSS classes.
   */
  className?: string;

  /**
   * Placeholder text when no selection.
   */
  placeholder?: string;

  /**
   * Label for the select (optional, for standalone use).
   */
  label?: string;

  /**
   * Show the suggestion hint below the select.
   */
  showSuggestionHint?: boolean;

  /**
   * Custom suggestion hint text.
   */
  suggestionHintText?: string;

  /**
   * aria-describedby ID for additional accessibility hints.
   */
  "aria-describedby"?: string;
}

/**
 * MatterSelect
 *
 * A reusable matter selection dropdown component for the timer modal.
 * Features:
 * - Shows matter title and type for each option
 * - Pre-selects suggested matter with visual hint
 * - Handles empty states gracefully
 * - Fully accessible with proper ARIA attributes
 * - Consistent styling with project patterns
 */
export const MatterSelect = forwardRef<HTMLSelectElement, MatterSelectProps>(
  function MatterSelect(
    {
      matters,
      value,
      suggestedMatterId,
      onChange,
      disabled = false,
      required = false,
      className,
      placeholder = "Select a matter",
      label,
      showSuggestionHint = true,
      suggestionHintText = "Suggested based on your current context",
      "aria-describedby": ariaDescribedBy,
    },
    ref
  ) {
    const selectId = useId();
    const labelId = useId();
    const hintId = useId();

    /**
     * Handle selection change and call parent callback.
     */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        if (newValue) {
          onChange(newValue);
        }
      },
      [onChange]
    );

    // Determine if the current selection matches the suggestion
    const isSuggested = value === suggestedMatterId && suggestedMatterId !== null;

    // Combine aria-describedby IDs
    const computedAriaDescribedBy = [
      isSuggested && showSuggestionHint ? hintId : null,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    // Check for empty state
    const hasMatters = matters.length > 0;

    return (
      <div className={cn("w-full", className)}>
        {/* Label (optional, for standalone usage) */}
        {label && (
          <label
            id={labelId}
            htmlFor={selectId}
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            {label}
            {required && !value && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Select container with custom chevron */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value || ""}
            onChange={handleChange}
            disabled={disabled || !hasMatters}
            aria-required={required}
            aria-describedby={computedAriaDescribedBy}
            aria-labelledby={label ? labelId : undefined}
            aria-invalid={required && !value ? "true" : undefined}
            className={cn(
              "w-full appearance-none rounded-md border px-3 py-2 pr-10 text-sm",
              "border-slate-200 bg-white text-slate-900",
              "focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300",
              "disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed",
              // Highlight when suggestion is selected
              isSuggested && !disabled && "border-blue-300 ring-1 ring-blue-200"
            )}
          >
            {/* Placeholder option */}
            <option value="" disabled>
              {hasMatters ? placeholder : "No matters available"}
            </option>

            {/* Matter options */}
            {matters.map((matter) => (
              <option key={matter.id} value={matter.id}>
                {matter.title} ({matter.matterType})
              </option>
            ))}
          </select>

          {/* Custom chevron icon */}
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3",
              disabled ? "text-slate-400" : "text-slate-500"
            )}
            aria-hidden="true"
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>

        {/* Suggestion hint */}
        {isSuggested && showSuggestionHint && !disabled && (
          <p
            id={hintId}
            className="mt-1 flex items-center gap-1 text-xs text-blue-600"
          >
            <Briefcase className="h-3 w-3" aria-hidden="true" />
            {suggestionHintText}
          </p>
        )}

        {/* Empty state message */}
        {!hasMatters && (
          <p className="mt-1 text-xs text-amber-600">
            No matters found. Please create a matter first.
          </p>
        )}
      </div>
    );
  }
);
