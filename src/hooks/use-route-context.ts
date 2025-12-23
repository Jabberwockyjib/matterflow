"use client";

/**
 * Route Context Hook
 *
 * Extracts matter context from the current Next.js route.
 * Used by the timer system to suggest the most relevant matter
 * based on the user's current page location.
 *
 * @example
 * ```tsx
 * const { matterId, pathname, isOnMatterPage } = useRouteContext();
 * if (matterId) {
 *   // User is viewing a matter-related page
 *   suggestMatter(matterId);
 * }
 * ```
 */

import { usePathname } from "next/navigation";
import { useMemo } from "react";

/**
 * Route patterns for extracting matter ID from URLs.
 * Matches various matter-related pages in the application.
 */
const MATTER_ROUTE_PATTERNS = [
  // /matters/[id] - Matter detail page
  /^\/matters\/([a-zA-Z0-9-]+)$/,
  // /matters/[id]/edit - Matter edit page
  /^\/matters\/([a-zA-Z0-9-]+)\/edit$/,
  // /matters/[id]/time - Matter time entries page
  /^\/matters\/([a-zA-Z0-9-]+)\/time$/,
  // /matters/[id]/tasks - Matter tasks page
  /^\/matters\/([a-zA-Z0-9-]+)\/tasks$/,
  // /matters/[id]/billing - Matter billing page
  /^\/matters\/([a-zA-Z0-9-]+)\/billing$/,
  // /matters/[id]/documents - Matter documents page
  /^\/matters\/([a-zA-Z0-9-]+)\/documents$/,
  // /matters/[id]/notes - Matter notes page
  /^\/matters\/([a-zA-Z0-9-]+)\/notes$/,
];

/**
 * Route context information extracted from the current pathname.
 */
export interface RouteContext {
  /** The current route pathname */
  pathname: string;
  /** Matter ID extracted from the route, or null if not on a matter page */
  matterId: string | null;
  /** Whether the user is currently on a matter-related page */
  isOnMatterPage: boolean;
}

/**
 * Extract matter ID from a pathname.
 *
 * @param pathname - The route pathname to parse
 * @returns The matter ID if found, null otherwise
 */
function extractMatterId(pathname: string): string | null {
  for (const pattern of MATTER_ROUTE_PATTERNS) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Hook to extract matter context from the current Next.js route.
 *
 * Parses the current pathname to determine if the user is viewing
 * a matter-related page and extracts the matter ID if present.
 *
 * The result is memoized based on the pathname to prevent unnecessary
 * recalculations during re-renders.
 *
 * @returns Route context with pathname, matter ID, and matter page indicator
 *
 * @example
 * ```tsx
 * function TimerButton() {
 *   const { matterId, isOnMatterPage } = useRouteContext();
 *
 *   const handleOpenTimer = () => {
 *     if (matterId) {
 *       // Pre-select the matter from the current page
 *       setSelectedMatter(matterId);
 *     }
 *     openTimerModal();
 *   };
 *
 *   return (
 *     <button onClick={handleOpenTimer}>
 *       {isOnMatterPage ? 'Track time for this matter' : 'Start timer'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useRouteContext(): RouteContext {
  const pathname = usePathname();

  return useMemo(() => {
    const matterId = extractMatterId(pathname);

    return {
      pathname,
      matterId,
      isOnMatterPage: matterId !== null,
    };
  }, [pathname]);
}

/**
 * Get route context from a pathname string (non-hook version).
 *
 * Useful for server-side rendering or when you already have the pathname
 * and don't need to use the Next.js router.
 *
 * @param pathname - The pathname to parse
 * @returns Route context with matter ID and page indicator
 *
 * @example
 * ```ts
 * // In a server component or utility function
 * const context = getRouteContext('/matters/abc-123');
 * console.log(context.matterId); // 'abc-123'
 * console.log(context.isOnMatterPage); // true
 * ```
 */
export function getRouteContext(pathname: string): RouteContext {
  const matterId = extractMatterId(pathname);

  return {
    pathname,
    matterId,
    isOnMatterPage: matterId !== null,
  };
}

export default useRouteContext;
