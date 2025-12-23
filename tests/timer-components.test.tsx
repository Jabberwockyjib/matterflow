import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FloatingTimerButton } from "@/components/timer/floating-timer-button";
import { MatterSelect } from "@/components/timer/matter-select";
import { TimerModal } from "@/components/timer/timer-modal";
import type { MatterSummary } from "@/lib/data/queries";
import type { TimerState } from "@/types/timer.types";

// Mock the timer context
const mockState: TimerState = {
  isRunning: false,
  status: "idle",
  startTime: null,
  elapsedSeconds: 0,
  suggestedMatterId: null,
  selectedMatterId: null,
  notes: "",
  activeEntryId: null,
  error: null,
};

const mockActions = {
  start: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
  updateNotes: vi.fn(),
  updateMatter: vi.fn(),
  setSuggestedMatter: vi.fn(),
};

const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockToggleModal = vi.fn();
const mockClearRecoveryInfo = vi.fn();
const mockClearWarningInfo = vi.fn();

let mockIsModalOpen = false;
let mockTimerState: TimerState = { ...mockState };
let mockSuggestionReason: "current_page" | "recent_activity" | "last_timer" | "most_active_this_week" | "none" | null = null;
const mockRecoveryInfo: unknown = null;
const mockWarningInfo: unknown = null;

vi.mock("@/contexts/timer-context", () => ({
  useTimer: () => ({
    state: mockTimerState,
    actions: mockActions,
    isModalOpen: mockIsModalOpen,
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
    toggleModal: mockToggleModal,
    suggestionReason: mockSuggestionReason,
    recoveryInfo: mockRecoveryInfo,
    clearRecoveryInfo: mockClearRecoveryInfo,
    warningInfo: mockWarningInfo,
    clearWarningInfo: mockClearWarningInfo,
  }),
}));

/**
 * Sample matters for testing
 */
const sampleMatters: MatterSummary[] = [
  {
    id: "matter-1",
    title: "Smith v. Jones",
    matterType: "Litigation",
    stage: "Active",
    nextAction: "Review documents",
    responsibleParty: "lawyer",
    billingModel: "hourly",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "matter-2",
    title: "Johnson Contract Review",
    matterType: "Contract",
    stage: "Review",
    nextAction: "Client approval",
    responsibleParty: "client",
    billingModel: "flat",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "matter-3",
    title: "Brown Estate Planning",
    matterType: "Estate",
    stage: "Drafting",
    nextAction: "Final review",
    responsibleParty: "lawyer",
    billingModel: "hourly",
    updatedAt: "2024-01-03T00:00:00Z",
  },
];

