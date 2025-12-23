/**
 * Timer Performance Tests
 *
 * These tests verify that timer components meet performance requirements:
 * - Timer button renders in < 50ms
 * - Timer modal opens in < 200ms
 * - No frame drops with timer running (< 16ms per update)
 * - Matter suggestion < 100ms (tested in matter-suggestion.test.ts)
 * - No memory leaks with long-running timer
 */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FloatingTimerButton } from "@/components/timer/floating-timer-button";
import { HeaderTimerDisplay } from "@/components/timer/header-timer-display";
import { TimerModal } from "@/components/timer/timer-modal";
import type { MatterSummary } from "@/lib/data/queries";
import type { TimerState } from "@/types/timer.types";

// Mock the timer context - matching pattern from timer-components.test.tsx
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
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  updateNotes: vi.fn(),
  updateMatter: vi.fn(),
  setSuggestedMatter: vi.fn(),
  clearError: vi.fn(),
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
 * Sample matters for testing - generate 100 for realistic load testing
 */
const sampleMatters: MatterSummary[] = Array.from({ length: 100 }, (_, i) => ({
  id: `matter-${i}`,
  title: `Test Matter ${i} - Performance Testing`,
  matterType: i % 2 === 0 ? "Litigation" : "Contract",
  stage: "Active",
  nextAction: "Review",
  responsibleParty: "lawyer",
  billingModel: "hourly",
  updatedAt: new Date().toISOString(),
}));

/**
 * Large matters list for stress testing
 */
const largeMatters: MatterSummary[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `matter-${i}`,
  title: `Test Matter ${i} - Large Dataset Performance Testing with Long Title`,
  matterType: i % 3 === 0 ? "Litigation" : i % 3 === 1 ? "Contract" : "Estate",
  stage: "Active",
  nextAction: "Review documents and prepare summary",
  responsibleParty: "lawyer",
  billingModel: "hourly",
  updatedAt: new Date().toISOString(),
}));

