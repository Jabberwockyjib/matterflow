import { toast, type ExternalToast } from "sonner";

// ============================================================================
// Toast Configuration
// ============================================================================

/**
 * Default toast configuration for consistent styling
 */
const DEFAULT_TOAST_OPTIONS: ExternalToast = {
  duration: 4000, // 4 seconds - visible enough but not intrusive
};

// ============================================================================
// Success Toast
// ============================================================================

/**
 * Display a success toast notification
 *
 * @param message - The success message to display
 * @param options - Optional configuration for the toast
 * @returns The toast ID for programmatic dismissal
 *
 * @example
 * showSuccess("Matter created successfully");
 * showSuccess("Changes saved", { duration: 2000 });
 */
export function showSuccess(
  message: string,
  options?: ExternalToast
): string | number {
  return toast.success(message, {
    ...DEFAULT_TOAST_OPTIONS,
    ...options,
  });
}

// ============================================================================
// Error Toast
// ============================================================================

/**
 * Options for error toast with retry functionality
 */
export interface ErrorToastOptions extends ExternalToast {
  /** Function to call when retry button is clicked */
  onRetry?: () => void | Promise<void>;
  /** Custom label for the retry button (default: "Retry") */
  retryLabel?: string;
}

/**
 * Display an error toast notification with optional retry button
 *
 * @param message - The error message to display
 * @param options - Optional configuration including retry functionality
 * @returns The toast ID for programmatic dismissal
 *
 * @example
 * // Simple error toast
 * showError("Failed to save matter");
 *
 * // Error toast with retry button
 * showError("Network error - failed to save", {
 *   onRetry: () => handleSubmit(),
 * });
 *
 * // Error toast with custom retry label
 * showError("Connection lost", {
 *   onRetry: () => reconnect(),
 *   retryLabel: "Reconnect",
 * });
 */
export function showError(
  message: string,
  options?: ErrorToastOptions
): string | number {
  const { onRetry, retryLabel = "Retry", ...toastOptions } = options || {};

  const errorOptions: ExternalToast = {
    ...DEFAULT_TOAST_OPTIONS,
    duration: 6000, // Longer duration for errors so users can read and act
    ...toastOptions,
  };

  // Add retry action if handler is provided
  if (onRetry) {
    errorOptions.action = {
      label: retryLabel,
      onClick: onRetry,
    };
  }

  return toast.error(message, errorOptions);
}

// ============================================================================
// Promise Toast
// ============================================================================

/**
 * Messages for promise toast states
 */
export interface PromiseToastMessages {
  /** Message shown while promise is pending */
  loading: string;
  /** Message shown when promise resolves successfully */
  success: string;
  /** Message shown when promise rejects (can be a function for custom error messages) */
  error: string | ((error: Error) => string);
}

/**
 * Options for promise toast
 */
export interface PromiseToastOptions extends Omit<ExternalToast, "duration"> {
  /** Function to call when retry button is clicked (shown on error) */
  onRetry?: () => void | Promise<void>;
  /** Custom label for the retry button (default: "Retry") */
  retryLabel?: string;
}

/**
 * Wrap an async operation with toast notifications for loading/success/error states
 *
 * This is the recommended approach for form submissions and API calls as it
 * provides immediate feedback to users about the operation state.
 *
 * @param promise - The promise to track
 * @param messages - Messages to show for each state
 * @param options - Optional configuration including retry functionality
 * @returns The original promise result
 *
 * @example
 * // Basic usage
 * const result = await showPromise(
 *   saveMatter(data),
 *   {
 *     loading: "Saving matter...",
 *     success: "Matter saved successfully",
 *     error: "Failed to save matter",
 *   }
 * );
 *
 * // With retry functionality
 * const result = await showPromise(
 *   saveMatter(data),
 *   {
 *     loading: "Saving matter...",
 *     success: "Matter saved successfully",
 *     error: (err) => `Failed to save: ${err.message}`,
 *   },
 *   {
 *     onRetry: () => handleSubmit(),
 *   }
 * );
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: PromiseToastMessages,
  options?: PromiseToastOptions
): Promise<T> {
  const { onRetry, retryLabel = "Retry", ...toastOptions } = options || {};

  // Build error options with retry if provided
  const errorOptions: ExternalToast | undefined = onRetry
    ? {
        action: {
          label: retryLabel,
          onClick: onRetry,
        },
      }
    : undefined;

  // Use sonner's promise toast - it tracks the promise state automatically
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    ...toastOptions,
    // Pass error options for retry functionality
    ...(errorOptions ? { error: (error: Error) => ({
      message: typeof messages.error === "function"
        ? messages.error(error)
        : messages.error,
      ...errorOptions,
    })} : {}),
  });

  // Return the original promise so callers can await the result
  return promise;
}

// ============================================================================
// Utility Toast Functions
// ============================================================================

/**
 * Display an informational toast notification
 *
 * @param message - The message to display
 * @param options - Optional configuration for the toast
 * @returns The toast ID for programmatic dismissal
 *
 * @example
 * showInfo("Form auto-saved as draft");
 */
