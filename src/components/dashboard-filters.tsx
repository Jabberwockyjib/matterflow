"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { MatterFilters } from "@/components/matter-filters";
import type { MatterFilters as MatterFiltersType } from "@/lib/data/queries";

export type DashboardFiltersProps = {
  /**
   * Available matter types for the filter dropdown
   */
  availableMatterTypes?: string[];
};

/**
 * DashboardFilters wraps MatterFilters to sync with URL search params.
 *
 * URL param mapping:
 * - `status` - Comma-separated list of status categories (e.g., "Active,On Hold")
 * - `type` - Single matter type
 * - `search` - Search query string
 *
 * Changes to filters update the URL, causing a server component re-render
 * with the new filter values.
 */
export function DashboardFilters({
  availableMatterTypes = [],
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current URL params into initial filter state
  const initialFilters: MatterFiltersType = {
    stages: searchParams.get("status")?.split(",").filter(Boolean) ?? [],
    matterTypes: searchParams.get("type")
      ? [searchParams.get("type")!]
      : [],
    searchQuery: searchParams.get("search") ?? "",
  };

  // Update URL when filters change
  const handleFilterChange = useCallback(
    (filters: MatterFiltersType) => {
      const params = new URLSearchParams();

      // Add status param (comma-separated)
      if (filters.stages && filters.stages.length > 0) {
        params.set("status", filters.stages.join(","));
      }

      // Add type param
      if (filters.matterTypes && filters.matterTypes.length > 0) {
        params.set("type", filters.matterTypes[0]);
      }

      // Add search param
      if (filters.searchQuery && filters.searchQuery.trim()) {
        params.set("search", filters.searchQuery.trim());
      }

      // Build URL with or without params
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      // Navigate to update URL (triggers server component re-render)
      router.push(url);
    },
    [router, pathname]
  );

  return (
    <MatterFilters
      onFilterChange={handleFilterChange}
      availableMatterTypes={availableMatterTypes}
      initialFilters={initialFilters}
    />
  );
}