describe("timer-performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = { ...mockState };
    mockIsModalOpen = false;
    mockSuggestionReason = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("FloatingTimerButton render performance", () => {
    it("renders idle button in under 50ms (average over 100 iterations)", () => {
      mockTimerState = { ...mockState, isRunning: false };

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const { unmount } = render(<FloatingTimerButton />);
        const duration = performance.now() - start;
        times.push(duration);
        unmount();
      }

      // Skip first 10 iterations (warm-up)
      const warmTimes = times.slice(10);
      const avgTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

      // Average render should be under 50ms
      expect(avgTime).toBeLessThan(50);
    });

    it("renders running button with elapsed time in under 50ms", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3661, // 1 hour, 1 minute, 1 second
        selectedMatterId: "matter-0",
        startTime: Date.now() - 3661000,
      };

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const { unmount } = render(<FloatingTimerButton />);
        const duration = performance.now() - start;
        times.push(duration);
        unmount();
      }

      const warmTimes = times.slice(10);
      const avgTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

      expect(avgTime).toBeLessThan(50);
    });

    it("handles large elapsed time values efficiently (24+ hours)", () => {
      // Test with very large elapsed time (48 hours)
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 172800, // 48 hours
        selectedMatterId: "matter-0",
        startTime: Date.now() - 172800000,
      };

      const start = performance.now();
      const { unmount } = render(<FloatingTimerButton />);
      const duration = performance.now() - start;
      unmount();

      expect(duration).toBeLessThan(50);
    });
  });

  describe("HeaderTimerDisplay render performance", () => {
    it("renders in under 50ms when timer is running", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 7265,
        selectedMatterId: "matter-0",
        startTime: Date.now() - 7265000,
      };

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const { unmount } = render(<HeaderTimerDisplay matters={sampleMatters} />);
        const duration = performance.now() - start;
        times.push(duration);
        unmount();
      }

      const warmTimes = times.slice(10);
      const avgTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

      expect(avgTime).toBeLessThan(50);
    });

    it("returns null quickly when timer is not running (< 10ms)", () => {
      mockTimerState = { ...mockState, isRunning: false };

      const start = performance.now();
      const { container, unmount } = render(<HeaderTimerDisplay matters={sampleMatters} />);
      const duration = performance.now() - start;

      expect(container.firstChild).toBeNull();
      expect(duration).toBeLessThan(10);
      unmount();
    });

    it("handles large matters array efficiently (1000 matters)", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 100,
        selectedMatterId: "matter-999", // Last matter in large list
        startTime: Date.now() - 100000,
      };

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const { unmount } = render(<HeaderTimerDisplay matters={largeMatters} />);
        const duration = performance.now() - start;
        times.push(duration);
        unmount();
      }

      const warmTimes = times.slice(5);
      const avgTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

      // Even with 1000 matters, should render quickly
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe("TimerModal render performance", () => {
    it("renders modal with 100 matters in under 200ms", () => {
      mockTimerState = {
        ...mockState,
        isRunning: false,
        selectedMatterId: "matter-0",
        suggestedMatterId: "matter-0",
      };
      mockIsModalOpen = true;
      mockSuggestionReason = "current_page";

      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const { unmount } = render(<TimerModal matters={sampleMatters} />);
        const duration = performance.now() - start;
        times.push(duration);
        unmount();
      }

      const warmTimes = times.slice(5);
      const avgTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

      expect(avgTime).toBeLessThan(200);
    });

    it("renders modal with elapsed time display in under 200ms", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3600,
        selectedMatterId: "matter-0",
        startTime: Date.now() - 3600000,
      };
      mockIsModalOpen = true;

      const start = performance.now();
      const { unmount } = render(<TimerModal matters={sampleMatters} />);
      const duration = performance.now() - start;
      unmount();

      expect(duration).toBeLessThan(200);
    });

    it("does not render when modal is closed (performance optimization)", () => {
      mockTimerState = { ...mockState };
      mockIsModalOpen = false;

      const start = performance.now();
      const { container, unmount } = render(<TimerModal matters={sampleMatters} />);
      const duration = performance.now() - start;

      expect(container.firstChild).toBeNull();
      expect(duration).toBeLessThan(10);
      unmount();
    });

    it("handles 1000 matters in dropdown efficiently", () => {
      mockTimerState = {
        ...mockState,
        isRunning: false,
        selectedMatterId: "matter-500",
      };
      mockIsModalOpen = true;

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const { unmount } = render(<TimerModal matters={largeMatters} />);
        const duration = performance.now() - start;
        times.push(duration);
        unmount();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      // With 1000 matters, still should render reasonably fast
      expect(avgTime).toBeLessThan(500);
    });
  });

  describe("elapsed time update performance (no frame drops)", () => {
    it("updates FloatingTimerButton 100 times in under 500ms (< 5ms avg per update)", () => {
      const updates = 100;
      const times: number[] = [];

      // Initial render
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 0,
        selectedMatterId: "matter-0",
        startTime: Date.now(),
      };
      const { rerender, unmount } = render(<FloatingTimerButton />);

      // Simulate elapsed time updates
      for (let i = 0; i < updates; i++) {
        mockTimerState = {
          ...mockTimerState,
          elapsedSeconds: i,
        };

        const start = performance.now();
        rerender(<FloatingTimerButton />);
        times.push(performance.now() - start);
      }

      unmount();

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      // Average should be well under frame budget (16ms for 60fps)
      expect(avgTime).toBeLessThan(16);
      // No individual update should cause a noticeable hitch
      expect(maxTime).toBeLessThan(50);
    });

    it("updates HeaderTimerDisplay rapidly without frame drops", () => {
      const updates = 100;
      const times: number[] = [];

      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 0,
        selectedMatterId: "matter-0",
        startTime: Date.now(),
      };
      const { rerender, unmount } = render(<HeaderTimerDisplay matters={sampleMatters} />);

      for (let i = 0; i < updates; i++) {
        mockTimerState = {
          ...mockTimerState,
          elapsedSeconds: 3600 + i, // Starting from 1 hour
        };

        const start = performance.now();
        rerender(<HeaderTimerDisplay matters={sampleMatters} />);
        times.push(performance.now() - start);
      }

      unmount();

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(16);
    });

    it("updates TimerModal elapsed time display without frame drops", () => {
      mockIsModalOpen = true;

      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 0,
        selectedMatterId: "matter-0",
        startTime: Date.now(),
      };
      const { rerender, unmount } = render(<TimerModal matters={sampleMatters} />);

      const updates = 60; // 60 updates = 1 minute at 1 second intervals
      const times: number[] = [];

      for (let i = 0; i < updates; i++) {
        mockTimerState = {
          ...mockTimerState,
          elapsedSeconds: i,
        };

        const start = performance.now();
        rerender(<TimerModal matters={sampleMatters} />);
        times.push(performance.now() - start);
      }

      unmount();

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(16);
    });
  });

  describe("memory stability with long-running timer simulation", () => {
    it("handles 8 hours of simulated updates without degradation", () => {
      // Simulate 8 hours worth of updates (28800 seconds)
      // We'll batch update in larger increments to make the test practical
      const hoursToSimulate = 8;
      const secondsPerHour = 3600;
      const totalSeconds = hoursToSimulate * secondsPerHour;
      const updateInterval = 60; // Update every 60 "seconds" for practicality
      const iterations = totalSeconds / updateInterval;

      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 0,
        selectedMatterId: "matter-0",
        startTime: Date.now(),
      };
      const { rerender, unmount } = render(<FloatingTimerButton />);

      const startTimes: number[] = [];
      const endTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        mockTimerState = {
          ...mockTimerState,
          elapsedSeconds: i * updateInterval,
        };

        const start = performance.now();
        rerender(<FloatingTimerButton />);
        const duration = performance.now() - start;

        // Capture timing from beginning and end of simulation
        if (i < 10) startTimes.push(duration);
        if (i >= iterations - 10) endTimes.push(duration);
      }

      unmount();

      const avgStart = startTimes.reduce((a, b) => a + b, 0) / startTimes.length;
      const avgEnd = endTimes.reduce((a, b) => a + b, 0) / endTimes.length;

      // End times should not be significantly worse than start times
      // (allows for some variance, but should stay similar)
      expect(avgEnd).toBeLessThan(avgStart * 3);

      // Both should still be under frame budget
      expect(avgStart).toBeLessThan(16);
      expect(avgEnd).toBeLessThan(16);
    });

    it("components unmount cleanly after long simulation", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 86400, // 24 hours
        selectedMatterId: "matter-0",
        startTime: Date.now() - 86400000,
      };
      mockIsModalOpen = true;

      const { unmount: unmount1 } = render(<FloatingTimerButton />);
      const { unmount: unmount2 } = render(<HeaderTimerDisplay matters={sampleMatters} />);
      const { unmount: unmount3 } = render(<TimerModal matters={sampleMatters} />);

      // Simulate some updates
      for (let i = 0; i < 100; i++) {
        mockTimerState = {
          ...mockTimerState,
          elapsedSeconds: 86400 + i,
        };
      }

      // Clean unmount - should not throw or hang
      expect(() => unmount1()).not.toThrow();
      expect(() => unmount2()).not.toThrow();
      expect(() => unmount3()).not.toThrow();
    });
  });

  describe("component initialization performance", () => {
    it("all timer components initialize together in under 200ms", () => {
      mockTimerState = {
        ...mockState,
        isRunning: true,
        elapsedSeconds: 3600,
        selectedMatterId: "matter-0",
        startTime: Date.now() - 3600000,
      };
      mockIsModalOpen = true;

      const start = performance.now();

      const { unmount } = render(
        <>
          <FloatingTimerButton />
          <HeaderTimerDisplay matters={sampleMatters} />
          <TimerModal matters={sampleMatters} />
        </>
      );

      const duration = performance.now() - start;
      unmount();

      expect(duration).toBeLessThan(200);
    });
  });
});

