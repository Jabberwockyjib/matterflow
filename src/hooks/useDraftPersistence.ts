"use client";

import { useEffect, useRef, useCallback } from "react";
import type { UseFormWatch, UseFormReset, FieldValues } from "react-hook-form";

// ============================================================================
// Constants
// ============================================================================

const DRAFT_KEY_PREFIX = "form_draft_";
const DEBOUNCE_DELAY_MS = 500;

// ============================================================================
// Types
// ============================================================================

export interface UseDraftPersistenceOptions<T extends FieldValues> {
  /** Unique identifier for the form - used as localStorage key suffix */
  formId: string;
  /** React Hook Form watch function */
  watch: UseFormWatch<T>;
  /** React Hook Form reset function */
  reset: UseFormReset<T>;
  /** Optional: Disable draft persistence (useful for editing existing items) */
  disabled?: boolean;
}

export interface UseDraftPersistenceReturn {
  /** Clear the draft from localStorage */
  clearDraft: () => void;
  /** Check if a draft exists */
  hasDraft: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if localStorage is available and functional
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__test_storage__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely get an item from localStorage
 */
function safeGetItem(key: string): string | null {
  try {
    if (!isLocalStorageAvailable()) {
      return null;
    }
    return localStorage.getItem(key);
  } catch {
    // localStorage may throw in private browsing mode or when disabled
    return null;
  }
}

/**
 * Safely set an item in localStorage
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    if (!isLocalStorageAvailable()) {
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle quota exceeded or other storage errors
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError" || error.code === 22) {
        // Storage is full - gracefully degrade
        return false;
      }
    }
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 */
function safeRemoveItem(key: string): void {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore errors when removing items
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for auto-saving form data to localStorage and restoring on page refresh.
 *
 * Features:
 * - Debounced saving to reduce localStorage writes
 * - Graceful degradation when localStorage is unavailable or full
 * - Automatic restoration of draft on mount
 * - Clear draft function for use after successful submission
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { register, handleSubmit, watch, reset } = useForm();
 *   const { clearDraft } = useDraftPersistence({
 *     formId: 'my-form',
 *     watch,
 *     reset,
 *   });
 *
 *   const onSubmit = async (data) => {
 *     await saveData(data);
 *     clearDraft(); // Clear draft after successful submission
 *   };
 *
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
 * }
 * ```
 */
export function useDraftPersistence<T extends FieldValues>({
  formId,
  watch,
  reset,
  disabled = false,
}: UseDraftPersistenceOptions<T>): UseDraftPersistenceReturn {
  const draftKey = `${DRAFT_KEY_PREFIX}${formId}`;
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if we've already restored the draft to avoid re-running
  const hasRestoredRef = useRef(false);

  // Load draft from localStorage on mount using a layout effect pattern
  // This runs synchronously before paint to avoid flash of empty form
  useEffect(() => {
    if (disabled || hasRestoredRef.current) {
      return;
    }

    const savedDraft = safeGetItem(draftKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft) as T;
        // Use reset to restore the draft values
        reset(parsed, {
          keepDefaultValues: false,
        });
        hasRestoredRef.current = true;
      } catch {
        // JSON parse error - remove corrupted draft
        safeRemoveItem(draftKey);
      }
    }
    hasRestoredRef.current = true;
  }, [draftKey, reset, disabled]);

  // Subscribe to form changes and save draft with debouncing
  useEffect(() => {
    if (disabled) {
      return;
    }

    const subscription = watch((data) => {
      // Clear any pending debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the save operation
      debounceTimeoutRef.current = setTimeout(() => {
        try {
          const serialized = JSON.stringify(data);
          safeSetItem(draftKey, serialized);
        } catch {
          // Serialization error - don't save
        }
      }, DEBOUNCE_DELAY_MS);
    });

    // Cleanup: unsubscribe and clear timeout
    return () => {
      subscription.unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [watch, draftKey, disabled]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    safeRemoveItem(draftKey);
  }, [draftKey]);

  // Check if draft exists - computed from localStorage
  // This is a getter that checks localStorage directly to avoid state syncing issues
  const hasDraft = typeof window !== "undefined" && safeGetItem(draftKey) !== null;

  return {
    clearDraft,
    hasDraft,
  };
}

export default useDraftPersistence;
