"use client";

import { useEffect } from "react";

// ============================================================================
// Types
// ============================================================================

export interface UseUnsavedChangesOptions {
  /** Whether the form has unsaved changes (from React Hook Form's formState.isDirty) */
  isDirty: boolean;
  /** Optional: Disable the unsaved changes warning */
  disabled?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook that warns users when navigating away with unsaved changes.
 *
 * Uses the browser's beforeunload event to show a standard "Leave site?"
 * confirmation dialog when the user attempts to:
 * - Close the tab/window
 * - Navigate away from the page
 * - Refresh the page
 *
 * Note: Most modern browsers ignore custom messages and show their own
 * standardized text for security reasons.
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { formState: { isDirty } } = useForm();
 *
 *   useUnsavedChanges({ isDirty });
 *
 *   return <form>...</form>;
 * }
 * ```
 */
export function useUnsavedChanges({
  isDirty,
  disabled = false,
}: UseUnsavedChangesOptions): void {
  useEffect(() => {
    // Only add listener if form is dirty and not disabled
    if (!isDirty || disabled) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Prevent the default behavior to trigger the confirmation dialog
      e.preventDefault();
      // Chrome requires returnValue to be set (legacy API)
      // Note: The actual message displayed is controlled by the browser
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup: remove event listener on unmount or when dependencies change
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, disabled]);
}

export default useUnsavedChanges;
