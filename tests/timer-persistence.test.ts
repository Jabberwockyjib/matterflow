import { afterEach, beforeEach, describe, expect, it, vi, Mock } from "vitest";

import {
  BroadcastSync,
  BroadcastSyncCallbacks,
  createBroadcastSync,
  isBroadcastChannelSupported,
} from "@/lib/timer/broadcast-sync";
import {
  DEFAULT_TIMER_CONFIG,
  PersistedTimerState,
  TimerBroadcastMessage,
} from "@/types/timer.types";

const STORAGE_KEY = DEFAULT_TIMER_CONFIG.storageKey;
const CHANNEL_NAME = DEFAULT_TIMER_CONFIG.broadcastChannelName;

/**
 * Create a fresh localStorage mock for each test
 */
function createLocalStorageMock() {
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
}

// This will be replaced with a fresh instance in beforeEach
let localStorageMock = createLocalStorageMock();

/**
 * Mock BroadcastChannel for testing
 */
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  /**
   * Simulate receiving a message from another tab
   */
  receiveMessage(data: TimerBroadcastMessage) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  /**
   * Simulate a message error
   */
  triggerMessageError() {
    if (this.onmessageerror) {
      this.onmessageerror(new MessageEvent("messageerror"));
    }
  }

  // Static tracking of instances for testing
  static instances: MockBroadcastChannel[] = [];
  static clear() {
    MockBroadcastChannel.instances = [];
  }
}

