"use client";

/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard event handling for timer shortcuts and
 * other application-wide keyboard interactions.
 *
 * Currently supports:
 * - Cmd/Ctrl+T: Toggle timer modal
 *
 * @example
 * ```tsx
 * function App() {
 *   const { openModal, closeModal, isModalOpen } = useTimer();
 *
 *   // Hook handles keyboard events and calls toggleModal
 *   useKeyboardShortcuts({
 *     onToggleTimer: () => {
 *       if (isModalOpen) {
 *         closeModal();
 *       } else {
 *         openModal();
 *       }
 *     },
 *   });
 *
 *   return <AppContent />;
 * }
 * ```
 */

import { useCallback, useEffect, useRef } from "react";

/**
 * Elements that should prevent keyboard shortcuts from firing.
 * When focus is in these elements, we don't want to intercept shortcuts
 * as the user is likely typing.
 */
const IGNORE_ELEMENTS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

/**
 * Content-editable attribute value that indicates editable content.
 */
const CONTENT_EDITABLE_TRUE = "true";

/**
 * Configuration for a keyboard shortcut.
 */
export interface ShortcutConfig {
  /** The key to listen for (e.g., "t", "Enter", "Escape") */
  key: string;
  /** Require Cmd key on Mac (Meta key) */
  metaKey?: boolean;
  /** Require Ctrl key */
  ctrlKey?: boolean;
  /** Require either Meta (Mac) or Ctrl (Windows/Linux) */
  cmdOrCtrl?: boolean;
  /** Require Shift key */
  shiftKey?: boolean;
  /** Require Alt key */
  altKey?: boolean;
  /** Callback when shortcut is triggered */
  handler: () => void;
  /** Allow shortcut even when in input fields (default: false) */
  allowInInputs?: boolean;
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Description for accessibility (used in aria-keyshortcuts) */
  description?: string;
}

/**
 * Options for the useKeyboardShortcuts hook.
 */
export interface UseKeyboardShortcutsOptions {
  /**
   * Callback when timer toggle shortcut (Cmd/Ctrl+T) is pressed.
   * If not provided, the timer shortcut is disabled.
   */
  onToggleTimer?: () => void;

  /**
   * Additional custom shortcuts to register.
   * Allows extending the hook with application-specific shortcuts.
   */
  shortcuts?: ShortcutConfig[];

  /**
   * Whether keyboard shortcuts are enabled (default: true).
   * Useful for conditionally disabling shortcuts.
   */
  enabled?: boolean;
}

/**
 * Return type for the useKeyboardShortcuts hook.
 */
export interface UseKeyboardShortcutsReturn {
  /**
   * Whether keyboard shortcuts are currently active.
   */
  isEnabled: boolean;
}

/**
 * Check if the current focus target is an input-like element.
 */
function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  // Check if it's an input, textarea, or select element
  if (IGNORE_ELEMENTS.has(element.tagName)) {
    return true;
  }

  // Check if it's a contenteditable element
  if (element.getAttribute("contenteditable") === CONTENT_EDITABLE_TRUE) {
    return true;
  }

  // Check if it's inside a contenteditable parent
  const editableParent = element.closest("[contenteditable='true']");
  if (editableParent) {
    return true;
  }

  return false;
}

/**
 * Check if a keyboard event matches a shortcut configuration.
 */
function matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  // Check the key (case-insensitive)
  if (event.key.toLowerCase() !== config.key.toLowerCase()) {
    return false;
  }

  // Handle cmdOrCtrl - requires either metaKey (Mac) or ctrlKey (Windows/Linux)
  if (config.cmdOrCtrl) {
    if (!event.metaKey && !event.ctrlKey) {
      return false;
    }
  } else {
    // Check individual modifier keys
    if (config.metaKey && !event.metaKey) {
      return false;
    }

    if (config.ctrlKey && !event.ctrlKey) {
      return false;
    }
  }

  // Check shift key
  if (config.shiftKey && !event.shiftKey) {
    return false;
  }

  // Check alt key
  if (config.altKey && !event.altKey) {
    return false;
  }

  // Make sure we don't match if extra modifiers are pressed that weren't requested
  // (except when cmdOrCtrl is used - then either meta or ctrl is allowed)
  if (!config.cmdOrCtrl) {
    if (!config.metaKey && event.metaKey) {
      return false;
    }
    if (!config.ctrlKey && event.ctrlKey) {
      return false;
    }
  }

  if (!config.shiftKey && event.shiftKey) {
    return false;
  }

  if (!config.altKey && event.altKey) {
    return false;
  }

  return true;
}

