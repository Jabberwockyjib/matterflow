import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcut, formatShortcut } from "@/hooks/use-keyboard-shortcut";

// =============================================================================
// Helper to create keyboard events
// =============================================================================

function createKeyboardEvent(
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {}
): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    bubbles: true,
  });
}

// =============================================================================
// useKeyboardShortcut Tests
// =============================================================================

describe("useKeyboardShortcut", () => {
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic key matching", () => {
    it("triggers callback on matching key press", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k" }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k"));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("is case-insensitive", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "K" }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k"));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not trigger on non-matching key", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k" }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("j"));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("modifier keys", () => {
    it("triggers when cmdOrCtrl is required and Ctrl is pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k", cmdOrCtrl: true }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k", { ctrlKey: true }));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("triggers when cmdOrCtrl is required and Meta (Cmd) is pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k", cmdOrCtrl: true }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k", { metaKey: true }));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not trigger when cmdOrCtrl is required but not pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k", cmdOrCtrl: true }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k"));

      expect(callback).not.toHaveBeenCalled();
    });

    it("does not trigger when cmdOrCtrl is NOT required but IS pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k", cmdOrCtrl: false }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k", { ctrlKey: true }));

      expect(callback).not.toHaveBeenCalled();
    });

    it("triggers when shift is required and pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "s", shift: true }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("s", { shiftKey: true }));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not trigger when shift is required but not pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "s", shift: true }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("s"));

      expect(callback).not.toHaveBeenCalled();
    });

    it("does not trigger when shift is NOT required but IS pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "s", shift: false }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("s", { shiftKey: true }));

      expect(callback).not.toHaveBeenCalled();
    });

    it("triggers when alt is required and pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "a", alt: true }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("a", { altKey: true }));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not trigger when alt is required but not pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "a", alt: true }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("a"));

      expect(callback).not.toHaveBeenCalled();
    });

    it("does not trigger when alt is NOT required but IS pressed", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "a", alt: false }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("a", { altKey: true }));

      expect(callback).not.toHaveBeenCalled();
    });

    it("handles multiple modifiers", () => {
      renderHook(() =>
        useKeyboardShortcut(
          { key: "s", cmdOrCtrl: true, shift: true },
          callback
        )
      );

      // Both modifiers pressed
      document.dispatchEvent(
        createKeyboardEvent("s", { ctrlKey: true, shiftKey: true })
      );

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not trigger with partial modifier match", () => {
      renderHook(() =>
        useKeyboardShortcut(
          { key: "s", cmdOrCtrl: true, shift: true },
          callback
        )
      );

      // Only Ctrl pressed, missing Shift
      document.dispatchEvent(createKeyboardEvent("s", { ctrlKey: true }));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("enabled option", () => {
    it("does not trigger when disabled", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k", enabled: false }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k"));

      expect(callback).not.toHaveBeenCalled();
    });

    it("triggers when enabled (default)", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k" }, callback)
      );

      document.dispatchEvent(createKeyboardEvent("k"));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("responds to enabled changes", () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useKeyboardShortcut({ key: "k", enabled }, callback),
        { initialProps: { enabled: true } }
      );

      // Should trigger when enabled
      document.dispatchEvent(createKeyboardEvent("k"));
      expect(callback).toHaveBeenCalledTimes(1);

      // Disable
      rerender({ enabled: false });

      // Should not trigger when disabled
      document.dispatchEvent(createKeyboardEvent("k"));
      expect(callback).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe("preventDefault", () => {
    it("prevents default by default", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k" }, callback)
      );

      const event = createKeyboardEvent("k");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("does not prevent default when preventDefault is false", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "k", preventDefault: false }, callback)
      );

      const event = createKeyboardEvent("k");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe("input field handling", () => {
    it("allows Escape key in input fields", () => {
      renderHook(() =>
        useKeyboardShortcut({ key: "Escape" }, callback)
      );

      // Create an input element and focus it
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      // Dispatch event with input as target
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input });
      document.dispatchEvent(event);

      expect(callback).toHaveBeenCalledTimes(1);

      document.body.removeChild(input);
    });
  });

  describe("cleanup", () => {
    it("removes event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const { unmount } = renderHook(() =>
        useKeyboardShortcut({ key: "k" }, callback)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});

// =============================================================================
// formatShortcut Tests
// =============================================================================

describe("formatShortcut", () => {
  // Mock navigator.platform for consistent testing
  const originalPlatform = globalThis.navigator?.platform;

  afterEach(() => {
    if (originalPlatform !== undefined) {
      Object.defineProperty(navigator, "platform", {
        value: originalPlatform,
        writable: true,
      });
    }
  });

  describe("on Mac", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        writable: true,
      });
    });

    it("formats single key", () => {
      expect(formatShortcut({ key: "k" })).toBe("K");
    });

    it("formats Cmd+key with symbol", () => {
      expect(formatShortcut({ key: "k", cmdOrCtrl: true })).toBe("⌘K");
    });

    it("formats Shift+key with symbol", () => {
      expect(formatShortcut({ key: "s", shift: true })).toBe("⇧S");
    });

    it("formats Alt+key with symbol", () => {
      expect(formatShortcut({ key: "a", alt: true })).toBe("⌥A");
    });

    it("formats multiple modifiers", () => {
      expect(
        formatShortcut({ key: "s", cmdOrCtrl: true, shift: true })
      ).toBe("⌘⇧S");
    });

    it("preserves special key names", () => {
      expect(formatShortcut({ key: "Enter" })).toBe("Enter");
      expect(formatShortcut({ key: "Escape" })).toBe("Escape");
    });
  });

  describe("on Windows/Linux", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        writable: true,
      });
    });

    it("formats single key", () => {
      expect(formatShortcut({ key: "k" })).toBe("K");
    });

    it("formats Ctrl+key with text", () => {
      expect(formatShortcut({ key: "k", cmdOrCtrl: true })).toBe("Ctrl+K");
    });

    it("formats Shift+key with text", () => {
      expect(formatShortcut({ key: "s", shift: true })).toBe("Shift+S");
    });

    it("formats Alt+key with text", () => {
      expect(formatShortcut({ key: "a", alt: true })).toBe("Alt+A");
    });

    it("formats multiple modifiers with plus signs", () => {
      expect(
        formatShortcut({ key: "s", cmdOrCtrl: true, shift: true })
      ).toBe("Ctrl+Shift+S");
    });
  });
});