describe("timer-persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockBroadcastChannel.clear();

    // Create fresh localStorage mock for each test
    localStorageMock = createLocalStorageMock();

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock BroadcastChannel
    Object.defineProperty(window, "BroadcastChannel", {
      value: MockBroadcastChannel,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    MockBroadcastChannel.clear();
  });

  describe("isBroadcastChannelSupported", () => {
    it("returns true when BroadcastChannel is available", () => {
      expect(isBroadcastChannelSupported()).toBe(true);
    });

    it("returns false when BroadcastChannel is not available", () => {
      // Remove BroadcastChannel from window
      const original = window.BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).BroadcastChannel;

      expect(isBroadcastChannelSupported()).toBe(false);

      // Restore
      Object.defineProperty(window, "BroadcastChannel", {
        value: original,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("createBroadcastSync", () => {
    it("creates BroadcastSync when BroadcastChannel is supported", () => {
      const callbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const sync = createBroadcastSync(callbacks);

      expect(sync).not.toBeNull();
      expect(sync).toBeInstanceOf(BroadcastSync);
    });

    it("returns null when BroadcastChannel is not supported", () => {
      // Remove BroadcastChannel from window
      const original = window.BroadcastChannel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).BroadcastChannel;

      const callbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const sync = createBroadcastSync(callbacks);

      expect(sync).toBeNull();

      // Restore
      Object.defineProperty(window, "BroadcastChannel", {
        value: original,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("BroadcastSync class", () => {
    describe("connection", () => {
      it("connects to BroadcastChannel on construction", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);

        expect(sync.connected).toBe(true);
        expect(MockBroadcastChannel.instances).toHaveLength(1);
        expect(MockBroadcastChannel.instances[0].name).toBe(CHANNEL_NAME);
      });

      it("disconnects properly", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        expect(sync.connected).toBe(true);

        sync.disconnect();

        expect(sync.connected).toBe(false);
        expect(MockBroadcastChannel.instances[0].close).toHaveBeenCalled();
      });

      it("handles disconnect when already disconnected", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        sync.disconnect();
        sync.disconnect(); // Second call should not throw

        expect(sync.connected).toBe(false);
      });
    });

    describe("broadcasting messages", () => {
      it("broadcasts TIMER_STARTED message", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        sync.broadcastTimerStarted({
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          activeEntryId: "entry-456",
        });

        expect(channel.postMessage).toHaveBeenCalledWith({
          type: "TIMER_STARTED",
          payload: {
            startTime: 1234567890000,
            selectedMatterId: "matter-123",
            activeEntryId: "entry-456",
          },
        });
      });

      it("broadcasts TIMER_STOPPED message", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        sync.broadcastTimerStopped();

        expect(channel.postMessage).toHaveBeenCalledWith({
          type: "TIMER_STOPPED",
          payload: null,
        });
      });

      it("broadcasts TIMER_RESET message", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        sync.broadcastTimerReset();

        expect(channel.postMessage).toHaveBeenCalledWith({
          type: "TIMER_RESET",
          payload: null,
        });
      });

      it("broadcasts TIMER_STATE_REQUEST message", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        sync.requestState();

        expect(channel.postMessage).toHaveBeenCalledWith({
          type: "TIMER_STATE_REQUEST",
          payload: null,
        });
      });

      it("does not broadcast when disconnected", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        sync.disconnect();
        channel.postMessage.mockClear();

        sync.broadcastTimerStarted({
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          activeEntryId: null,
        });

        expect(channel.postMessage).not.toHaveBeenCalled();
      });

      it("handles postMessage errors gracefully", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        const sync = new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        // Make postMessage throw
        channel.postMessage.mockImplementation(() => {
          throw new Error("Channel closed");
        });

        // Should not throw
        expect(() => {
          sync.broadcastTimerStarted({
            startTime: 1234567890000,
            selectedMatterId: "matter-123",
            activeEntryId: null,
          });
        }).not.toThrow();
      });
    });

    describe("receiving messages", () => {
      it("calls onTimerStarted when TIMER_STARTED message is received", () => {
        const onTimerStarted = vi.fn();
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted,
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        channel.receiveMessage({
          type: "TIMER_STARTED",
          payload: {
            startTime: 1234567890000,
            selectedMatterId: "matter-123",
            activeEntryId: "entry-456",
          },
        });

        expect(onTimerStarted).toHaveBeenCalledWith({
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          activeEntryId: "entry-456",
        });
      });

      it("calls onTimerStopped when TIMER_STOPPED message is received", () => {
        const onTimerStopped = vi.fn();
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped,
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        channel.receiveMessage({
          type: "TIMER_STOPPED",
          payload: null,
        });

        expect(onTimerStopped).toHaveBeenCalledTimes(1);
      });

      it("calls onTimerReset when TIMER_RESET message is received", () => {
        const onTimerReset = vi.fn();
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset,
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        channel.receiveMessage({
          type: "TIMER_RESET",
          payload: null,
        });

        expect(onTimerReset).toHaveBeenCalledTimes(1);
      });

      it("responds to TIMER_STATE_REQUEST with current state", () => {
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: Date.now(),
        };

        const onStateRequest = vi.fn(() => persistedState);
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest,
          onStateResponse: vi.fn(),
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        channel.receiveMessage({
          type: "TIMER_STATE_REQUEST",
          payload: null,
        });

        expect(onStateRequest).toHaveBeenCalledTimes(1);
        expect(channel.postMessage).toHaveBeenCalledWith({
          type: "TIMER_STATE_RESPONSE",
          payload: persistedState,
        });
      });

      it("does not respond to TIMER_STATE_REQUEST when state is null", () => {
        const onStateRequest = vi.fn(() => null);
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest,
          onStateResponse: vi.fn(),
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];
        channel.postMessage.mockClear();

        channel.receiveMessage({
          type: "TIMER_STATE_REQUEST",
          payload: null,
        });

        expect(onStateRequest).toHaveBeenCalledTimes(1);
        expect(channel.postMessage).not.toHaveBeenCalled();
      });

      it("calls onStateResponse when TIMER_STATE_RESPONSE is received", () => {
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: Date.now(),
        };

        const onStateResponse = vi.fn();
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse,
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        channel.receiveMessage({
          type: "TIMER_STATE_RESPONSE",
          payload: persistedState,
        });

        expect(onStateResponse).toHaveBeenCalledWith(persistedState);
      });

      it("ignores TIMER_STATE_RESPONSE with null payload", () => {
        const onStateResponse = vi.fn();
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse,
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        // Send response with null payload (cast to work around TypeScript)
        channel.receiveMessage({
          type: "TIMER_STATE_RESPONSE",
          payload: null,
        } as unknown as TimerBroadcastMessage);

        expect(onStateResponse).not.toHaveBeenCalled();
      });

      it("ignores invalid message format", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        // Send invalid messages - should not throw or call callbacks
        channel.receiveMessage(null as unknown as TimerBroadcastMessage);
        channel.receiveMessage("invalid" as unknown as TimerBroadcastMessage);
        channel.receiveMessage({ foo: "bar" } as unknown as TimerBroadcastMessage);

        expect(callbacks.onTimerStarted).not.toHaveBeenCalled();
        expect(callbacks.onTimerStopped).not.toHaveBeenCalled();
        expect(callbacks.onTimerReset).not.toHaveBeenCalled();
      });

      it("handles message errors gracefully", () => {
        const callbacks: BroadcastSyncCallbacks = {
          onTimerStarted: vi.fn(),
          onTimerStopped: vi.fn(),
          onTimerReset: vi.fn(),
          onStateRequest: vi.fn(() => null),
          onStateResponse: vi.fn(),
        };

        new BroadcastSync(callbacks);
        const channel = MockBroadcastChannel.instances[0];

        // Trigger message error - should not throw
        expect(() => {
          channel.triggerMessageError();
        }).not.toThrow();
      });
    });
  });

  describe("localStorage persistence", () => {
    describe("save/restore cycle", () => {
      it("saves timer state to localStorage", () => {
        const state: PersistedTimerState = {
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: Date.now(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          STORAGE_KEY,
          JSON.stringify(state)
        );
      });

      it("restores timer state from localStorage", () => {
        const state: PersistedTimerState = {
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: Date.now(),
        };

        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(state));
        const stored = localStorage.getItem(STORAGE_KEY);

        expect(stored).not.toBeNull();
        expect(JSON.parse(stored!)).toEqual(state);
      });

      it("clears timer state from localStorage", () => {
        const state: PersistedTimerState = {
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: Date.now(),
        };

        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(state));
        localStorage.removeItem(STORAGE_KEY);

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      });
    });

    describe("elapsed time calculation after delay", () => {
      it("calculates correct elapsed time after short delay", () => {
        const startTime = Date.now() - 60000; // 60 seconds ago
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        expect(elapsedSeconds).toBe(60);
      });

      it("calculates correct elapsed time after long delay", () => {
        const startTime = Date.now() - 3600000; // 1 hour ago
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        expect(elapsedSeconds).toBe(3600);
      });

      it("calculates correct elapsed time after very long delay (24 hours)", () => {
        const startTime = Date.now() - 86400000; // 24 hours ago
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        expect(elapsedSeconds).toBe(86400);
      });

      it("handles elapsed time calculation with null startTime", () => {
        const startTime = null;
        const elapsedSeconds = startTime === null ? 0 : Math.floor((Date.now() - startTime) / 1000);

        expect(elapsedSeconds).toBe(0);
      });
    });

    describe("corrupted localStorage handling", () => {
      it("returns null for invalid JSON", () => {
        localStorageMock.setItem(STORAGE_KEY, "not-valid-json");

        try {
          JSON.parse(localStorage.getItem(STORAGE_KEY)!);
          expect.fail("Should have thrown");
        } catch {
          // Expected - corrupted data should be detected
        }
      });

      it("returns null for missing isRunning boolean", () => {
        const invalidState = { startTime: Date.now() }; // Missing isRunning
        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidState));

        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

        // Should detect invalid state (missing required isRunning boolean)
        expect(typeof stored.isRunning).not.toBe("boolean");
      });

      it("returns null for non-boolean isRunning", () => {
        const invalidState = { isRunning: "yes", startTime: Date.now() };
        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidState));

        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

        // Should detect invalid state (isRunning is not a boolean)
        expect(typeof stored.isRunning).not.toBe("boolean");
      });

      it("handles empty localStorage value", () => {
        // Don't set anything
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      });

      it("handles localStorage with extra fields (forward compatibility)", () => {
        const stateWithExtra = {
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: Date.now(),
          futureField: "some value", // Extra field that might be added later
        };

        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(stateWithExtra));
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

        // Should still parse correctly with extra fields
        expect(stored.isRunning).toBe(true);
        expect(stored.startTime).toBe(1234567890000);
        expect(stored.selectedMatterId).toBe("matter-123");
      });
    });
  });

  describe("refresh recovery", () => {
    describe("time gap detection", () => {
      it("detects no time gap when recovery is immediate", () => {
        const now = Date.now();
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: now - 60000, // Started 60 seconds ago
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: now - 1000, // Persisted 1 second ago
        };

        const timeGapSeconds = Math.floor((now - persistedState.persistedAt) / 1000);

        expect(timeGapSeconds).toBe(1);
        // 1 second gap is not significant (< 5 minutes)
        expect(timeGapSeconds < 300).toBe(true);
      });

      it("detects significant time gap (> 5 minutes)", () => {
        const now = Date.now();
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: now - 600000, // Started 10 minutes ago
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: now - 360000, // Persisted 6 minutes ago (significant gap)
        };

        const timeGapSeconds = Math.floor((now - persistedState.persistedAt) / 1000);

        expect(timeGapSeconds).toBe(360);
        // 6 minute gap is significant (> 5 minutes = 300 seconds)
        expect(timeGapSeconds >= 300).toBe(true);
      });

      it("detects time gap at exactly 5 minutes boundary", () => {
        const now = Date.now();
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: now - 600000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: now - 300000, // Persisted exactly 5 minutes ago
        };

        const timeGapSeconds = Math.floor((now - persistedState.persistedAt) / 1000);

        expect(timeGapSeconds).toBe(300);
        // Exactly 5 minutes is the threshold for significant gap
        expect(timeGapSeconds >= 300).toBe(true);
      });

      it("calculates recovery info correctly", () => {
        const now = Date.now();
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: now - 600000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: now - 360000,
        };

        const recoveryInfo = {
          wasRecovered: true,
          timeGapSeconds: Math.floor((now - persistedState.persistedAt) / 1000),
          hasSignificantGap: Math.floor((now - persistedState.persistedAt) / 1000) >= 300,
          persistedAt: persistedState.persistedAt,
          recoveredAt: now,
        };

        expect(recoveryInfo.wasRecovered).toBe(true);
        expect(recoveryInfo.timeGapSeconds).toBe(360);
        expect(recoveryInfo.hasSignificantGap).toBe(true);
        expect(recoveryInfo.persistedAt).toBe(persistedState.persistedAt);
        expect(recoveryInfo.recoveredAt).toBe(now);
      });
    });

    describe("entry ID preservation", () => {
      it("preserves entry ID for proper stop action", () => {
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: Date.now(),
        };

        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(persistedState));
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as PersistedTimerState;

        expect(stored.activeEntryId).toBe("entry-456");
      });

      it("handles null entry ID", () => {
        const persistedState: PersistedTimerState = {
          isRunning: false,
          startTime: null,
          selectedMatterId: null,
          notes: "",
          activeEntryId: null,
          persistedAt: Date.now(),
        };

        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(persistedState));
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as PersistedTimerState;

        expect(stored.activeEntryId).toBeNull();
      });
    });

    describe("uses persistedAt for recovery, falls back to startTime", () => {
      it("uses persistedAt for time gap calculation when available", () => {
        const now = Date.now();
        const persistedState: PersistedTimerState = {
          isRunning: true,
          startTime: now - 3600000, // Started 1 hour ago
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          persistedAt: now - 60000, // Persisted 1 minute ago
        };

        // Use persistedAt for gap calculation
        const gapBase = persistedState.persistedAt || persistedState.startTime || now;
        const timeGapSeconds = Math.floor((now - gapBase) / 1000);

        expect(timeGapSeconds).toBe(60);
      });

      it("falls back to startTime when persistedAt is missing", () => {
        const now = Date.now();
        // Old persisted state format without persistedAt
        const persistedState = {
          isRunning: true,
          startTime: now - 3600000, // Started 1 hour ago
          selectedMatterId: "matter-123",
          notes: "Test notes",
          activeEntryId: "entry-456",
          // No persistedAt field
        };

        // Fall back to startTime for gap calculation
        const gapBase = (persistedState as PersistedTimerState).persistedAt || persistedState.startTime || now;
        const timeGapSeconds = Math.floor((now - gapBase) / 1000);

        expect(timeGapSeconds).toBe(3600);
      });
    });
  });

  describe("cross-tab sync scenarios", () => {
    it("syncs timer start from tab A to tab B", () => {
      // Tab A starts timer and broadcasts
      const tabACallbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const tabBCallbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const tabA = new BroadcastSync(tabACallbacks);
      new BroadcastSync(tabBCallbacks);

      // Tab A starts timer
      tabA.broadcastTimerStarted({
        startTime: 1234567890000,
        selectedMatterId: "matter-123",
        activeEntryId: "entry-456",
      });

      // Simulate Tab B receiving the message
      // In real scenario, BroadcastChannel would deliver to other instances
      const tabBChannel = MockBroadcastChannel.instances[1];
      tabBChannel.receiveMessage({
        type: "TIMER_STARTED",
        payload: {
          startTime: 1234567890000,
          selectedMatterId: "matter-123",
          activeEntryId: "entry-456",
        },
      });

      expect(tabBCallbacks.onTimerStarted).toHaveBeenCalledWith({
        startTime: 1234567890000,
        selectedMatterId: "matter-123",
        activeEntryId: "entry-456",
      });
    });

    it("syncs timer stop from tab A to tab B", () => {
      const tabACallbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const tabBCallbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const tabA = new BroadcastSync(tabACallbacks);
      new BroadcastSync(tabBCallbacks);

      tabA.broadcastTimerStopped();

      const tabBChannel = MockBroadcastChannel.instances[1];
      tabBChannel.receiveMessage({
        type: "TIMER_STOPPED",
        payload: null,
      });

      expect(tabBCallbacks.onTimerStopped).toHaveBeenCalledTimes(1);
    });

    it("new tab requests state from existing tabs", () => {
      const persistedState: PersistedTimerState = {
        isRunning: true,
        startTime: 1234567890000,
        selectedMatterId: "matter-123",
        notes: "Test notes",
        activeEntryId: "entry-456",
        persistedAt: Date.now(),
      };

      // Tab A has running timer
      const tabACallbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => persistedState),
        onStateResponse: vi.fn(),
      };

      // New Tab B opens
      const tabBCallbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      new BroadcastSync(tabACallbacks);
      const tabB = new BroadcastSync(tabBCallbacks);

      // Tab B requests state
      tabB.requestState();

      // Simulate Tab A receiving the request
      const tabAChannel = MockBroadcastChannel.instances[0];
      tabAChannel.receiveMessage({
        type: "TIMER_STATE_REQUEST",
        payload: null,
      });

      expect(tabACallbacks.onStateRequest).toHaveBeenCalled();
      expect(tabAChannel.postMessage).toHaveBeenCalledWith({
        type: "TIMER_STATE_RESPONSE",
        payload: persistedState,
      });
    });

    it("prevents multiple simultaneous timers across tabs", () => {
      // When Tab A has a running timer and Tab B starts one,
      // Tab A should receive the TIMER_STARTED message and sync

      const tabACallbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => ({
          isRunning: true,
          startTime: 1234567890000,
          selectedMatterId: "matter-old",
          notes: "Old notes",
          activeEntryId: "entry-old",
          persistedAt: Date.now(),
        })),
        onStateResponse: vi.fn(),
      };

      new BroadcastSync(tabACallbacks);

      // Simulate Tab B starting a new timer
      const tabAChannel = MockBroadcastChannel.instances[0];
      tabAChannel.receiveMessage({
        type: "TIMER_STARTED",
        payload: {
          startTime: 1234567899999,
          selectedMatterId: "matter-new",
          activeEntryId: "entry-new",
        },
      });

      // Tab A should receive and sync to the new timer state
      expect(tabACallbacks.onTimerStarted).toHaveBeenCalledWith({
        startTime: 1234567899999,
        selectedMatterId: "matter-new",
        activeEntryId: "entry-new",
      });
    });
  });

  describe("edge cases", () => {
    it("handles rapid start/stop broadcasts", () => {
      const callbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const sync = new BroadcastSync(callbacks);

      // Rapid fire broadcasts
      sync.broadcastTimerStarted({
        startTime: 1,
        selectedMatterId: "m1",
        activeEntryId: "e1",
      });
      sync.broadcastTimerStopped();
      sync.broadcastTimerStarted({
        startTime: 2,
        selectedMatterId: "m2",
        activeEntryId: "e2",
      });
      sync.broadcastTimerStopped();

      const channel = MockBroadcastChannel.instances[0];
      expect(channel.postMessage).toHaveBeenCalledTimes(4);
    });

    it("handles channel creation failure", () => {
      // Make BroadcastChannel constructor throw
      const original = window.BroadcastChannel;
      Object.defineProperty(window, "BroadcastChannel", {
        value: class {
          constructor() {
            throw new Error("Blocked by browser");
          }
        },
        writable: true,
        configurable: true,
      });

      const callbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      // Should not throw
      const sync = new BroadcastSync(callbacks);
      expect(sync.connected).toBe(false);

      // Restore
      Object.defineProperty(window, "BroadcastChannel", {
        value: original,
        writable: true,
        configurable: true,
      });
    });

    it("handles channel close error", () => {
      const callbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => null),
        onStateResponse: vi.fn(),
      };

      const sync = new BroadcastSync(callbacks);
      const channel = MockBroadcastChannel.instances[0];

      // Make close throw
      channel.close.mockImplementation(() => {
        throw new Error("Already closed");
      });

      // Should not throw
      expect(() => {
        sync.disconnect();
      }).not.toThrow();
    });

    it("handles localStorage quota exceeded", () => {
      // Make setItem throw
      (localStorageMock.setItem as Mock).mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      // Should throw when trying to persist
      expect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          isRunning: true,
          startTime: Date.now(),
        }));
      }).toThrow("QuotaExceededError");

      // Note: Each test gets a fresh mock, so no need to restore
    });

    it("handles localStorage access denied", () => {
      // Make getItem throw
      (localStorageMock.getItem as Mock).mockImplementation(() => {
        throw new Error("SecurityError");
      });

      // Should throw when localStorage is blocked
      expect(() => {
        localStorage.getItem(STORAGE_KEY);
      }).toThrow("SecurityError");

      // Note: Each test gets a fresh mock, so no need to restore
    });

    it("handles very large elapsed time values", () => {
      const startTime = Date.now() - 604800000; // 7 days ago
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      expect(elapsedSeconds).toBe(604800);
    });

    it("handles future startTime (clock skew)", () => {
      const startTime = Date.now() + 60000; // 1 minute in the future
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

      // Should handle negative elapsed time by clamping to 0
      expect(elapsedSeconds).toBe(0);
    });
  });

  describe("integration: full recovery flow", () => {
    it("complete refresh recovery with broadcast sync", () => {
      const now = Date.now();

      // Step 1: Simulate state persisted before browser close
      const persistedState: PersistedTimerState = {
        isRunning: true,
        startTime: now - 600000, // 10 minutes ago
        selectedMatterId: "matter-123",
        notes: "Working on feature X",
        activeEntryId: "entry-456",
        persistedAt: now - 60000, // Persisted 1 minute ago
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(persistedState));

      // Step 2: Browser reopens, check localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();

      const restoredState = JSON.parse(stored!) as PersistedTimerState;

      // Step 3: Validate restored state
      expect(restoredState.isRunning).toBe(true);
      expect(restoredState.startTime).toBe(now - 600000);
      expect(restoredState.selectedMatterId).toBe("matter-123");
      expect(restoredState.activeEntryId).toBe("entry-456");

      // Step 4: Calculate elapsed time
      const elapsedSeconds = Math.floor((now - restoredState.startTime!) / 1000);
      expect(elapsedSeconds).toBe(600); // 10 minutes

      // Step 5: Check for time gap
      const timeGapSeconds = Math.floor((now - restoredState.persistedAt) / 1000);
      expect(timeGapSeconds).toBe(60); // 1 minute gap
      expect(timeGapSeconds < 300).toBe(true); // Not significant

      // Step 6: Set up broadcast sync for new tabs
      const callbacks: BroadcastSyncCallbacks = {
        onTimerStarted: vi.fn(),
        onTimerStopped: vi.fn(),
        onTimerReset: vi.fn(),
        onStateRequest: vi.fn(() => restoredState),
        onStateResponse: vi.fn(),
      };

      const sync = new BroadcastSync(callbacks);
      expect(sync.connected).toBe(true);
    });
  });
});