export function showInfo(
  message: string,
  options?: ExternalToast
): string | number {
  return toast.info(message, {
    ...DEFAULT_TOAST_OPTIONS,
    ...options,
  });
}

/**
 * Display a warning toast notification
 *
 * @param message - The warning message to display
 * @param options - Optional configuration for the toast
 * @returns The toast ID for programmatic dismissal
 *
 * @example
 * showWarning("You have unsaved changes");
 */
export function showWarning(
  message: string,
  options?: ExternalToast
): string | number {
  return toast.warning(message, {
    ...DEFAULT_TOAST_OPTIONS,
    duration: 5000, // Slightly longer for warnings
    ...options,
  });
}

/**
 * Dismiss a specific toast or all toasts
 *
 * @param toastId - Optional toast ID to dismiss. If not provided, dismisses all toasts.
 *
 * @example
 * const id = showSuccess("Saved");
 * dismissToast(id); // Dismiss specific toast
 * dismissToast(); // Dismiss all toasts
 */
export function dismissToast(toastId?: string | number): void {
  if (toastId !== undefined) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
}

// ============================================================================
// Form-Specific Toast Helpers
// ============================================================================

/**
 * Display success toast for form submissions
 *
 * @param entityName - The name of the entity (e.g., "Matter", "Task")
 * @param action - The action performed (e.g., "created", "updated", "deleted")
 * @param options - Optional configuration for the toast
 * @returns The toast ID
 *
 * @example
 * showFormSuccess("Matter", "created");
 * showFormSuccess("Invoice", "sent to client");
 */
export function showFormSuccess(
  entityName: string,
  action: string,
  options?: ExternalToast
): string | number {
  return showSuccess(`${entityName} ${action} successfully`, options);
}

/**
 * Display error toast for form submission failures
 *
 * @param entityName - The name of the entity (e.g., "Matter", "Task")
 * @param action - The action that failed (e.g., "create", "update", "delete")
 * @param options - Optional configuration including retry functionality
 * @returns The toast ID
 *
 * @example
 * showFormError("Matter", "create", { onRetry: handleSubmit });
 * showFormError("Invoice", "update");
 */
export function showFormError(
  entityName: string,
  action: string,
  options?: ErrorToastOptions
): string | number {
  return showError(`Failed to ${action} ${entityName.toLowerCase()}`, options);
}

/**
 * Display validation error toast
 *
 * @param message - Optional custom message (default: "Please fix the errors and try again")
 * @param options - Optional configuration for the toast
 * @returns The toast ID
 *
 * @example
 * showValidationError();
 * showValidationError("Please fill in all required fields");
 */
export function showValidationError(
  message = "Please fix the errors and try again",
  options?: ExternalToast
): string | number {
  return showError(message, {
    duration: 4000, // Shorter duration for validation errors
    ...options,
  });
}

/**
 * Display network error toast with retry option
 *
 * @param onRetry - Function to call when retry button is clicked
 * @param options - Optional configuration for the toast
 * @returns The toast ID
 *
 * @example
 * showNetworkError(() => handleSubmit());
 */
export function showNetworkError(
  onRetry?: () => void | Promise<void>,
  options?: Omit<ErrorToastOptions, "onRetry">
): string | number {
  return showError("Network error - please check your connection", {
    onRetry,
    retryLabel: "Retry",
    ...options,
  });
}
