/**
 * BroadcastChannel Sync Module
 *
 * This module provides cross-tab timer state synchronization using the
 * BroadcastChannel API. It ensures that only one timer can run at a time
 * across all browser tabs and keeps state synchronized.
 *
 * Features:
 * - Broadcasts timer state changes to all tabs
 * - Receives and applies state updates from other tabs
 * - Handles tab leadership for conflict resolution
 * - Graceful fallback when BroadcastChannel is not supported
 */

import type {
  PersistedTimerState,
  TimerBroadcastMessage,
  TimerState,
} from "@/types/timer.types";
import { DEFAULT_TIMER_CONFIG } from "@/types/timer.types";

/**
 * Channel name for timer sync
 */
const CHANNEL_NAME = DEFAULT_TIMER_CONFIG.broadcastChannelName;

/**
 * Check if BroadcastChannel API is supported
 */
export function isBroadcastChannelSupported(): boolean {
  return typeof window !== "undefined" && "BroadcastChannel" in window;
}

/**
 * Payload type for timer started broadcast message
 */
type TimerStartedPayload = Pick<TimerState, "startTime" | "selectedMatterId" | "activeEntryId">;

/**
 * Callback types for broadcast channel events
 */
export interface BroadcastSyncCallbacks {
  /** Called when timer is started in another tab */
  onTimerStarted: (payload: TimerStartedPayload) => void;
  /** Called when timer is stopped in another tab */
  onTimerStopped: () => void;
  /** Called when timer is reset in another tab */
  onTimerReset: () => void;
  /** Called when another tab requests current state */
  onStateRequest: () => PersistedTimerState | null;
  /** Called when another tab responds with state */
  onStateResponse: (state: PersistedTimerState) => void;
}

/**
 * BroadcastSync class for managing cross-tab timer synchronization
 *
 * Usage:
 * ```ts
 * const sync = new BroadcastSync({
 *   onTimerStarted: (payload) => { ... },
 *   onTimerStopped: () => { ... },
 *   onTimerReset: () => { ... },
 *   onStateRequest: () => persistedState,
 *   onStateResponse: (state) => { ... },
 * });
 *
 * // When timer starts in this tab
 * sync.broadcastTimerStarted({ startTime, selectedMatterId, activeEntryId });
 *
 * // When timer stops in this tab
 * sync.broadcastTimerStopped();
 *
 * // Clean up on unmount
 * sync.disconnect();
 * ```
 */
export class BroadcastSync {
  private channel: BroadcastChannel | null = null;
  private callbacks: BroadcastSyncCallbacks;
  private isConnected: boolean = false;

  constructor(callbacks: BroadcastSyncCallbacks) {
    this.callbacks = callbacks;
    this.connect();
  }

  /**
   * Connect to the BroadcastChannel
   */
  private connect(): void {
    if (!isBroadcastChannelSupported()) {
      return;
    }

    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = this.handleMessage.bind(this);
      this.channel.onmessageerror = this.handleMessageError.bind(this);
      this.isConnected = true;
    } catch {
      // Failed to create channel - BroadcastChannel may be blocked
      this.isConnected = false;
    }
  }

  /**
   * Handle incoming broadcast messages
   */
  private handleMessage(event: MessageEvent<TimerBroadcastMessage>): void {
    const message = event.data;

    if (!message || typeof message !== "object" || !("type" in message)) {
      return;
    }

    switch (message.type) {
      case "TIMER_STARTED":
        this.callbacks.onTimerStarted(message.payload);
        break;

      case "TIMER_STOPPED":
        this.callbacks.onTimerStopped();
        break;

      case "TIMER_RESET":
        this.callbacks.onTimerReset();
        break;

      case "TIMER_STATE_REQUEST":
        // Another tab is requesting our current state
        const currentState = this.callbacks.onStateRequest();
        if (currentState) {
          this.broadcastStateResponse(currentState);
        }
        break;

      case "TIMER_STATE_RESPONSE":
        // Another tab responded with its state
        if (message.payload) {
          this.callbacks.onStateResponse(message.payload);
        }
        break;
    }
  }

  /**
   * Handle message errors
   */
  private handleMessageError(): void {
    // Message deserialization error - ignore silently
  }

  /**
   * Broadcast that the timer has started in this tab
   */
  broadcastTimerStarted(payload: Pick<TimerState, "startTime" | "selectedMatterId" | "activeEntryId">): void {
    this.broadcast({
      type: "TIMER_STARTED",
      payload: {
        startTime: payload.startTime,
        selectedMatterId: payload.selectedMatterId,
        activeEntryId: payload.activeEntryId,
      },
    });
  }

  /**
   * Broadcast that the timer has stopped in this tab
   */
  broadcastTimerStopped(): void {
    this.broadcast({
      type: "TIMER_STOPPED",
      payload: null,
    });
  }

  /**
   * Broadcast that the timer has been reset in this tab
   */
  broadcastTimerReset(): void {
    this.broadcast({
      type: "TIMER_RESET",
      payload: null,
    });
  }

  /**
   * Request current timer state from other tabs
   * Used when a new tab opens to sync with existing timer
   */
  requestState(): void {
    this.broadcast({
      type: "TIMER_STATE_REQUEST",
      payload: null,
    });
  }

  /**
   * Respond to a state request with current persisted state
   */
  private broadcastStateResponse(state: PersistedTimerState): void {
    this.broadcast({
      type: "TIMER_STATE_RESPONSE",
      payload: state,
    });
  }

  /**
   * Send a message to all other tabs
   */
  private broadcast(message: TimerBroadcastMessage): void {
    if (!this.channel || !this.isConnected) {
      return;
    }

    try {
      this.channel.postMessage(message);
    } catch {
      // Failed to send message - channel may be closed
    }
  }

  /**
   * Check if the sync is connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect and clean up the BroadcastChannel
   */
  disconnect(): void {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // Ignore close errors
      }
      this.channel = null;
    }
    this.isConnected = false;
  }
}

/**
 * Create a BroadcastSync instance with the given callbacks
 *
 * Returns null if BroadcastChannel is not supported
 */
export function createBroadcastSync(
  callbacks: BroadcastSyncCallbacks
): BroadcastSync | null {
  if (!isBroadcastChannelSupported()) {
    return null;
  }

  return new BroadcastSync(callbacks);
}
