"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  STATUS_CATEGORIES,
  type StatusCategory,
} from "@/lib/utils/matter-helpers";
import type { MatterFilters as MatterFiltersType } from "@/lib/data/queries";

export type MatterFiltersProps = {
  /**
   * Callback fired when any filter value changes
   * Receives the complete filter state
   */
  onFilterChange: (filters: MatterFiltersType) => void;
  /**
   * Optional list of available matter types for the dropdown
   */
  availableMatterTypes?: string[];
  /**
   * Optional initial filter values
   */
  initialFilters?: MatterFiltersType;
  /**
   * Debounce delay in milliseconds for search input
   * @default 300
   */
  searchDebounceMs?: number;
};

/**
 * MatterFilters component provides search and multi-select filters for the dashboard.
 *
 * Features:
 * - Full-text search input (debounced)
 * - Multi-select checkboxes for status categories
 * - Single-select dropdown for matter types
 * - Clear all filters button
 *
 * This is a client component that manages filter state internally
 * and reports changes via onFilterChange callback.
 */
export function MatterFilters({
  onFilterChange,
  availableMatterTypes = [],
  initialFilters = {},
  searchDebounceMs = 300,
}: MatterFiltersProps) {
  // Internal state for filters
  const [searchQuery, setSearchQuery] = useState(
    initialFilters.searchQuery ?? ""
  );
  const [selectedStages, setSelectedStages] = useState<string[]>(
    initialFilters.stages ?? []
  );
  const [selectedMatterType, setSelectedMatterType] = useState<string>(
    initialFilters.matterTypes?.[0] ?? ""
  );

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build and emit filter state
  const emitFilters = useCallback(
    (
      stages: string[],
      matterTypes: string[],
      search: string
    ) => {
      const filters: MatterFiltersType = {};

      if (stages.length > 0) {
        filters.stages = stages;
      }

      if (matterTypes.length > 0) {
        filters.matterTypes = matterTypes;
      }

      if (search.trim()) {
        filters.searchQuery = search.trim();
      }

      onFilterChange(filters);
    },
    [onFilterChange]
  );

  // Handle search input with debounce
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for debounced emit
      debounceTimerRef.current = setTimeout(() => {
        const matterTypes = selectedMatterType ? [selectedMatterType] : [];
        emitFilters(selectedStages, matterTypes, value);
      }, searchDebounceMs);
    },
    [selectedStages, selectedMatterType, emitFilters, searchDebounceMs]
  );

  // Handle status category checkbox change
  const handleStatusChange = useCallback(
    (category: StatusCategory, checked: boolean) => {
      const newStages = checked
        ? [...selectedStages, category]
        : selectedStages.filter((s) => s !== category);

      setSelectedStages(newStages);
      const matterTypes = selectedMatterType ? [selectedMatterType] : [];
      emitFilters(newStages, matterTypes, searchQuery);
    },
    [selectedStages, selectedMatterType, searchQuery, emitFilters]
  );

  // Handle matter type dropdown change
  const handleMatterTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setSelectedMatterType(value);
      const matterTypes = value ? [value] : [];
      emitFilters(selectedStages, matterTypes, searchQuery);
    },
    [selectedStages, searchQuery, emitFilters]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedStages([]);
    setSelectedMatterType("");
    emitFilters([], [], "");
  }, [emitFilters]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedStages.length > 0 ||
    selectedMatterType !== "";

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      data-testid="matter-filters"
    >
      {/* Search Input */}
      <div className="mb-4">
        <label
          htmlFor="matter-search"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Search
        </label>
        <input
          id="matter-search"
          type="text"
          placeholder="Search by client, matter, or action..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          data-testid="matter-search-input"
        />
      </div>

      {/* Status Category Checkboxes */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Status
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              data-testid={`status-filter-${category.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <input
                type="checkbox"
                checked={selectedStages.includes(category)}
                onChange={(e) => handleStatusChange(category, e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                data-testid={`status-checkbox-${category.toLowerCase().replace(/\s+/g, "-")}`}
              />
              <span className="text-zinc-700 dark:text-zinc-300">
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Matter Type Dropdown */}
      <div className="mb-4">
        <label
          htmlFor="matter-type-filter"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Matter Type
        </label>
        <select
          id="matter-type-filter"
          value={selectedMatterType}
          onChange={handleMatterTypeChange}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          data-testid="matter-type-select"
        >
          <option value="">All types</option>
          {availableMatterTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearFilters}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          data-testid="clear-filters-button"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