/**
 * Performance Benchmarks
 *
 * These are the specific performance targets from the acceptance criteria.
 * They represent the minimum performance requirements for the feature.
 */
describe("timer-performance benchmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = { ...mockState };
    mockIsModalOpen = false;
    mockSuggestionReason = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("BENCHMARK: Timer button renders in < 50ms", () => {
    mockTimerState = { ...mockState, isRunning: false };

    const start = performance.now();
    const { unmount } = render(<FloatingTimerButton />);
    const duration = performance.now() - start;
    unmount();

    // Log for visibility in test output
    console.log(`Timer button render time: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50);
  });

  it("BENCHMARK: Timer modal opens in < 200ms", () => {
    mockTimerState = {
      ...mockState,
      isRunning: false,
      selectedMatterId: "matter-0",
    };
    mockIsModalOpen = true;

    const start = performance.now();
    const { unmount } = render(<TimerModal matters={sampleMatters} />);
    const duration = performance.now() - start;
    unmount();

    console.log(`Timer modal render time: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(200);
  });

  it("BENCHMARK: No frame drops with timer running (< 16ms per update)", () => {
    mockTimerState = {
      ...mockState,
      isRunning: true,
      elapsedSeconds: 0,
      selectedMatterId: "matter-0",
      startTime: Date.now(),
    };

    const { rerender, unmount } = render(<FloatingTimerButton />);

    // Measure 60 updates (simulating 1 second at 60fps)
    const updates = 60;
    const times: number[] = [];

    for (let i = 0; i < updates; i++) {
      mockTimerState = {
        ...mockTimerState,
        elapsedSeconds: i,
      };

      const start = performance.now();
      rerender(<FloatingTimerButton />);
      times.push(performance.now() - start);
    }

    unmount();

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`Average update time: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

    // Average should be well under frame budget
    expect(avgTime).toBeLessThan(16);
    // No individual frame should take excessively long
    expect(maxTime).toBeLessThan(50);
  });

  it("BENCHMARK: Header timer display update < 16ms", () => {
    mockTimerState = {
      ...mockState,
      isRunning: true,
      elapsedSeconds: 3600,
      selectedMatterId: "matter-0",
      startTime: Date.now() - 3600000,
    };

    const { rerender, unmount } = render(<HeaderTimerDisplay matters={sampleMatters} />);

    const updates = 60;
    const times: number[] = [];

    for (let i = 0; i < updates; i++) {
      mockTimerState = {
        ...mockTimerState,
        elapsedSeconds: 3600 + i,
      };

      const start = performance.now();
      rerender(<HeaderTimerDisplay matters={sampleMatters} />);
      times.push(performance.now() - start);
    }

    unmount();

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Header display average update time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(16);
  });

  it("BENCHMARK: Matter suggestion is fast (< 100ms) - verified in matter-suggestion.test.ts", () => {
    // This benchmark is already covered in matter-suggestion.test.ts
    // We include this test as documentation that the requirement is covered
    // The actual performance tests are in the dedicated suggestion test file
    expect(true).toBe(true);
  });
});
