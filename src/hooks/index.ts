/**
 * Custom React Hooks
 *
 * This module exports all custom hooks used throughout the application.
 */

export { useRouteContext, getRouteContext } from "./use-route-context";
export type { RouteContext } from "./use-route-context";

export {
  useKeyboardShortcuts,
  getAriaKeyShortcut,
  TIMER_SHORTCUT_ARIA,
} from "./use-keyboard-shortcuts";
export type {
  ShortcutConfig,
  UseKeyboardShortcutsOptions,
  UseKeyboardShortcutsReturn,
} from "./use-keyboard-shortcuts";