/**
 * Global keyboard shortcuts hook.
 *
 * Provides application-wide keyboard shortcuts with proper handling for:
 * - Input field detection (shortcuts disabled while typing)
 * - Cross-platform modifier keys (Cmd on Mac, Ctrl on Windows/Linux)
 * - Preventing default browser behavior
 * - Future expansion with custom shortcuts
 *
 * @param options - Configuration options for keyboard shortcuts
 * @returns Object with enabled state
 *
 * @example
 * ```tsx
 * // Basic usage with timer toggle
 * useKeyboardShortcuts({
 *   onToggleTimer: handleToggleTimer,
 * });
 *
 * // With additional custom shortcuts
 * useKeyboardShortcuts({
 *   onToggleTimer: handleToggleTimer,
 *   shortcuts: [
 *     {
 *       key: "k",
 *       cmdOrCtrl: true,
 *       handler: openCommandPalette,
 *       description: "Open command palette",
 *     },
 *   ],
 * });
 *
 * // Conditionally disabled
 * useKeyboardShortcuts({
 *   onToggleTimer: handleToggleTimer,
 *   enabled: !isModalOpen,
 * });
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const { onToggleTimer, shortcuts = [], enabled = true } = options;

  // Use ref to keep callback reference stable and avoid stale closures
  const onToggleTimerRef = useRef(onToggleTimer);
  const shortcutsRef = useRef(shortcuts);

  // Update refs when callbacks change
  useEffect(() => {
    onToggleTimerRef.current = onToggleTimer;
    shortcutsRef.current = shortcuts;
  }, [onToggleTimer, shortcuts]);

  /**
   * Handle keydown events for all registered shortcuts.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if shortcuts are disabled
      if (!enabled) {
        return;
      }

      // Build list of all shortcuts to check
      const allShortcuts: ShortcutConfig[] = [];

      // Add timer toggle shortcut if callback is provided
      if (onToggleTimerRef.current) {
        allShortcuts.push({
          key: "t",
          cmdOrCtrl: true,
          handler: onToggleTimerRef.current,
          allowInInputs: false,
          preventDefault: true,
          description: "Toggle timer",
        });
      }

      // Add custom shortcuts
      allShortcuts.push(...shortcutsRef.current);

      // Check each shortcut
      for (const shortcut of allShortcuts) {
        if (matchesShortcut(event, shortcut)) {
          // Check if we should ignore because focus is in an input
          if (!shortcut.allowInInputs && isInputElement(event.target)) {
            continue;
          }

          // Prevent default browser behavior if configured (default: true)
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }

          // Call the handler
          shortcut.handler();

          // Stop checking other shortcuts (first match wins)
          return;
        }
      }
    },
    [enabled]
  );

  /**
   * Set up global keydown listener.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Use capture phase to intercept before other handlers
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, handleKeyDown]);

  return {
    isEnabled: enabled,
  };
}

/**
 * Get ARIA keyboard shortcut string for accessibility.
 *
 * Returns a string suitable for the aria-keyshortcuts attribute,
 * following the W3C format.
 *
 * @param config - Shortcut configuration
 * @returns ARIA keyboard shortcut string
 *
 * @example
 * ```tsx
 * const shortcut = { key: "t", cmdOrCtrl: true };
 * const aria = getAriaKeyShortcut(shortcut);
 * // Returns "Control+T Meta+T"
 *
 * <button aria-keyshortcuts={aria}>Toggle Timer</button>
 * ```
 */
export function getAriaKeyShortcut(config: Pick<ShortcutConfig, "key" | "cmdOrCtrl" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">): string {
  const parts: string[] = [];

  // Build modifier string
  const modifiers: string[] = [];

  if (config.cmdOrCtrl) {
    // Include both for cross-platform support
    const ctrlModifiers = ["Control"];
    const metaModifiers = ["Meta"];

    if (config.shiftKey) {
      ctrlModifiers.push("Shift");
      metaModifiers.push("Shift");
    }
    if (config.altKey) {
      ctrlModifiers.push("Alt");
      metaModifiers.push("Alt");
    }

    const key = config.key.toUpperCase();
    parts.push([...ctrlModifiers, key].join("+"));
    parts.push([...metaModifiers, key].join("+"));
  } else {
    if (config.ctrlKey) modifiers.push("Control");
    if (config.metaKey) modifiers.push("Meta");
    if (config.shiftKey) modifiers.push("Shift");
    if (config.altKey) modifiers.push("Alt");

    const key = config.key.toUpperCase();
    parts.push([...modifiers, key].join("+"));
  }

  return parts.join(" ");
}

/**
 * Timer shortcut ARIA string for use in components.
 * Pre-computed for the default timer toggle shortcut (Cmd/Ctrl+T).
 */
export const TIMER_SHORTCUT_ARIA = getAriaKeyShortcut({ key: "t", cmdOrCtrl: true });

export default useKeyboardShortcuts;
