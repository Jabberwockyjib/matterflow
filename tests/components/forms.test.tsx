import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MatterForm } from "@/components/forms/MatterForm";
import { TaskForm } from "@/components/forms/TaskForm";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock server actions
vi.mock("@/lib/data/actions", () => ({
  createMatter: vi.fn(),
  createTask: vi.fn(),
}));

// Mock toast utilities
vi.mock("@/lib/toast", () => ({
  showFormSuccess: vi.fn(),
  showFormError: vi.fn(),
}));

// Mock useDraftPersistence hook
vi.mock("@/hooks/useDraftPersistence", () => ({
  useDraftPersistence: vi.fn(() => ({
    clearDraft: vi.fn(),
    hasDraft: false,
  })),
}));

// Mock useUnsavedChanges hook
vi.mock("@/hooks/useUnsavedChanges", () => ({
  useUnsavedChanges: vi.fn(),
}));

// Import mocked functions for assertions
import { createMatter, createTask } from "@/lib/data/actions";
import { showFormSuccess, showFormError } from "@/lib/toast";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

// ============================================================================
// MatterForm Tests
// ============================================================================

describe("MatterForm", () => {
  const mockOnSuccess = vi.fn();
  const mockClearDraft = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDraftPersistence as Mock).mockReturnValue({
      clearDraft: mockClearDraft,
      hasDraft: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("rendering", () => {
    it("renders all form fields", () => {
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Check all fields are present
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/matter type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/billing model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/responsible party/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next action/i)).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<MatterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByRole("button", { name: /create matter/i })).toBeInTheDocument();
    });

    it("renders required field indicators on required fields", () => {
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Title and Billing Model and Responsible Party are required
      const titleLabel = screen.getByText("Title");
      const billingLabel = screen.getByText("Billing Model");
      const responsibleLabel = screen.getByText("Responsible Party");

      // The asterisk is in a separate span within the label
      expect(titleLabel.closest("label")).toHaveTextContent("*");
      expect(billingLabel.closest("label")).toHaveTextContent("*");
      expect(responsibleLabel.closest("label")).toHaveTextContent("*");
    });

    it("shows warning when no ownerId is provided", () => {
      render(<MatterForm />);

      expect(screen.getByText(/no signed-in user/i)).toBeInTheDocument();
    });

    it("does not show warning when ownerId is provided", () => {
      render(<MatterForm ownerId="user-123" />);

      expect(screen.queryByText(/no signed-in user/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("validation", () => {
    it("shows error when submitting with empty title", async () => {
      const user = userEvent.setup();
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Clear the title field (it starts empty anyway)
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);

      // Submit the form
      const submitButton = screen.getByRole("button", { name: /create matter/i });
      await user.click(submitButton);

      // Wait for validation error to appear
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it("does not call createMatter on validation failure", async () => {
      const user = userEvent.setup();
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Submit without filling required fields
      const submitButton = screen.getByRole("button", { name: /create matter/i });
      await user.click(submitButton);

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Server action should not be called
      expect(createMatter).not.toHaveBeenCalled();
    });

    it("validates title minimum length", async () => {
      const user = userEvent.setup();
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Leave title empty and submit
      const submitButton = screen.getByRole("button", { name: /create matter/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Submission Tests
  // ==========================================================================

  describe("form submission", () => {
    it("calls createMatter with valid data", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out the form
      await user.type(screen.getByLabelText(/title/i), "Test Matter");
      await user.type(screen.getByLabelText(/matter type/i), "Litigation");
      await user.type(screen.getByLabelText(/next action/i), "Review documents");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for submission
      await waitFor(() => {
        expect(createMatter).toHaveBeenCalledTimes(1);
      });

      // Verify FormData was created with correct values
      const formDataArg = (createMatter as Mock).mock.calls[0][0] as FormData;
      expect(formDataArg.get("title")).toBe("Test Matter");
      expect(formDataArg.get("matterType")).toBe("Litigation");
      expect(formDataArg.get("billingModel")).toBe("hourly");
      expect(formDataArg.get("responsibleParty")).toBe("lawyer");
      expect(formDataArg.get("nextAction")).toBe("Review documents");
      expect(formDataArg.get("ownerId")).toBe("user-123");
    });

    it("shows success toast on successful submission", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for success
      await waitFor(() => {
        expect(showFormSuccess).toHaveBeenCalledWith("Matter", "created");
      });
    });

    it("calls onSuccess callback on successful submission", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for callback
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("clears draft on successful submission", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for draft clear
      await waitFor(() => {
        expect(mockClearDraft).toHaveBeenCalledTimes(1);
      });
    });

    it("shows error toast on failed submission", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ error: "Database error" });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for error toast
      await waitFor(() => {
        expect(showFormError).toHaveBeenCalledWith(
          "Matter",
          "create",
          expect.objectContaining({ onRetry: expect.any(Function) })
        );
      });
    });

    it("does not call onSuccess on failed submission", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ error: "Database error" });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for error
      await waitFor(() => {
        expect(showFormError).toHaveBeenCalled();
      });

      // onSuccess should not be called
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("does not clear draft on failed submission", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ error: "Database error" });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for error
      await waitFor(() => {
        expect(showFormError).toHaveBeenCalled();
      });

      // clearDraft should not be called
      expect(mockClearDraft).not.toHaveBeenCalled();
    });

    it("disables submit button during submission", async () => {
      const user = userEvent.setup();
      // Create a delayed promise to simulate network request
      let resolvePromise: (value: { ok: boolean }) => void;
      const promise = new Promise<{ ok: boolean }>((resolve) => {
        resolvePromise = resolve;
      });
      (createMatter as Mock).mockReturnValue(promise);

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create matter/i });
      await user.click(submitButton);

      // Button should be disabled and show loading text
      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent(/creating/i);
      });

      // Resolve the promise
      resolvePromise!({ ok: true });

      // Button should be enabled again
      await waitFor(() => {
        const button = screen.getByRole("button", { name: /create matter/i });
        expect(button).not.toBeDisabled();
      });
    });
  });

  // ==========================================================================
  // Select Field Tests
  // ==========================================================================

  describe("select fields", () => {
    it("allows selecting billing model", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill required title
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Change billing model
      await user.selectOptions(screen.getByLabelText(/billing model/i), "flat");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Verify selection
      await waitFor(() => {
        const formDataArg = (createMatter as Mock).mock.calls[0][0] as FormData;
        expect(formDataArg.get("billingModel")).toBe("flat");
      });
    });

    it("allows selecting responsible party", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      // Fill required title
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Change responsible party
      await user.selectOptions(screen.getByLabelText(/responsible party/i), "client");

      // Submit
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Verify selection
      await waitFor(() => {
        const formDataArg = (createMatter as Mock).mock.calls[0][0] as FormData;
        expect(formDataArg.get("responsibleParty")).toBe("client");
      });
    });
  });
});

