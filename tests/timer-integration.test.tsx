import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimerProvider } from "@/contexts/timer-context";
import { FloatingTimerButton } from "@/components/timer/floating-timer-button";
import { TimerModal } from "@/components/timer/timer-modal";
import { HeaderTimerDisplay } from "@/components/timer/header-timer-display";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import type { MatterSummary } from "@/lib/data/queries";
import { DEFAULT_TIMER_CONFIG } from "@/types/timer.types";

// Mock next/navigation usePathname
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock server actions with controllable responses
let mockStartTimerResult: { ok?: boolean; entryId?: string; error?: string } = {
  ok: true,
  entryId: "test-entry-id",
};
let mockStopTimerResult: { ok?: boolean; entryId?: string; error?: string } = {
  ok: true,
  entryId: "test-entry-id",
};

vi.mock("@/lib/data/actions", () => ({
  startTimer: vi.fn(() => Promise.resolve(mockStartTimerResult)),
  stopTimer: vi.fn(() => Promise.resolve(mockStopTimerResult)),
}));

// Import mocked actions for assertions
import { startTimer, stopTimer } from "@/lib/data/actions";

const STORAGE_KEY = DEFAULT_TIMER_CONFIG.storageKey;

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
    nextActionDueDate: "2024-06-18",
    responsibleParty: "lawyer",
    billingModel: "hourly",
    updatedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    clientName: "Smith",
    dueDate: "2024-06-18",
  },
  {
    id: "matter-2",
    title: "Johnson Contract Review",
    matterType: "Contract",
    stage: "Review",
    nextAction: "Client approval",
    nextActionDueDate: "2024-06-18",
    responsibleParty: "client",
    billingModel: "flat",
    updatedAt: "2024-01-02T00:00:00Z",
    createdAt: "2024-01-02T00:00:00Z",
    clientName: "Johnson",
    dueDate: "2024-06-18",
  },
  {
    id: "matter-3",
    title: "Brown Estate Planning",
    matterType: "Estate",
    stage: "Drafting",
    nextAction: "Final review",
    nextActionDueDate: "2024-06-18",
    responsibleParty: "lawyer",
    billingModel: "hourly",
    updatedAt: "2024-01-03T00:00:00Z",
    createdAt: "2024-01-03T00:00:00Z",
    clientName: "Brown",
    dueDate: "2024-06-18",
  },
];

/**
 * Recent entries for matter suggestion testing
 */
