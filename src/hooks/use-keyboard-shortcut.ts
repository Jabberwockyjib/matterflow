"use client";

import { useCallback, useEffect } from "react";

/**
 * Configuration for a keyboard shortcut
 */
export type KeyboardShortcutConfig = {
  /** The key to listen for (e.g., 'k', 'Enter', 'Escape') */
  key: string;
  /** Require Cmd (Mac) or Ctrl (Windows/Linux) */
  cmdOrCtrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt/Option key */
  alt?: boolean;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
};

/**
 * Determines if the Cmd (Mac) or Ctrl (Windows/Linux) modifier is pressed
 */
function isCmdOrCtrlPressed(event: KeyboardEvent): boolean {
  // Check for Mac (metaKey = Cmd) or Windows/Linux (ctrlKey)
  return event.metaKey || event.ctrlKey;
}

/**
 * Custom hook for registering keyboard shortcuts.
 *
 * Handles cleanup on unmount and supports platform-specific modifiers.
 *
 * @param config - The keyboard shortcut configuration
 * @param callback - Function to call when the shortcut is triggered
 *
 * @example
 * ```tsx
 * // Basic usage: Cmd/Ctrl+K to open dialog
 * useKeyboardShortcut(
 *   { key: 'k', cmdOrCtrl: true },
 *   () => setIsOpen(true)
 * );
 *
 * // With additional modifiers
 * useKeyboardShortcut(
 *   { key: 's', cmdOrCtrl: true, shift: true },
 *   () => saveAs()
 * );
 *
 * // Conditionally enabled
 * useKeyboardShortcut(
 *   { key: 'Escape', enabled: isDialogOpen },
 *   () => closeDialog()
 * );
 * ```
 */
export function useKeyboardShortcut(
  config: KeyboardShortcutConfig,
  callback: () => void
): void {
  const {
    key,
    cmdOrCtrl = false,
    shift = false,
    alt = false,
    preventDefault = true,
    enabled = true,
  } = config;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow Escape key even in input fields
      if (isInputField && key.toLowerCase() !== "escape") {
        return;
      }

      // Check if the key matches (case-insensitive)
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      if (!keyMatches) {
        return;
      }

      // Check modifier keys
      if (cmdOrCtrl && !isCmdOrCtrlPressed(event)) {
        return;
      }

      if (!cmdOrCtrl && isCmdOrCtrlPressed(event)) {
        // If we don't want cmdOrCtrl but it's pressed, don't trigger
        return;
      }

      if (shift && !event.shiftKey) {
        return;
      }

      if (!shift && event.shiftKey) {
        // If we don't want shift but it's pressed, don't trigger
        return;
      }

      if (alt && !event.altKey) {
        return;
      }

      if (!alt && event.altKey) {
        // If we don't want alt but it's pressed, don't trigger
        return;
      }

      // All conditions met, trigger the callback
      if (preventDefault) {
        event.preventDefault();
      }

      callback();
    },
    [key, cmdOrCtrl, shift, alt, preventDefault, callback]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Returns a string representation of the keyboard shortcut for display.
 * Uses platform-specific symbols (Cmd for Mac, Ctrl for Windows).
 *
 * @param config - The keyboard shortcut configuration
 * @returns A formatted string like "⌘K" or "Ctrl+K"
 */
export function formatShortcut(config: KeyboardShortcutConfig): string {
  const parts: string[] = [];

  // Detect platform for appropriate modifier symbol
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  if (config.cmdOrCtrl) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }

  if (config.shift) {
    parts.push(isMac ? "⇧" : "Shift");
  }

  if (config.alt) {
    parts.push(isMac ? "⌥" : "Alt");
  }

  // Capitalize the key for display
  const displayKey = config.key.length === 1 ? config.key.toUpperCase() : config.key;
  parts.push(displayKey);

  return isMac ? parts.join("") : parts.join("+");
}