// ============================================================================
// TaskForm Tests
// ============================================================================

describe("TaskForm", () => {
  const mockOnSuccess = vi.fn();
  const mockClearDraft = vi.fn();
  const mockMatters = [
    { id: "matter-1", title: "First Matter" },
    { id: "matter-2", title: "Second Matter" },
    { id: "matter-3", title: "Third Matter" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useDraftPersistence as Mock).mockReturnValue({
      clearDraft: mockClearDraft,
      hasDraft: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("rendering", () => {
    it("renders all form fields", () => {
      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Check all fields are present
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/matter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/responsible party/i)).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      expect(screen.getByRole("button", { name: /create task/i })).toBeInTheDocument();
    });

    it("renders matter options in select", () => {
      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      const matterSelect = screen.getByLabelText(/matter/i);

      // Check options exist
      expect(matterSelect.querySelector('option[value="matter-1"]')).toBeInTheDocument();
      expect(matterSelect.querySelector('option[value="matter-2"]')).toBeInTheDocument();
      expect(matterSelect.querySelector('option[value="matter-3"]')).toBeInTheDocument();
    });

    it("renders empty matter options when no matters provided", () => {
      render(<TaskForm matters={[]} onSuccess={mockOnSuccess} />);

      const matterSelect = screen.getByLabelText(/matter/i);

      // Only placeholder option should exist
      const options = matterSelect.querySelectorAll("option");
      expect(options).toHaveLength(1); // Just the placeholder
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("validation", () => {
    it("shows error when submitting with empty title", async () => {
      const user = userEvent.setup();
      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Select a matter but leave title empty
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit the form
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it("shows error when submitting without selecting a matter", async () => {
      const user = userEvent.setup();
      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill title but don't select matter
      await user.type(screen.getByLabelText(/title/i), "Test Task");

      // Submit the form
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByText(/please select a matter/i)).toBeInTheDocument();
      });
    });

    it("does not call createTask on validation failure", async () => {
      const user = userEvent.setup();
      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Submit without filling required fields
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for validation
      await waitFor(() => {
        expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
      });

      // Server action should not be called
      expect(createTask).not.toHaveBeenCalled();
    });

    it("shows multiple validation errors when multiple fields invalid", async () => {
      const user = userEvent.setup();
      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Submit without filling any fields
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for validation errors
      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        expect(alerts.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // ==========================================================================
  // Submission Tests
  // ==========================================================================

  describe("form submission", () => {
    it("calls createTask with valid data", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out the form
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for submission
      await waitFor(() => {
        expect(createTask).toHaveBeenCalledTimes(1);
      });

      // Verify FormData was created with correct values
      const formDataArg = (createTask as Mock).mock.calls[0][0] as FormData;
      expect(formDataArg.get("title")).toBe("Test Task");
      expect(formDataArg.get("matterId")).toBe("matter-1");
      expect(formDataArg.get("responsibleParty")).toBe("lawyer");
    });

    it("includes due date when provided", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out the form with due date
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Set due date - using fireEvent because userEvent doesn't handle date inputs well
      const dueDateInput = screen.getByLabelText(/due date/i);
      fireEvent.change(dueDateInput, { target: { value: "2025-12-25" } });

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for submission
      await waitFor(() => {
        const formDataArg = (createTask as Mock).mock.calls[0][0] as FormData;
        expect(formDataArg.get("dueDate")).toBe("2025-12-25");
      });
    });

    it("shows success toast on successful submission", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for success
      await waitFor(() => {
        expect(showFormSuccess).toHaveBeenCalledWith("Task", "created");
      });
    });

    it("calls onSuccess callback on successful submission", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for callback
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("clears draft on successful submission", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for draft clear
      await waitFor(() => {
        expect(mockClearDraft).toHaveBeenCalledTimes(1);
      });
    });

    it("shows error toast on failed submission", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ error: "Database error" });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for error toast
      await waitFor(() => {
        expect(showFormError).toHaveBeenCalledWith(
          "Task",
          "create",
          expect.objectContaining({ onRetry: expect.any(Function) })
        );
      });
    });

    it("does not call onSuccess on failed submission", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ error: "Database error" });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for error
      await waitFor(() => {
        expect(showFormError).toHaveBeenCalled();
      });

      // onSuccess should not be called
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("does not clear draft on failed submission", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ error: "Database error" });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Wait for error
      await waitFor(() => {
        expect(showFormError).toHaveBeenCalled();
      });

      // clearDraft should not be called
      expect(mockClearDraft).not.toHaveBeenCalled();
    });

    it("disables submit button during submission", async () => {
      const user = userEvent.setup();
      // Create a delayed promise to simulate network request
      let resolvePromise: (value: { ok: boolean }) => void;
      const promise = new Promise<{ ok: boolean }>((resolve) => {
        resolvePromise = resolve;
      });
      (createTask as Mock).mockReturnValue(promise);

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create task/i });
      await user.click(submitButton);

      // Button should be disabled and show loading text
      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent(/creating/i);
      });

      // Resolve the promise
      resolvePromise!({ ok: true });

      // Button should be enabled again
      await waitFor(() => {
        const button = screen.getByRole("button", { name: /create task/i });
        expect(button).not.toBeDisabled();
      });
    });
  });

  // ==========================================================================
  // Select Field Tests
  // ==========================================================================

  describe("select fields", () => {
    it("allows selecting different matters", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill required title
      await user.type(screen.getByLabelText(/title/i), "Test Task");

      // Select second matter
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-2");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Verify selection
      await waitFor(() => {
        const formDataArg = (createTask as Mock).mock.calls[0][0] as FormData;
        expect(formDataArg.get("matterId")).toBe("matter-2");
      });
    });

    it("allows selecting responsible party", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(<TaskForm matters={mockMatters} onSuccess={mockOnSuccess} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "matter-1");

      // Change responsible party
      await user.selectOptions(screen.getByLabelText(/responsible party/i), "client");

      // Submit
      await user.click(screen.getByRole("button", { name: /create task/i }));

      // Verify selection
      await waitFor(() => {
        const formDataArg = (createTask as Mock).mock.calls[0][0] as FormData;
        expect(formDataArg.get("responsibleParty")).toBe("client");
      });
    });
  });
});