const recentEntries = [
  { matter_id: "matter-2", started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { matter_id: "matter-1", started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
];

/**
 * Mock localStorage for testing
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

/**
 * Full timer interface component that combines all timer UI elements
 */
function FullTimerInterface({ matters }: { matters: MatterSummary[] }) {
  return (
    <>
      <KeyboardShortcuts />
      <FloatingTimerButton />
      <TimerModal matters={matters} />
      <HeaderTimerDisplay matters={matters} />
    </>
  );
}

/**
 * Render helper for integration tests
 */
function renderTimerApp(matters: MatterSummary[] = sampleMatters, entries = recentEntries) {
  return render(
    <TimerProvider recentEntries={entries}>
      <FullTimerInterface matters={matters} />
    </TimerProvider>
  );
}

/**
 * Helper to get the floating timer button (has aria-keyshortcuts)
 */
function getFloatingButton() {
  return screen.getByRole("button", { name: /start timer/i });
}

/**
 * Helper to get the modal start button (inside the dialog)
 */
function getModalStartButton() {
  const dialog = screen.getByRole("dialog");
  return within(dialog).getByRole("button", { name: /start timer/i });
}

/**
 * Helper to get the modal stop button (inside the dialog)
 */
function getModalStopButton() {
  const dialog = screen.getByRole("dialog");
  return within(dialog).getByRole("button", { name: /stop timer/i });
}

/**
 * Helper to get the header stop button (not inside dialog)
 */
function getHeaderStopButton() {
  const headerRegion = screen.getByRole("region", { name: /active timer/i });
  return within(headerRegion).getByRole("button", { name: /stop timer/i });
}

describe("Timer Integration Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset mock results to defaults
    mockStartTimerResult = { ok: true, entryId: "test-entry-id" };
    mockStopTimerResult = { ok: true, entryId: "test-entry-id" };
    // Reset pathname
    mockPathname = "/";
    // Reset body styles
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorageMock.clear();
    document.body.style.overflow = "";
  });

  describe("2-click timer start flow", () => {
    it("starts timer with 2 clicks: click button to open, click start to begin", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Verify floating button is visible
      const floatingButton = getFloatingButton();
      expect(floatingButton).toBeInTheDocument();

      // Click 1: Open the modal
      await user.click(floatingButton);

      // Modal should be visible
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Select a matter
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      // Click 2: Start the timer (use the modal button)
      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for async actions to complete
      await waitFor(() => {
        expect(startTimer).toHaveBeenCalledWith("matter-1", "");
      });
    });

    it("completes full workflow: open -> select matter -> add notes -> start", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Click floating button to open modal
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      // Select a matter
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-2");

      // Add notes
      const notesInput = screen.getByRole("textbox", { name: /notes/i });
      await user.type(notesInput, "Working on contract review");

      // Start timer
      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for async actions to complete
      await waitFor(() => {
        expect(startTimer).toHaveBeenCalledWith("matter-2", "Working on contract review");
      });
    });

    it("pre-selects suggested matter based on route context", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      // Set pathname to a matter page
      mockPathname = "/matters/matter-1/time";

      renderTimerApp();

      // Open modal
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      // Verify matter is pre-selected
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("matter-1");

      // Start timer (only 2 clicks needed because matter is pre-selected)
      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      await waitFor(() => {
        expect(startTimer).toHaveBeenCalledWith("matter-1", "");
      });
    });

    it("pre-selects suggested matter based on recent activity", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      // Use default pathname (not a matter page)
      mockPathname = "/dashboard";

      // Create recent entries with matter-2 being the most recent
      const recentEntriesForTest = [
        { matter_id: "matter-2", started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
      ];

      renderTimerApp(sampleMatters, recentEntriesForTest);

      // Open modal
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      // Verify matter is pre-selected based on recent activity
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("matter-2");
    });
  });

  describe("keyboard shortcut flow", () => {
    it("opens timer modal with Ctrl+T keyboard shortcut", async () => {
      renderTimerApp();

      // Verify modal is not open
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Press Ctrl+T using capture phase (like the hook does)
      await act(async () => {
        const event = new KeyboardEvent("keydown", {
          key: "t",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      });

      // Allow state to update
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("opens timer modal with Cmd+T (Meta+T) keyboard shortcut", async () => {
      renderTimerApp();

      // Press Cmd+T (Meta key for Mac)
      await act(async () => {
        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      });

      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("full keyboard workflow: shortcut -> select -> start", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Open modal with keyboard shortcut
      await act(async () => {
        const event = new KeyboardEvent("keydown", {
          key: "t",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Select matter
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-3");

      // Start timer
      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      await waitFor(() => {
        expect(startTimer).toHaveBeenCalledWith("matter-3", "");
      });
    });

    it("does not trigger shortcut when focused in input field", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Open modal first
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      // Focus on notes textarea
      const notesInput = screen.getByRole("textbox", { name: /notes/i });
      notesInput.focus();
      expect(document.activeElement).toBe(notesInput);

      // Try keyboard shortcut while in input - modal should remain open (not toggle)
      await act(async () => {
        const event = new KeyboardEvent("keydown", {
          key: "t",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        });
        notesInput.dispatchEvent(event);
      });

      // Modal should still be open (shortcut was ignored because we're in an input)
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("context-based suggestion flow", () => {
    it("suggests matter from current route context", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockPathname = "/matters/matter-3/billing";

      renderTimerApp();

      // Open modal
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      // Check that matter-3 is pre-selected
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("matter-3");

      // Check suggestion hint is shown
      expect(screen.getByText(/suggested based on current page/i)).toBeInTheDocument();
    });

    it("falls back to recent activity when not on matter page", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockPathname = "/time-entries";

      // Recent entry for matter-2
      const recentEntriesForTest = [
        { matter_id: "matter-2", started_at: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
      ];

      renderTimerApp(sampleMatters, recentEntriesForTest);

      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("matter-2");
    });

    it("shows no pre-selection when no context is available", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockPathname = "/settings";

      // No recent entries
      renderTimerApp(sampleMatters, []);

      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue(""); // No pre-selection
    });
  });

  describe("cross-page persistence", () => {
    it("timer state persists to localStorage when running", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start a timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for state to be persisted
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          STORAGE_KEY,
          expect.stringContaining("isRunning")
        );
      });

      // Verify the persisted state
      const lastCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      );
      if (lastCall) {
        const persistedState = JSON.parse(lastCall[1]);
        expect(persistedState.isRunning).toBe(true);
        expect(persistedState.selectedMatterId).toBe("matter-1");
      }
    });

    it("timer state restores from localStorage on component mount", async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Pre-populate localStorage with running timer
      const persistedState = {
        isRunning: true,
        startTime: now - 60000, // Started 60 seconds ago
        selectedMatterId: "matter-2",
        notes: "Persisted notes",
        activeEntryId: "persisted-entry-id",
        persistedAt: now - 1000,
      };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(persistedState));

      renderTimerApp();

      // Header timer should be visible (indicating timer is running)
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Floating button should show running state (has elapsed time in aria-label)
      // Use aria-pressed="true" to distinguish running state
      const floatingButtons = screen.getAllByRole("button", { name: /stop timer/i });
      const floatingButton = floatingButtons.find(btn => btn.getAttribute("aria-pressed") === "true");
      expect(floatingButton).toBeInTheDocument();
    });

    it("clears localStorage when timer stops", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for timer to start
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Advance past cooldown period
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 100);
      });

      // Stop timer via header stop button
      const stopButton = getHeaderStopButton();
      await user.click(stopButton);

      // Wait for localStorage to be cleared
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      });
    });
  });

  describe("stop and entry creation flow", () => {
    it("completes full workflow: start -> let run -> stop -> entry created", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      await waitFor(() => {
        expect(startTimer).toHaveBeenCalled();
      });

      // Wait for timer to be visible in header
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Advance past cooldown
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 100);
      });

      // Stop timer via header stop button
      const headerStopButton = getHeaderStopButton();
      await user.click(headerStopButton);

      // Verify stopTimer was called
      await waitFor(() => {
        expect(stopTimer).toHaveBeenCalled();
      });
    });

    it("shows elapsed time updating while timer runs", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const now = Date.now();
      vi.setSystemTime(now);

      renderTimerApp();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for timer to start
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Initial elapsed time should be 00:00:00 (in the header region)
      const timerRegion = screen.getByRole("region", { name: /active timer/i });
      expect(within(timerRegion).getByText("00:00:00")).toBeInTheDocument();

      // Advance by 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Elapsed time should update
      expect(within(timerRegion).getByText("00:00:05")).toBeInTheDocument();

      // Advance by 1 minute
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      // Should show 1:05
      expect(within(timerRegion).getByText("00:01:05")).toBeInTheDocument();
    });

    it("header timer display shows matter name and elapsed time", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for header timer to appear
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Header should contain elapsed time and matter name
      const timerRegion = screen.getByRole("region", { name: /active timer/i });
      expect(within(timerRegion).getByText("00:00:00")).toBeInTheDocument();
      expect(within(timerRegion).getByText(/smith v\. jones/i)).toBeInTheDocument();
    });

    it("handles API error when stopping timer gracefully", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start timer successfully
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for timer to start
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Advance past cooldown
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 100);
      });

      // Make stop API fail
      mockStopTimerResult = { error: "Network error" };

      // Click on the header timer display to open modal
      const headerTimerButton = screen.getByRole("button", { name: /timer running/i });
      await user.click(headerTimerButton);

      // Now find and click the stop button in the modal
      const modalStopButton = getModalStopButton();
      await user.click(modalStopButton);

      // Error should be shown in the modal
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Timer should still be running (not stopped due to error)
      expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
    });
  });

  describe("modal interactions", () => {
    it("closes modal on backdrop click", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Open modal
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Click backdrop
      const dialog = screen.getByRole("dialog");
      await user.click(dialog);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("closes modal on Escape key", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Open modal
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: "Escape" });

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("closes modal on Cancel button", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Open modal
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      // Click Cancel
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("disables matter selection when timer is running", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for timer to start
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Open modal again (by clicking header display)
      const headerTimerButton = screen.getByRole("button", { name: /timer running/i });
      await user.click(headerTimerButton);

      // Matter select should be disabled
      const matterSelect = screen.getByRole("combobox");
      expect(matterSelect).toBeDisabled();
    });
  });

  describe("floating button state changes", () => {
    it("shows timer icon when idle", () => {
      renderTimerApp();

      const button = getFloatingButton();
      expect(button).toBeInTheDocument();
    });

    it("shows stop icon with elapsed time when running", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for timer to start and advance a bit
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Button should now show stop state with elapsed time
      const runningButton = screen.getByRole("button", { name: /stop timer.*00:00:05/i });
      expect(runningButton).toBeInTheDocument();
    });

    it("shows pulse animation when timer is running", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Initially no pulse
      expect(document.querySelector(".animate-ping")).not.toBeInTheDocument();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for timer to start
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Pulse animation should be visible
      expect(document.querySelector(".animate-ping")).toBeInTheDocument();
    });
  });

  describe("API error handling", () => {
    it("shows error when start timer fails", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockStartTimerResult = { error: "Server unavailable" };

      renderTimerApp();

      // Try to start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/server unavailable/i)).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toBeInTheDocument();

      // Timer should NOT be running
      expect(screen.queryByRole("region", { name: /active timer/i })).not.toBeInTheDocument();
    });

    it("allows dismissing error and retrying", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockStartTimerResult = { error: "Temporary error" };

      renderTimerApp();

      // Try to start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Error is shown
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByRole("button", { name: /dismiss error/i });
      await user.click(dismissButton);

      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      // Advance past cooldown
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 100);
      });

      // Fix the mock and retry
      mockStartTimerResult = { ok: true, entryId: "new-entry-id" };

      // Get the modal start button again
      const modalStartButtonRetry = getModalStartButton();
      await user.click(modalStartButtonRetry);

      // Timer should now be running
      await waitFor(() => {
        expect(startTimer).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("rapid action prevention", () => {
    it("prevents rapid start-stop cycles within cooldown period", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTimerApp();

      // Start timer
      const floatingButton = getFloatingButton();
      await user.click(floatingButton);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "matter-1");

      const modalStartButton = getModalStartButton();
      await user.click(modalStartButton);

      // Wait for timer to start
      await waitFor(() => {
        expect(screen.getByRole("region", { name: /active timer/i })).toBeInTheDocument();
      });

      // Immediately try to stop via header (within cooldown)
      const headerTimerButton = screen.getByRole("button", { name: /timer running/i });
      await user.click(headerTimerButton);

      const modalStopButton = getModalStopButton();
      await user.click(modalStopButton);

      // stopTimer should NOT have been called yet (within cooldown)
      expect(stopTimer).not.toHaveBeenCalled();

      // Advance past cooldown
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TIMER_CONFIG.actionDebounceMs + 100);
      });

      // Now stop should work
      await user.click(modalStopButton);

      await waitFor(() => {
        expect(stopTimer).toHaveBeenCalled();
      });
    });
  });
});
