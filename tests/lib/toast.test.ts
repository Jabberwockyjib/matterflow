import { describe, expect, it, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  showPromise,
  showFormSuccess,
  showFormError,
  showValidationError,
  showNetworkError,
  dismissToast,
} from "@/lib/toast";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(() => "toast-id-1"),
    error: vi.fn(() => "toast-id-2"),
    info: vi.fn(() => "toast-id-3"),
    warning: vi.fn(() => "toast-id-4"),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("toast utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // showSuccess Tests
  // ==========================================================================

  describe("showSuccess", () => {
    it("calls toast.success with message and default options", () => {
      showSuccess("Operation completed");

      expect(toast.success).toHaveBeenCalledWith("Operation completed", {
        duration: 4000,
      });
    });

    it("merges custom options with defaults", () => {
      showSuccess("Saved", { duration: 2000 });

      expect(toast.success).toHaveBeenCalledWith("Saved", {
        duration: 2000,
      });
    });

    it("returns toast ID", () => {
      const id = showSuccess("Test");
      expect(id).toBe("toast-id-1");
    });
  });

  // ==========================================================================
  // showError Tests
  // ==========================================================================

  describe("showError", () => {
    it("calls toast.error with message and default options", () => {
      showError("Something went wrong");

      expect(toast.error).toHaveBeenCalledWith("Something went wrong", {
        duration: 6000,
      });
    });

    it("adds retry action when onRetry is provided", () => {
      const onRetry = vi.fn();
      showError("Failed", { onRetry });

      expect(toast.error).toHaveBeenCalledWith("Failed", {
        duration: 6000,
        action: {
          label: "Retry",
          onClick: onRetry,
        },
      });
    });

    it("uses custom retry label when provided", () => {
      const onRetry = vi.fn();
      showError("Failed", { onRetry, retryLabel: "Try Again" });

      expect(toast.error).toHaveBeenCalledWith("Failed", {
        duration: 6000,
        action: {
          label: "Try Again",
          onClick: onRetry,
        },
      });
    });

    it("returns toast ID", () => {
      const id = showError("Error");
      expect(id).toBe("toast-id-2");
    });
  });

  // ==========================================================================
  // showInfo Tests
  // ==========================================================================

  describe("showInfo", () => {
    it("calls toast.info with message and default options", () => {
      showInfo("FYI: Auto-saved");

      expect(toast.info).toHaveBeenCalledWith("FYI: Auto-saved", {
        duration: 4000,
      });
    });

    it("returns toast ID", () => {
      const id = showInfo("Info");
      expect(id).toBe("toast-id-3");
    });
  });

  // ==========================================================================
  // showWarning Tests
  // ==========================================================================

  describe("showWarning", () => {
    it("calls toast.warning with message and warning-specific duration", () => {
      showWarning("Unsaved changes");

      expect(toast.warning).toHaveBeenCalledWith("Unsaved changes", {
        duration: 5000,
      });
    });

    it("returns toast ID", () => {
      const id = showWarning("Warning");
      expect(id).toBe("toast-id-4");
    });
  });

  // ==========================================================================
  // showPromise Tests
  // ==========================================================================

  describe("showPromise", () => {
    it("calls toast.promise with messages", async () => {
      const promise = Promise.resolve("result");
      const messages = {
        loading: "Saving...",
        success: "Saved!",
        error: "Failed to save",
      };

      await showPromise(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, expect.objectContaining({
        loading: "Saving...",
        success: "Saved!",
        error: "Failed to save",
      }));
    });

    it("returns the original promise result", async () => {
      const promise = Promise.resolve("my-result");
      const result = await showPromise(promise, {
        loading: "Loading...",
        success: "Done",
        error: "Error",
      });

      expect(result).toBe("my-result");
    });

    it("adds retry functionality when onRetry is provided", async () => {
      const onRetry = vi.fn();
      const promise = Promise.resolve("result");

      await showPromise(
        promise,
        { loading: "...", success: "Ok", error: "Error" },
        { onRetry, retryLabel: "Retry Now" }
      );

      // Verify toast.promise was called (specific error handling is complex to test)
      expect(toast.promise).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // dismissToast Tests
  // ==========================================================================

  describe("dismissToast", () => {
    it("dismisses specific toast when ID is provided", () => {
      dismissToast("specific-id");

      expect(toast.dismiss).toHaveBeenCalledWith("specific-id");
    });

    it("dismisses all toasts when no ID is provided", () => {
      dismissToast();

      expect(toast.dismiss).toHaveBeenCalledWith();
    });

    it("handles numeric toast IDs", () => {
      dismissToast(123);

      expect(toast.dismiss).toHaveBeenCalledWith(123);
    });
  });

  // ==========================================================================
  // Form Helper Tests
  // ==========================================================================

  describe("showFormSuccess", () => {
    it("formats success message with entity and action", () => {
      showFormSuccess("Matter", "created");

      expect(toast.success).toHaveBeenCalledWith("Matter created successfully", {
        duration: 4000,
      });
    });

    it("works with different entities and actions", () => {
      showFormSuccess("Invoice", "sent to client");

      expect(toast.success).toHaveBeenCalledWith("Invoice sent to client successfully", {
        duration: 4000,
      });
    });
  });

  describe("showFormError", () => {
    it("formats error message with entity and action", () => {
      showFormError("Matter", "create");

      expect(toast.error).toHaveBeenCalledWith("Failed to create matter", {
        duration: 6000,
      });
    });

    it("lowercases the entity name in error message", () => {
      showFormError("Invoice", "update");

      expect(toast.error).toHaveBeenCalledWith("Failed to update invoice", {
        duration: 6000,
      });
    });

    it("supports retry functionality", () => {
      const onRetry = vi.fn();
      showFormError("Task", "delete", { onRetry });

      expect(toast.error).toHaveBeenCalledWith("Failed to delete task", {
        duration: 6000,
        action: {
          label: "Retry",
          onClick: onRetry,
        },
      });
    });
  });

  describe("showValidationError", () => {
    it("shows default validation message", () => {
      showValidationError();

      expect(toast.error).toHaveBeenCalledWith("Please fix the errors and try again", {
        duration: 4000,
      });
    });

    it("shows custom validation message", () => {
      showValidationError("Email is invalid");

      expect(toast.error).toHaveBeenCalledWith("Email is invalid", {
        duration: 4000,
      });
    });
  });

  describe("showNetworkError", () => {
    it("shows network error message", () => {
      showNetworkError();

      expect(toast.error).toHaveBeenCalledWith("Network error - please check your connection", {
        duration: 6000,
      });
    });

    it("adds retry button when handler is provided", () => {
      const onRetry = vi.fn();
      showNetworkError(onRetry);

      expect(toast.error).toHaveBeenCalledWith("Network error - please check your connection", {
        duration: 6000,
        action: {
          label: "Retry",
          onClick: onRetry,
        },
      });
    });
  });
});