describe("FloatingTimerButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = { ...mockState };
    mockIsModalOpen = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders in fixed position at bottom-right", () => {
      render(<FloatingTimerButton />);

      const container = screen.getByRole("button").parentElement;
      expect(container).toHaveClass("fixed", "bottom-6", "right-6", "z-50");
    });

    it("renders timer icon when not running", () => {
      mockTimerState = { ...mockState, isRunning: false };
      render(<FloatingTimerButton />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Start timer");
    });

    it("renders stop icon with elapsed time when running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3661, // 1:01:01
      };
      render(<FloatingTimerButton />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        "Stop timer. Elapsed time: 01:01:01"
      );
      expect(screen.getByText("01:01:01")).toBeInTheDocument();
    });
  });

  describe("state changes", () => {
    it("shows secondary variant when timer is idle", () => {
      mockTimerState = { ...mockState, isRunning: false };
      render(<FloatingTimerButton />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-white", "border-slate-300");
    });

    it("shows primary variant when timer is running", () => {
      mockTimerState = { ...mockState, isRunning: true };
      render(<FloatingTimerButton />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-blue-600");
    });

    it("shows pulse animation when timer is running", () => {
      mockTimerState = { ...mockState, isRunning: true };
      render(<FloatingTimerButton />);

      const pulseElement = document.querySelector(".animate-ping");
      expect(pulseElement).toBeInTheDocument();
    });

    it("does not show pulse animation when timer is idle", () => {
      mockTimerState = { ...mockState, isRunning: false };
      render(<FloatingTimerButton />);

      const pulseElement = document.querySelector(".animate-ping");
      expect(pulseElement).not.toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls openModal when clicked", async () => {
      const user = userEvent.setup();
      render(<FloatingTimerButton />);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("has correct aria-label when idle", () => {
      mockTimerState = { ...mockState, isRunning: false };
      render(<FloatingTimerButton />);

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Start timer"
      );
    });

    it("has correct aria-label when running with elapsed time", () => {
      mockTimerState = { ...mockState, isRunning: true, elapsedSeconds: 120 };
      render(<FloatingTimerButton />);

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Stop timer. Elapsed time: 00:02:00"
      );
    });

    it("has aria-keyshortcuts attribute", () => {
      render(<FloatingTimerButton />);

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-keyshortcuts",
        "Control+T Meta+T"
      );
    });

    it("has hidden icons for screen readers", () => {
      render(<FloatingTimerButton />);

      const svgElements = document.querySelectorAll("svg");
      svgElements.forEach((svg) => {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("elapsed time formatting", () => {
    it("formats elapsed time as HH:MM:SS", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3723, // 1:02:03
      };
      render(<FloatingTimerButton />);

      expect(screen.getByText("01:02:03")).toBeInTheDocument();
    });

    it("formats zero elapsed time correctly", () => {
      mockTimerState = { ...mockState, isRunning: true, elapsedSeconds: 0 };
      render(<FloatingTimerButton />);

      expect(screen.getByText("00:00:00")).toBeInTheDocument();
    });

    it("formats large elapsed times correctly", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 36000, // 10:00:00
      };
      render(<FloatingTimerButton />);

      expect(screen.getByText("10:00:00")).toBeInTheDocument();
    });
  });
});

describe("TimerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = { ...mockState };
    mockIsModalOpen = true;
    mockSuggestionReason = null;
    // Reset body styles
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = "";
  });

  describe("visibility", () => {
    it("renders when isModalOpen is true", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not render when isModalOpen is false", () => {
      mockIsModalOpen = false;
      render(<TimerModal matters={sampleMatters} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("open/close behavior", () => {
    it("closes when backdrop is clicked", async () => {
      const user = userEvent.setup();
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      // Click the backdrop (the outer div with bg-black/50)
      // The backdrop is the element with role="dialog" (the outer wrapper)
      const backdrop = screen.getByRole("dialog");
      await user.click(backdrop);

      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });

    it("does not close when modal content is clicked", async () => {
      const user = userEvent.setup();
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      // Click inside the modal content (on the Notes label)
      const notesLabel = screen.getByText("Notes");
      await user.click(notesLabel);

      expect(mockCloseModal).not.toHaveBeenCalled();
    });

    it("closes when Escape key is pressed", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });

    it("closes when X button is clicked", async () => {
      const user = userEvent.setup();
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const closeButton = screen.getByRole("button", {
        name: /close timer modal/i,
      });
      await user.click(closeButton);

      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });

    it("closes when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });

    it("prevents body scroll when open", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when unmounted", () => {
      mockIsModalOpen = true;
      const { unmount } = render(<TimerModal matters={sampleMatters} />);

      expect(document.body.style.overflow).toBe("hidden");

      unmount();

      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("matter selection flow", () => {
    it("renders matter dropdown with all matters", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const select = screen.getByRole("combobox");
      const options = within(select).getAllByRole("option");

      // Placeholder + 3 matters
      expect(options).toHaveLength(4);
      expect(options[1]).toHaveTextContent("Smith v. Jones (Litigation)");
      expect(options[2]).toHaveTextContent("Johnson Contract Review (Contract)");
      expect(options[3]).toHaveTextContent("Brown Estate Planning (Estate)");
    });

    it("calls updateMatter when matter is selected", async () => {
      const user = userEvent.setup();
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-2");

      expect(mockActions.updateMatter).toHaveBeenCalledWith("matter-2");
    });

    it("shows suggestion hint when suggested matter is selected", () => {
      mockTimerState = {
        ...mockState,
        suggestedMatterId: "matter-1",
        selectedMatterId: "matter-1",
      };
      mockIsModalOpen = true;
      mockSuggestionReason = "current_page";
      render(<TimerModal matters={sampleMatters} />);

      expect(
        screen.getByText("Suggested based on current page")
      ).toBeInTheDocument();
    });

    it("does not show suggestion hint when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        suggestedMatterId: "matter-1",
        selectedMatterId: "matter-1",
      };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(
        screen.queryByText("Suggested based on your current context")
      ).not.toBeInTheDocument();
    });

    it("disables matter selection when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });
  });

  describe("notes input", () => {
    it("renders notes textarea", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      // Uses label text "Notes" with accessible name
      const textarea = screen.getByRole("textbox", { name: /notes/i });
      expect(textarea).toBeInTheDocument();
    });

    it("syncs notes with timer state", () => {
      mockTimerState = { ...mockState, notes: "Initial notes" };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const textarea = screen.getByRole("textbox", { name: /notes/i });
      expect(textarea).toHaveValue("Initial notes");
    });

    it("calls updateNotes when notes are changed", async () => {
      const user = userEvent.setup();
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const textarea = screen.getByRole("textbox", { name: /notes/i });
      await user.type(textarea, "Test note");

      expect(mockActions.updateNotes).toHaveBeenCalled();
    });
  });

  describe("start/stop buttons", () => {
    it("shows Start button when timer is idle", () => {
      mockTimerState = { ...mockState, isRunning: false };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(
        screen.getByRole("button", { name: /start timer/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /stop timer/i })
      ).not.toBeInTheDocument();
    });

    it("shows Stop button when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(
        screen.getByRole("button", { name: /stop timer/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /start timer/i })
      ).not.toBeInTheDocument();
    });

    it("disables Start button when no matter is selected", () => {
      mockTimerState = { ...mockState, selectedMatterId: null };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const startButton = screen.getByRole("button", { name: /start timer/i });
      expect(startButton).toBeDisabled();
    });

    it("enables Start button when matter is selected", () => {
      mockTimerState = { ...mockState, selectedMatterId: "matter-1" };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const startButton = screen.getByRole("button", { name: /start timer/i });
      expect(startButton).not.toBeDisabled();
    });

    it("calls start action when Start button is clicked", async () => {
      const user = userEvent.setup();
      mockTimerState = { ...mockState, selectedMatterId: "matter-1" };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const startButton = screen.getByRole("button", { name: /start timer/i });
      await user.click(startButton);

      expect(mockActions.start).toHaveBeenCalledWith("matter-1", "");
    });

    it("calls stop action when Stop button is clicked", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
        activeEntryId: "entry-1",
      };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      await user.click(stopButton);

      expect(mockActions.stop).toHaveBeenCalled();
    });
  });

  describe("elapsed time display", () => {
    it("shows elapsed time when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3661,
        selectedMatterId: "matter-1",
      };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(screen.getByText("01:01:01")).toBeInTheDocument();
    });

    it("shows matter name when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(screen.getByText("Smith v. Jones")).toBeInTheDocument();
    });

    it("does not show elapsed time display when timer is idle", () => {
      mockTimerState = { ...mockState, isRunning: false };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      // The elapsed time display is in a blue background section
      const blueSection = document.querySelector(".bg-blue-50");
      expect(blueSection).not.toBeInTheDocument();
    });
  });

  describe("modal header", () => {
    it('shows "Start Timer" title when idle', () => {
      mockTimerState = { ...mockState, isRunning: false };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      // Use getByRole to target the heading specifically (not the button text)
      expect(screen.getByRole("heading", { name: "Start Timer" })).toBeInTheDocument();
    });

    it('shows "Timer Running" title when running', () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(screen.getByRole("heading", { name: "Timer Running" })).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has role dialog", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has aria-modal attribute", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has aria-labelledby pointing to title", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "timer-modal-title");

      const title = document.getElementById("timer-modal-title");
      expect(title).toBeInTheDocument();
    });

    it("focuses first focusable element on open", async () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      // The select should be focused
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toHaveFocus();
      });
    });
  });

  describe("keyboard navigation", () => {
    it("traps focus within modal on Tab", async () => {
      const user = userEvent.setup();
      mockIsModalOpen = true;
      mockTimerState = { ...mockState, selectedMatterId: "matter-1" };
      render(<TimerModal matters={sampleMatters} />);

      // Start at the select
      const select = screen.getByRole("combobox");
      select.focus();

      // Tab through all focusable elements - should eventually wrap back
      // The focusable elements are: select, textarea, close button, cancel button, start button
      for (let i = 0; i < 6; i++) {
        await user.tab();
      }

      // After cycling through, focus should be back on an element inside the modal
      const activeElement = document.activeElement;
      const modal = screen.getByRole("dialog").parentElement!.querySelector('[role="dialog"]')!.parentElement!;
      expect(modal.contains(activeElement)).toBe(true);
    });

    it("closes on Escape key press", () => {
      mockIsModalOpen = true;
      render(<TimerModal matters={sampleMatters} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockCloseModal).toHaveBeenCalled();
    });
  });
});

