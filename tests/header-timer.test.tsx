import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderTimerDisplay } from "@/components/timer/header-timer-display";
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

let mockTimerState: TimerState = { ...mockState };

vi.mock("@/contexts/timer-context", () => ({
  useTimer: () => ({
    state: mockTimerState,
    actions: mockActions,
    isModalOpen: false,
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
    toggleModal: mockToggleModal,
    suggestionReason: null,
    recoveryInfo: null,
    clearRecoveryInfo: mockClearRecoveryInfo,
    warningInfo: null,
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
    title: "Brown Estate Planning Long Title That Should Be Truncated",
    matterType: "Estate",
    stage: "Drafting",
    nextAction: "Final review",
    responsibleParty: "lawyer",
    billingModel: "hourly",
    updatedAt: "2024-01-03T00:00:00Z",
  },
];

describe("HeaderTimerDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = { ...mockState };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("visibility", () => {
    it("does not render when timer is not running", () => {
      mockTimerState = { ...mockState, isRunning: false };
      const { container } = render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(container.firstChild).toBeNull();
    });

    it("renders when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByRole("button", { name: /timer running/i })).toBeInTheDocument();
    });
  });

  describe("time format display", () => {
    it("displays elapsed time in HH:MM:SS format", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3661, // 1:01:01
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByText("01:01:01")).toBeInTheDocument();
    });

    it("displays zero elapsed time correctly", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 0,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByText("00:00:00")).toBeInTheDocument();
    });

    it("displays large elapsed times correctly", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 36000, // 10:00:00
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByText("10:00:00")).toBeInTheDocument();
    });

    it("formats single-digit hours, minutes, and seconds with leading zeros", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3723, // 1:02:03
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByText("01:02:03")).toBeInTheDocument();
    });

    it("handles 24+ hour timers correctly", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 90061, // 25:01:01
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByText("25:01:01")).toBeInTheDocument();
    });
  });

  describe("matter name display", () => {
    it("displays the selected matter name", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      // Matter name appears with truncation
      expect(screen.getByText(/Smith v. Jones/)).toBeInTheDocument();
    });

    it("truncates long matter names", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-3",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      // The truncated name should contain ellipsis
      const matterNameElement = screen.getByText(/Brown Estate/);
      expect(matterNameElement.textContent).toContain("…");
    });

    it("shows 'Unknown Matter' when matter is not found", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "non-existent-matter",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByText(/Unknown Matter/)).toBeInTheDocument();
    });

    it("shows full matter name in title attribute for tooltip", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-3",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      // The full matter name should be in the title attribute
      const matterNameElement = screen.getByTitle(
        "Brown Estate Planning Long Title That Should Be Truncated"
      );
      expect(matterNameElement).toBeInTheDocument();
    });
  });

  describe("click to open modal", () => {
    it("calls openModal when timer display is clicked", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      await user.click(timerButton);

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("does not call openModal when stop button is clicked", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      await user.click(stopButton);

      expect(mockOpenModal).not.toHaveBeenCalled();
    });
  });

  describe("stop button functionality", () => {
    it("renders stop button when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      expect(screen.getByRole("button", { name: /stop timer/i })).toBeInTheDocument();
    });

    it("calls stop action when stop button is clicked", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
        notes: "Test notes",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      await user.click(stopButton);

      expect(mockActions.stop).toHaveBeenCalledWith("Test notes");
    });

    it("shows loading spinner when stop is pending", async () => {
      const user = userEvent.setup();
      // Make the stop action hang so we can check the loading state
      mockActions.stop.mockImplementation(() => new Promise(() => {}));

      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      await user.click(stopButton);

      // Wait for the button to show loading state
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /stopping timer/i })).toBeInTheDocument();
      });
    });

    it("disables stop button while pending", async () => {
      const user = userEvent.setup();
      mockActions.stop.mockImplementation(() => new Promise(() => {}));

      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      await user.click(stopButton);

      await waitFor(() => {
        const pendingButton = screen.getByRole("button", { name: /stopping timer/i });
        expect(pendingButton).toBeDisabled();
      });
    });

    it("stop button click does not propagate to parent", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      await user.click(stopButton);

      // openModal should not be called because click was stopped from propagating
      expect(mockOpenModal).not.toHaveBeenCalled();
    });
  });

  describe("styling and layout", () => {
    it("has entrance animation classes", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      const { container } = render(<HeaderTimerDisplay matters={sampleMatters} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("animate-in", "fade-in-0", "slide-in-from-right-4");
    });

    it("timer display has blue theme styling", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      expect(timerButton).toHaveClass("bg-blue-50", "border-blue-200", "text-blue-700");
    });

    it("stop button has red theme styling", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      expect(stopButton).toHaveClass("bg-red-50", "border-red-200", "text-red-600");
    });

    it("elapsed time uses monospace font for consistent width", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      // Find the span containing the elapsed time
      const timeText = screen.getByText("00:00:00");
      expect(timeText).toHaveClass("font-mono", "tabular-nums");
    });

    it("has rounded pill shape for timer display", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      expect(timerButton).toHaveClass("rounded-full");
    });
  });

  describe("responsive behavior", () => {
    it("matter name has responsive visibility class", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      // Find the matter name element (it has hidden sm:inline classes)
      const matterNameElement = screen.getByTitle("Smith v. Jones");
      expect(matterNameElement).toHaveClass("hidden", "sm:inline");
    });
  });

  describe("accessibility", () => {
    it("timer display button has descriptive aria-label", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 120,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      expect(timerButton).toHaveAttribute(
        "aria-label",
        "Timer running: 00:02:00 on Smith v. Jones. Click to open timer details."
      );
    });

    it("stop button has aria-label when idle", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      expect(stopButton).toHaveAttribute("aria-label", "Stop timer");
    });

    it("stop button has loading aria-label when pending", async () => {
      const user = userEvent.setup();
      mockActions.stop.mockImplementation(() => new Promise(() => {}));

      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      await user.click(stopButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /stopping timer/i })).toBeInTheDocument();
      });
    });

    it("clock icon is hidden from screen readers", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it("stop button icon is hidden from screen readers", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      const icon = stopButton.querySelector('svg');
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("timer display is focusable", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      timerButton.focus();
      expect(document.activeElement).toBe(timerButton);
    });

    it("timer display has visible focus ring", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      expect(timerButton).toHaveClass("focus:ring-2", "focus:ring-blue-300");
    });
  });

  describe("keyboard interaction", () => {
    it("timer display can be activated with Enter key", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      timerButton.focus();
      await user.keyboard("{Enter}");

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("timer display can be activated with Space key", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const timerButton = screen.getByRole("button", { name: /timer running/i });
      timerButton.focus();
      await user.keyboard(" ");

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("stop button can be activated with Enter key", async () => {
      const user = userEvent.setup();
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={sampleMatters} />);

      const stopButton = screen.getByRole("button", { name: /stop timer/i });
      stopButton.focus();
      await user.keyboard("{Enter}");

      expect(mockActions.stop).toHaveBeenCalled();
    });
  });

  describe("empty matters array", () => {
    it("renders with empty matters array when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        selectedMatterId: "matter-1",
      };
      render(<HeaderTimerDisplay matters={[]} />);

      // Should still render with "Unknown Matter" since matter not found
      expect(screen.getByText(/Unknown Matter/)).toBeInTheDocument();
    });
  });
});
