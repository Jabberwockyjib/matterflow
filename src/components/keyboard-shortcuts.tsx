"use client";

/**
 * KeyboardShortcuts Component
 *
 * Integrates global keyboard shortcuts with the application.
 * Must be rendered inside TimerProvider to access timer context.
 *
 * Currently supports:
 * - Cmd/Ctrl+T: Toggle timer modal (open if closed, close if open)
 *
 * The component renders nothing visible - it only sets up event listeners.
 */

import { useCallback } from "react";
import { usePathname } from "next/navigation";

import { useKeyboardShortcuts } from "@/hooks";
import { useTimer } from "@/contexts/timer-context";
import { trackKeyboardShortcut } from "@/lib/timer/analytics";

/**
 * Props for KeyboardShortcuts component
 */
interface KeyboardShortcutsProps {
  /**
   * Whether keyboard shortcuts are enabled.
   * Pass false to disable all shortcuts (e.g., during specific workflows).
   * @default true
   */
  enabled?: boolean;
}

/**
 * KeyboardShortcuts
 *
 * A component that sets up global keyboard shortcuts for the application.
 * This component must be rendered within a TimerProvider.
 *
 * The component is invisible and only manages event listeners.
 *
 * @example
 * ```tsx
 * // In app-shell.tsx or similar:
 * <TimerProvider>
 *   <KeyboardShortcuts />
 *   {children}
 * </TimerProvider>
 * ```
 */
export function KeyboardShortcuts({ enabled = true }: KeyboardShortcutsProps) {
  const { toggleModal, isModalOpen, state } = useTimer();
  const pathname = usePathname();

  // Handle keyboard shortcut with analytics tracking
  const handleToggleTimer = useCallback(() => {
    // Track keyboard shortcut usage
    trackKeyboardShortcut({
      shortcut: "Cmd/Ctrl+T",
      timerRunning: state.isRunning,
      action: isModalOpen ? "closed_modal" : "opened_modal",
      route: pathname ?? undefined,
    });

    // Toggle modal with keyboard_shortcut source for analytics
    toggleModal("keyboard_shortcut");
  }, [toggleModal, isModalOpen, state.isRunning, pathname]);

  // Register keyboard shortcuts
  // The hook handles:
  // - Cmd/Ctrl+T to toggle timer modal
  // - Input field detection (shortcuts disabled while typing)
  // - Cross-platform modifier keys
  // - Preventing default browser behavior (new tab)
  useKeyboardShortcuts({
    onToggleTimer: handleToggleTimer,
    enabled,
  });

  // This component renders nothing - it only sets up event listeners
  return null;
}

export default KeyboardShortcuts;