// ============================================================================
// FormField Component Integration Tests
// ============================================================================

describe("FormField integration with forms", () => {
  const mockOnSuccess = vi.fn();
  const mockClearDraft = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDraftPersistence as Mock).mockReturnValue({
      clearDraft: mockClearDraft,
      hasDraft: false,
    });
  });

  describe("accessibility", () => {
    it("associates labels with inputs correctly", () => {
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Labels should be associated with inputs via htmlFor/id
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveAttribute("id");
      expect(titleInput.id).toBeTruthy();
    });

    it("sets aria-invalid on invalid fields", async () => {
      const user = userEvent.setup();
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Submit without filling required fields
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for validation
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i);
        expect(titleInput).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("associates error messages with inputs via aria-describedby", async () => {
      const user = userEvent.setup();
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Submit without filling required fields
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for validation
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i);
        const ariaDescribedBy = titleInput.getAttribute("aria-describedby");
        expect(ariaDescribedBy).toBeTruthy();

        // The error element should exist with this id
        const errorElement = document.getElementById(ariaDescribedBy!);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/title is required/i);
      });
    });
  });

  describe("error display", () => {
    it("shows error message below field", async () => {
      const user = userEvent.setup();
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Submit without filling required fields
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for validation
      await waitFor(() => {
        const errorMessage = screen.getByText(/title is required/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass("text-red-500");
      });
    });

    it("clears error when field becomes valid", async () => {
      const user = userEvent.setup();
      render(<MatterForm onSuccess={mockOnSuccess} />);

      // Submit without filling required fields to trigger error
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      // Now fill in the title
      await user.type(screen.getByLabelText(/title/i), "Test Matter");

      // Submit again
      (createMatter as Mock).mockResolvedValue({ ok: true });
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Toast Integration Tests
// ============================================================================

describe("Toast notifications integration", () => {
  const mockOnSuccess = vi.fn();
  const mockClearDraft = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDraftPersistence as Mock).mockReturnValue({
      clearDraft: mockClearDraft,
      hasDraft: false,
    });
  });

  describe("success toasts", () => {
    it("shows success toast with correct entity name for MatterForm", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/title/i), "Test Matter");
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      await waitFor(() => {
        expect(showFormSuccess).toHaveBeenCalledWith("Matter", "created");
      });
    });

    it("shows success toast with correct entity name for TaskForm", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ ok: true });

      render(
        <TaskForm
          matters={[{ id: "m-1", title: "Matter" }]}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "m-1");
      await user.click(screen.getByRole("button", { name: /create task/i }));

      await waitFor(() => {
        expect(showFormSuccess).toHaveBeenCalledWith("Task", "created");
      });
    });
  });

  describe("error toasts", () => {
    it("shows error toast with retry option for MatterForm", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ error: "Server error" });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/title/i), "Test Matter");
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      await waitFor(() => {
        expect(showFormError).toHaveBeenCalledWith(
          "Matter",
          "create",
          expect.objectContaining({
            onRetry: expect.any(Function),
          })
        );
      });
    });

    it("shows error toast with retry option for TaskForm", async () => {
      const user = userEvent.setup();
      (createTask as Mock).mockResolvedValue({ error: "Server error" });

      render(
        <TaskForm
          matters={[{ id: "m-1", title: "Matter" }]}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByLabelText(/title/i), "Test Task");
      await user.selectOptions(screen.getByLabelText(/matter/i), "m-1");
      await user.click(screen.getByRole("button", { name: /create task/i }));

      await waitFor(() => {
        expect(showFormError).toHaveBeenCalledWith(
          "Task",
          "create",
          expect.objectContaining({
            onRetry: expect.any(Function),
          })
        );
      });
    });

    it("retry function triggers form resubmission", async () => {
      const user = userEvent.setup();
      (createMatter as Mock).mockResolvedValue({ error: "Server error" });

      render(<MatterForm ownerId="user-123" onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/title/i), "Test Matter");
      await user.click(screen.getByRole("button", { name: /create matter/i }));

      // Wait for error toast call
      await waitFor(() => {
        expect(showFormError).toHaveBeenCalled();
      });

      // Get the retry function from the mock call
      const errorCall = (showFormError as Mock).mock.calls[0];
      const options = errorCall[2];
      const retryFn = options.onRetry;

      // Clear the mock to track retry
      (createMatter as Mock).mockClear();
      (createMatter as Mock).mockResolvedValue({ ok: true });

      // Call the retry function
      await retryFn();

      // Should have called createMatter again
      await waitFor(() => {
        expect(createMatter).toHaveBeenCalledTimes(1);
      });
    });
  });
});

