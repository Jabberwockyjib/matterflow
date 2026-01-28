import { Suspense } from "react";
import { fetchMattersWithFilters, fetchMattersAwaitingReview, fetchMattersAwaitingIntake, fetchOverdueMatters } from "@/lib/data/queries";
import type { MatterFilters } from "@/lib/data/queries";
import {
  groupAndSortMatters,
  getUniqueMatterTypes,
  STATUS_CATEGORIES,
} from "@/lib/utils/matter-helpers";
import { DashboardColumn } from "@/components/dashboard-column";
import { DashboardFilters } from "@/components/dashboard-filters";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { WaitingOnClient } from "@/components/dashboard/waiting-on-client";

export const metadata = {
  title: "Matter Status Dashboard",
  description: "Visual kanban-style dashboard displaying all legal matters grouped by status",
};

type DashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Parse URL search params into MatterFilters
 * Handles both string and string[] values for flexibility
 */
function parseSearchParams(params: { [key: string]: string | string[] | undefined }): MatterFilters {
  const filters: MatterFilters = {};

  // Parse status param (comma-separated string or array)
  const statusParam = params.status;
  if (statusParam) {
    if (Array.isArray(statusParam)) {
      filters.stages = statusParam.flatMap((s) => s.split(",")).filter(Boolean);
    } else {
      filters.stages = statusParam.split(",").filter(Boolean);
    }
  }

  // Parse type param (single value or first of array)
  const typeParam = params.type;
  if (typeParam) {
    const type = Array.isArray(typeParam) ? typeParam[0] : typeParam;
    if (type) {
      filters.matterTypes = [type];
    }
  }

  // Parse search param
  const searchParam = params.search;
  if (searchParam) {
    filters.searchQuery = Array.isArray(searchParam) ? searchParam[0] : searchParam;
  }

  return filters;
}

/**
 * Loading skeleton for dashboard columns
 */
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {STATUS_CATEGORIES.map((category) => (
        <div key={category} className="flex min-w-[280px] flex-col">
          {/* Header skeleton */}
          <div className="mb-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-300 dark:bg-zinc-600" />
            <div className="h-5 w-6 animate-pulse rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </div>
          {/* Card skeletons */}
          <div className="flex flex-1 flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="mt-1 h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for filters
 */
function FiltersSkeleton() {
  return (
    <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Search skeleton */}
      <div className="mb-4">
        <div className="mb-1 h-4 w-14 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-10 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      </div>
      {/* Status checkboxes skeleton */}
      <div className="mb-4">
        <div className="mb-2 h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 w-28 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
      {/* Matter type dropdown skeleton */}
      <div>
        <div className="mb-1 h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-10 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

/**
 * Dashboard content component that fetches and displays matters
 * Uses Promise.all for parallel fetching to eliminate waterfall
 */
async function DashboardContent({ filters }: { filters: MatterFilters }) {
  const [
    { data: matters, source, error },
    { data: awaitingReview },
    { data: awaitingIntake },
    { data: overdue },
  ] = await Promise.all([
    fetchMattersWithFilters(filters),
    fetchMattersAwaitingReview(),
    fetchMattersAwaitingIntake(),
    fetchOverdueMatters(),
  ]);
  const groupedMatters = groupAndSortMatters(matters);

  // Check if any filters are active
  const hasActiveFilters =
    (filters.stages && filters.stages.length > 0) ||
    (filters.matterTypes && filters.matterTypes.length > 0) ||
    (filters.searchQuery && filters.searchQuery.trim());

  // Count total matters shown
  const totalMatterCount = Object.values(groupedMatters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <>
      {/* Needs Attention Section */}
      <NeedsAttention awaitingReview={awaitingReview} overdue={overdue} />

      {/* Waiting on Client Section */}
      <WaitingOnClient awaitingIntake={awaitingIntake} />

      {/* Data source indicator (development info) */}
      {source === "mock" && (
        <div
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          data-testid="mock-data-indicator"
        >
          {error ? (
            <>Using mock data: {error}</>
          ) : (
            <>Using mock data (Supabase not configured)</>
          )}
        </div>
      )}

      {/* Filter results summary */}
      {hasActiveFilters && (
        <div
          className="mb-4 text-sm text-zinc-600 dark:text-zinc-400"
          data-testid="filter-results-summary"
        >
          Showing {totalMatterCount} {totalMatterCount === 1 ? "matter" : "matters"}
          {filters.searchQuery && (
            <> matching &quot;{filters.searchQuery}&quot;</>
          )}
        </div>
      )}

      {/* Status Columns Grid */}
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5"
        data-testid="dashboard-columns"
      >
        {STATUS_CATEGORIES.map((category) => (
          <DashboardColumn
            key={category}
            title={category}
            statusCategory={category}
            matters={groupedMatters[category]}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Filters wrapper that fetches available matter types for the dropdown
 */
async function FiltersWithData() {
  // Fetch all matters to get available matter types for dropdown
  const { data: allMatters } = await fetchMattersWithFilters();
  const availableMatterTypes = getUniqueMatterTypes(allMatters);

  return <DashboardFilters availableMatterTypes={availableMatterTypes} />;
}

/**
 * Matter Status Dashboard Page
 *
 * Displays all legal matters in a kanban-style layout grouped by status:
 * - Active
 * - Waiting on Client
 * - Waiting on Court
 * - Complete
 * - On Hold
 *
 * Supports URL-based filtering:
 * - ?status=Active,On Hold - Filter by status categories
 * - ?type=Contract Review - Filter by matter type
 * - ?search=evergreen - Search across client/matter names and actions
 *
 * Uses server component data fetching with Suspense for loading states.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const filters = parseSearchParams(params);

  return (
    <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Matter Status Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Visual overview of all matters organized by status
          </p>
        </header>

        {/* Filters Section */}
        <Suspense fallback={<FiltersSkeleton />}>
          <div className="mb-6">
            <FiltersWithData />
          </div>
        </Suspense>

        {/* Dashboard Content with Suspense */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent filters={filters} />
        </Suspense>
    </div>
  );
}