describe("MatterSelect", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders select element with placeholder", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();

      // Check placeholder option
      const options = within(select).getAllByRole("option");
      expect(options[0]).toHaveTextContent("Select a matter");
    });

    it("renders all matter options", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole("combobox");
      const options = within(select).getAllByRole("option");

      expect(options).toHaveLength(4); // Placeholder + 3 matters
      expect(options[1]).toHaveTextContent("Smith v. Jones (Litigation)");
      expect(options[2]).toHaveTextContent("Johnson Contract Review (Contract)");
      expect(options[3]).toHaveTextContent("Brown Estate Planning (Estate)");
    });

    it("renders with label when provided", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
          label="Matter"
        />
      );

      expect(screen.getByText("Matter")).toBeInTheDocument();
    });

    it("shows required indicator when required and no value", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
          label="Matter"
          required
        />
      );

      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onChange when option is selected", async () => {
      const user = userEvent.setup();
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-2");

      expect(mockOnChange).toHaveBeenCalledWith("matter-2");
    });

    it("shows current value as selected", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("matter-1");
    });

    it("does not call onChange when placeholder is selected", async () => {
      const user = userEvent.setup();
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "");

      // onChange should not be called with empty string (placeholder is disabled)
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("suggestion hint", () => {
    it("shows suggestion hint when value matches suggestedMatterId", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          suggestedMatterId="matter-1"
          onChange={mockOnChange}
        />
      );

      expect(
        screen.getByText("Suggested based on your current context")
      ).toBeInTheDocument();
    });

    it("does not show suggestion hint when value differs from suggestedMatterId", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-2"
          suggestedMatterId="matter-1"
          onChange={mockOnChange}
        />
      );

      expect(
        screen.queryByText("Suggested based on your current context")
      ).not.toBeInTheDocument();
    });

    it("does not show suggestion hint when showSuggestionHint is false", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          suggestedMatterId="matter-1"
          onChange={mockOnChange}
          showSuggestionHint={false}
        />
      );

      expect(
        screen.queryByText("Suggested based on your current context")
      ).not.toBeInTheDocument();
    });

    it("shows custom suggestion hint text when provided", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          suggestedMatterId="matter-1"
          onChange={mockOnChange}
          suggestionHintText="Custom suggestion message"
        />
      );

      expect(screen.getByText("Custom suggestion message")).toBeInTheDocument();
    });

    it("applies blue styling when suggestion is selected", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          suggestedMatterId="matter-1"
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveClass("border-blue-300", "ring-1", "ring-blue-200");
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no matters", () => {
      render(
        <MatterSelect matters={[]} value={null} onChange={mockOnChange} />
      );

      expect(
        screen.getByText("No matters found. Please create a matter first.")
      ).toBeInTheDocument();
    });

    it("disables select when no matters", () => {
      render(
        <MatterSelect matters={[]} value={null} onChange={mockOnChange} />
      );

      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });

    it("shows different placeholder when no matters", () => {
      render(
        <MatterSelect matters={[]} value={null} onChange={mockOnChange} />
      );

      const select = screen.getByRole("combobox");
      const options = within(select).getAllByRole("option");
      expect(options[0]).toHaveTextContent("No matters available");
    });
  });

  describe("disabled state", () => {
    it("disables select when disabled prop is true", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          onChange={mockOnChange}
          disabled
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });

    it("does not show suggestion hint when disabled", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          suggestedMatterId="matter-1"
          onChange={mockOnChange}
          disabled
        />
      );

      expect(
        screen.queryByText("Suggested based on your current context")
      ).not.toBeInTheDocument();
    });

    it("applies disabled styling", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          onChange={mockOnChange}
          disabled
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveClass("disabled:bg-slate-100", "disabled:cursor-not-allowed");
    });
  });

  describe("accessibility", () => {
    it("has aria-required when required", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
          required
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-required", "true");
    });

    it("has aria-invalid when required and no value", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
          required
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-invalid", "true");
    });

    it("does not have aria-invalid when value is provided", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          onChange={mockOnChange}
          required
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).not.toHaveAttribute("aria-invalid");
    });

    it("has aria-describedby when suggestion hint is shown", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value="matter-1"
          suggestedMatterId="matter-1"
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole("combobox");
      const describedBy = select.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();

      // Verify the hint element exists with that ID
      const hintElement = document.getElementById(describedBy!);
      expect(hintElement).toHaveTextContent(
        "Suggested based on your current context"
      );
    });

    it("supports ref forwarding", () => {
      const ref = vi.fn();
      render(
        <MatterSelect
          ref={ref}
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
        />
      );

      expect(ref).toHaveBeenCalledWith(expect.any(HTMLSelectElement));
    });

    it("has custom chevron icon hidden from screen readers", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
        />
      );

      const chevronContainer = document.querySelector(
        '[aria-hidden="true"]'
      );
      expect(chevronContainer).toBeInTheDocument();
    });
  });

  describe("custom placeholder", () => {
    it("shows custom placeholder when provided", () => {
      render(
        <MatterSelect
          matters={sampleMatters}
          value={null}
          onChange={mockOnChange}
          placeholder="Choose a matter..."
        />
      );

      const select = screen.getByRole("combobox");
      const options = within(select).getAllByRole("option");
      expect(options[0]).toHaveTextContent("Choose a matter...");
    });
  });
});