// ============================================================================
// Draft Persistence Integration Tests
// ============================================================================

describe("Draft persistence integration", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes useDraftPersistence with correct formId for MatterForm", () => {
    render(<MatterForm onSuccess={mockOnSuccess} />);

    expect(useDraftPersistence).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: "matter-create",
      })
    );
  });

  it("initializes useDraftPersistence with correct formId for TaskForm", () => {
    render(
      <TaskForm matters={[]} onSuccess={mockOnSuccess} />
    );

    expect(useDraftPersistence).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: "task-create",
      })
    );
  });
});

// ============================================================================
// Unsaved Changes Integration Tests
// ============================================================================

describe("Unsaved changes integration", () => {
  const mockOnSuccess = vi.fn();
  const mockClearDraft = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDraftPersistence as Mock).mockReturnValue({
      clearDraft: mockClearDraft,
      hasDraft: false,
    });
  });

  it("MatterForm uses useUnsavedChanges hook", () => {
    render(<MatterForm onSuccess={mockOnSuccess} />);

    expect(useUnsavedChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        isDirty: expect.any(Boolean),
      })
    );
  });

  it("TaskForm uses useUnsavedChanges hook", () => {
    render(<TaskForm matters={[]} onSuccess={mockOnSuccess} />);

    expect(useUnsavedChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        isDirty: expect.any(Boolean),
      })
    );
  });
});
