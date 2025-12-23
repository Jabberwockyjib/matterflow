import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAriaKeyShortcut,
  ShortcutConfig,
  TIMER_SHORTCUT_ARIA,
  useKeyboardShortcuts,
} from "@/hooks/use-keyboard-shortcuts";

describe("keyboard-shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useKeyboardShortcuts hook", () => {
    describe("Cmd+T / Ctrl+T timer shortcut", () => {
      it("triggers onToggleTimer when Cmd+T is pressed (Mac)", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        // Simulate Cmd+T on Mac (metaKey = true)
        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          ctrlKey: false,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).toHaveBeenCalledTimes(1);
      });

      it("triggers onToggleTimer when Ctrl+T is pressed (Windows/Linux)", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        // Simulate Ctrl+T on Windows/Linux (ctrlKey = true)
        const event = new KeyboardEvent("keydown", {
          key: "t",
          ctrlKey: true,
          metaKey: false,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).toHaveBeenCalledTimes(1);
      });

      it("triggers onToggleTimer with uppercase T key", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const event = new KeyboardEvent("keydown", {
          key: "T",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).toHaveBeenCalledTimes(1);
      });

      it("does not trigger when T is pressed without modifier", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: false,
          ctrlKey: false,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();
      });

      it("does not trigger when different key is pressed with modifier", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const event = new KeyboardEvent("keydown", {
          key: "s",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();
      });

      it("does not trigger when no onToggleTimer callback provided", () => {
        // Should not throw even without callback
        const { result } = renderHook(() => useKeyboardShortcuts({}));

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(result.current.isEnabled).toBe(true);
      });
    });

    describe("preventDefault behavior", () => {
      it("prevents default browser behavior for Cmd+T", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
          cancelable: true,
        });

        const preventDefaultSpy = vi.spyOn(event, "preventDefault");

        act(() => {
          document.dispatchEvent(event);
        });

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it("prevents default browser behavior for Ctrl+T", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const event = new KeyboardEvent("keydown", {
          key: "t",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        });

        const preventDefaultSpy = vi.spyOn(event, "preventDefault");

        act(() => {
          document.dispatchEvent(event);
        });

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it("respects preventDefault: false in custom shortcuts", () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
          {
            key: "k",
            cmdOrCtrl: true,
            handler,
            preventDefault: false,
          },
        ];

        renderHook(() => useKeyboardShortcuts({ shortcuts }));

        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
          cancelable: true,
        });

        const preventDefaultSpy = vi.spyOn(event, "preventDefault");

        act(() => {
          document.dispatchEvent(event);
        });

        expect(handler).toHaveBeenCalled();
        expect(preventDefaultSpy).not.toHaveBeenCalled();
      });
    });

    describe("shortcut disabled in input fields", () => {
      it("does not trigger when focus is in an INPUT element", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        // Create an input element as the event target
        const input = document.createElement("input");
        document.body.appendChild(input);
        input.focus();

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        // Set target to input element
        Object.defineProperty(event, "target", { value: input });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();

        document.body.removeChild(input);
      });

      it("does not trigger when focus is in a TEXTAREA element", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);
        textarea.focus();

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        Object.defineProperty(event, "target", { value: textarea });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();

        document.body.removeChild(textarea);
      });

      it("does not trigger when focus is in a SELECT element", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const select = document.createElement("select");
        document.body.appendChild(select);
        select.focus();

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        Object.defineProperty(event, "target", { value: select });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();

        document.body.removeChild(select);
      });

      it("does not trigger when focus is in a contenteditable element", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const div = document.createElement("div");
        div.setAttribute("contenteditable", "true");
        document.body.appendChild(div);
        div.focus();

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        Object.defineProperty(event, "target", { value: div });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();

        document.body.removeChild(div);
      });

      it("does not trigger when focus is inside a contenteditable parent", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const parent = document.createElement("div");
        parent.setAttribute("contenteditable", "true");
        const child = document.createElement("span");
        parent.appendChild(child);
        document.body.appendChild(parent);
        child.focus();

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        Object.defineProperty(event, "target", { value: child });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();

        document.body.removeChild(parent);
      });

      it("triggers when focus is on a regular div", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const div = document.createElement("div");
        document.body.appendChild(div);

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        Object.defineProperty(event, "target", { value: div });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).toHaveBeenCalledTimes(1);

        document.body.removeChild(div);
      });

      it("triggers when focus is on a button", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const button = document.createElement("button");
        document.body.appendChild(button);

        const event = new KeyboardEvent("keydown", {
          key: "t",
          ctrlKey: true,
          bubbles: true,
        });

        Object.defineProperty(event, "target", { value: button });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).toHaveBeenCalledTimes(1);

        document.body.removeChild(button);
      });

      it("triggers when allowInInputs is true for custom shortcuts", () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
          {
            key: "Escape",
            handler,
            allowInInputs: true,
          },
        ];

        renderHook(() => useKeyboardShortcuts({ shortcuts }));

        const input = document.createElement("input");
        document.body.appendChild(input);

        const event = new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        });

        Object.defineProperty(event, "target", { value: input });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(handler).toHaveBeenCalledTimes(1);

        document.body.removeChild(input);
      });
    });

    describe("enabled option", () => {
      it("returns isEnabled: true when enabled is not specified", () => {
        const { result } = renderHook(() => useKeyboardShortcuts({}));
        expect(result.current.isEnabled).toBe(true);
      });

      it("returns isEnabled: true when enabled is true", () => {
        const { result } = renderHook(() =>
          useKeyboardShortcuts({ enabled: true })
        );
        expect(result.current.isEnabled).toBe(true);
      });

      it("returns isEnabled: false when enabled is false", () => {
        const { result } = renderHook(() =>
          useKeyboardShortcuts({ enabled: false })
        );
        expect(result.current.isEnabled).toBe(false);
      });

      it("does not trigger shortcuts when disabled", () => {
        const onToggleTimer = vi.fn();
        renderHook(() =>
          useKeyboardShortcuts({ onToggleTimer, enabled: false })
        );

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();
      });

      it("does not add event listener when disabled", () => {
        const addEventListenerSpy = vi.spyOn(document, "addEventListener");

        renderHook(() => useKeyboardShortcuts({ enabled: false }));

        expect(addEventListenerSpy).not.toHaveBeenCalledWith(
          "keydown",
          expect.any(Function),
          true
        );
      });

      it("removes event listener when disabled after being enabled", () => {
        const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

        const { rerender } = renderHook(
          ({ enabled }) => useKeyboardShortcuts({ enabled }),
          { initialProps: { enabled: true } }
        );

        rerender({ enabled: false });

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          "keydown",
          expect.any(Function),
          true
        );
      });
    });

    describe("custom shortcuts", () => {
      it("handles custom shortcut with cmdOrCtrl", () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
          {
            key: "k",
            cmdOrCtrl: true,
            handler,
          },
        ];

        renderHook(() => useKeyboardShortcuts({ shortcuts }));

        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("handles custom shortcut with specific metaKey only", () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
          {
            key: "m",
            metaKey: true,
            handler,
          },
        ];

        renderHook(() => useKeyboardShortcuts({ shortcuts }));

        // Should not trigger with Ctrl
        const ctrlEvent = new KeyboardEvent("keydown", {
          key: "m",
          ctrlKey: true,
          metaKey: false,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(ctrlEvent);
        });

        expect(handler).not.toHaveBeenCalled();

        // Should trigger with Meta
        const metaEvent = new KeyboardEvent("keydown", {
          key: "m",
          metaKey: true,
          ctrlKey: false,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(metaEvent);
        });

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("handles custom shortcut with shift modifier", () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
          {
            key: "t",
            cmdOrCtrl: true,
            shiftKey: true,
            handler,
          },
        ];

        renderHook(() => useKeyboardShortcuts({ shortcuts }));

        // Should not trigger without shift
        const noShiftEvent = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          shiftKey: false,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(noShiftEvent);
        });

        expect(handler).not.toHaveBeenCalled();

        // Should trigger with shift
        const shiftEvent = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          shiftKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(shiftEvent);
        });

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("handles custom shortcut with alt modifier", () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
          {
            key: "a",
            altKey: true,
            handler,
          },
        ];

        renderHook(() => useKeyboardShortcuts({ shortcuts }));

        const event = new KeyboardEvent("keydown", {
          key: "a",
          altKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("first matching shortcut wins (timer shortcut before custom)", () => {
        const onToggleTimer = vi.fn();
        const customHandler = vi.fn();

        // Same key as timer shortcut
        const shortcuts: ShortcutConfig[] = [
          {
            key: "t",
            cmdOrCtrl: true,
            handler: customHandler,
          },
        ];

        renderHook(() => useKeyboardShortcuts({ onToggleTimer, shortcuts }));

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        // Timer shortcut is added first, so it wins
        expect(onToggleTimer).toHaveBeenCalledTimes(1);
        expect(customHandler).not.toHaveBeenCalled();
      });

      it("handles multiple custom shortcuts", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        const shortcuts: ShortcutConfig[] = [
          { key: "k", cmdOrCtrl: true, handler: handler1 },
          { key: "p", cmdOrCtrl: true, handler: handler2 },
        ];

        renderHook(() => useKeyboardShortcuts({ shortcuts }));

        const event1 = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event1);
        });

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).not.toHaveBeenCalled();

        const event2 = new KeyboardEvent("keydown", {
          key: "p",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event2);
        });

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
      });
    });

    describe("modifier key exclusivity", () => {
      it("does not trigger when extra Shift is pressed (without shiftKey in config)", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          shiftKey: true, // Extra modifier
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();
      });

      it("does not trigger when extra Alt is pressed (without altKey in config)", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          altKey: true, // Extra modifier
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();
      });

      it("triggers with cmdOrCtrl even when both Meta and Ctrl are pressed", () => {
        const onToggleTimer = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

        // Edge case: both Meta and Ctrl pressed
        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          ctrlKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        // Should trigger because cmdOrCtrl matches either
        expect(onToggleTimer).toHaveBeenCalledTimes(1);
      });
    });

    describe("callback reference stability", () => {
      it("uses updated callback without re-registering listener", () => {
        let callCount = 0;
        const callback1 = vi.fn(() => {
          callCount = 1;
        });
        const callback2 = vi.fn(() => {
          callCount = 2;
        });

        const { rerender } = renderHook(
          ({ onToggleTimer }) => useKeyboardShortcuts({ onToggleTimer }),
          { initialProps: { onToggleTimer: callback1 } }
        );

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callCount).toBe(1);

        // Update callback
        rerender({ onToggleTimer: callback2 });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(callback2).toHaveBeenCalledTimes(1);
        expect(callCount).toBe(2);
      });
    });

    describe("cleanup on unmount", () => {
      it("removes event listener on unmount", () => {
        const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

        const { unmount } = renderHook(() =>
          useKeyboardShortcuts({ onToggleTimer: vi.fn() })
        );

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          "keydown",
          expect.any(Function),
          true
        );
      });

      it("does not trigger callback after unmount", () => {
        const onToggleTimer = vi.fn();

        const { unmount } = renderHook(() =>
          useKeyboardShortcuts({ onToggleTimer })
        );

        unmount();

        const event = new KeyboardEvent("keydown", {
          key: "t",
          metaKey: true,
          bubbles: true,
        });

        act(() => {
          document.dispatchEvent(event);
        });

        expect(onToggleTimer).not.toHaveBeenCalled();
      });
    });
  });

  describe("getAriaKeyShortcut helper", () => {
    it("returns correct format for cmdOrCtrl shortcut", () => {
      const result = getAriaKeyShortcut({ key: "t", cmdOrCtrl: true });
      expect(result).toBe("Control+T Meta+T");
    });

    it("returns correct format for cmdOrCtrl with shift", () => {
      const result = getAriaKeyShortcut({
        key: "t",
        cmdOrCtrl: true,
        shiftKey: true,
      });
      expect(result).toBe("Control+Shift+T Meta+Shift+T");
    });

    it("returns correct format for cmdOrCtrl with alt", () => {
      const result = getAriaKeyShortcut({
        key: "t",
        cmdOrCtrl: true,
        altKey: true,
      });
      expect(result).toBe("Control+Alt+T Meta+Alt+T");
    });

    it("returns correct format for cmdOrCtrl with shift and alt", () => {
      const result = getAriaKeyShortcut({
        key: "n",
        cmdOrCtrl: true,
        shiftKey: true,
        altKey: true,
      });
      expect(result).toBe("Control+Shift+Alt+N Meta+Shift+Alt+N");
    });

    it("returns correct format for metaKey only", () => {
      const result = getAriaKeyShortcut({ key: "m", metaKey: true });
      expect(result).toBe("Meta+M");
    });

    it("returns correct format for ctrlKey only", () => {
      const result = getAriaKeyShortcut({ key: "c", ctrlKey: true });
      expect(result).toBe("Control+C");
    });

    it("returns correct format for key with shift", () => {
      const result = getAriaKeyShortcut({
        key: "s",
        ctrlKey: true,
        shiftKey: true,
      });
      expect(result).toBe("Control+Shift+S");
    });

    it("returns correct format for key with alt", () => {
      const result = getAriaKeyShortcut({
        key: "a",
        altKey: true,
      });
      expect(result).toBe("Alt+A");
    });

    it("returns correct format for simple key with no modifiers", () => {
      const result = getAriaKeyShortcut({ key: "Escape" });
      expect(result).toBe("ESCAPE");
    });

    it("uppercases the key", () => {
      const result = getAriaKeyShortcut({ key: "lowercase", metaKey: true });
      expect(result).toBe("Meta+LOWERCASE");
    });
  });

  describe("TIMER_SHORTCUT_ARIA constant", () => {
    it("has the correct value for timer shortcut", () => {
      expect(TIMER_SHORTCUT_ARIA).toBe("Control+T Meta+T");
    });
  });

  describe("edge cases", () => {
    it("handles null event target", () => {
      const onToggleTimer = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

      const event = new KeyboardEvent("keydown", {
        key: "t",
        metaKey: true,
        bubbles: true,
      });

      // Set target to null
      Object.defineProperty(event, "target", { value: null });

      act(() => {
        document.dispatchEvent(event);
      });

      // Should trigger since null target is not an input
      expect(onToggleTimer).toHaveBeenCalledTimes(1);
    });

    it("handles non-HTMLElement event target", () => {
      const onToggleTimer = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

      const event = new KeyboardEvent("keydown", {
        key: "t",
        metaKey: true,
        bubbles: true,
      });

      // Set target to a non-HTMLElement (e.g., document)
      Object.defineProperty(event, "target", { value: document });

      act(() => {
        document.dispatchEvent(event);
      });

      // Should trigger since document is not an input element
      expect(onToggleTimer).toHaveBeenCalledTimes(1);
    });

    it("handles contenteditable='false'", () => {
      const onToggleTimer = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

      const div = document.createElement("div");
      div.setAttribute("contenteditable", "false");
      document.body.appendChild(div);

      const event = new KeyboardEvent("keydown", {
        key: "t",
        metaKey: true,
        bubbles: true,
      });

      Object.defineProperty(event, "target", { value: div });

      act(() => {
        document.dispatchEvent(event);
      });

      // Should trigger since contenteditable='false' is not editable
      expect(onToggleTimer).toHaveBeenCalledTimes(1);

      document.body.removeChild(div);
    });

    it("handles rapid key presses", () => {
      const onToggleTimer = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

      const event = new KeyboardEvent("keydown", {
        key: "t",
        metaKey: true,
        bubbles: true,
      });

      // Rapid presses
      act(() => {
        document.dispatchEvent(event);
        document.dispatchEvent(event);
        document.dispatchEvent(event);
      });

      expect(onToggleTimer).toHaveBeenCalledTimes(3);
    });

    it("handles special keys like Enter", () => {
      const handler = vi.fn();
      const shortcuts: ShortcutConfig[] = [
        { key: "Enter", cmdOrCtrl: true, handler },
      ];

      renderHook(() => useKeyboardShortcuts({ shortcuts }));

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("handles special keys like Escape", () => {
      const handler = vi.fn();
      const shortcuts: ShortcutConfig[] = [{ key: "Escape", handler }];

      renderHook(() => useKeyboardShortcuts({ shortcuts }));

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("handles arrow keys", () => {
      const handler = vi.fn();
      const shortcuts: ShortcutConfig[] = [
        { key: "ArrowUp", altKey: true, handler },
      ];

      renderHook(() => useKeyboardShortcuts({ shortcuts }));

      const event = new KeyboardEvent("keydown", {
        key: "ArrowUp",
        altKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("handles number keys", () => {
      const handler = vi.fn();
      const shortcuts: ShortcutConfig[] = [
        { key: "1", cmdOrCtrl: true, handler },
      ];

      renderHook(() => useKeyboardShortcuts({ shortcuts }));

      const event = new KeyboardEvent("keydown", {
        key: "1",
        metaKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("integration scenarios", () => {
    it("typical workflow: toggle timer with keyboard", () => {
      let isModalOpen = false;
      const toggleModal = vi.fn(() => {
        isModalOpen = !isModalOpen;
      });

      renderHook(() => useKeyboardShortcuts({ onToggleTimer: toggleModal }));

      // First press opens modal
      const openEvent = new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(openEvent);
      });

      expect(toggleModal).toHaveBeenCalledTimes(1);
      expect(isModalOpen).toBe(true);

      // Second press closes modal
      const closeEvent = new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(closeEvent);
      });

      expect(toggleModal).toHaveBeenCalledTimes(2);
      expect(isModalOpen).toBe(false);
    });

    it("typical workflow: shortcut works on Mac and Windows", () => {
      const onToggleTimer = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

      // Mac user (Meta key)
      const macEvent = new KeyboardEvent("keydown", {
        key: "t",
        metaKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(macEvent);
      });

      expect(onToggleTimer).toHaveBeenCalledTimes(1);

      // Windows user (Ctrl key)
      const windowsEvent = new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        bubbles: true,
      });

      act(() => {
        document.dispatchEvent(windowsEvent);
      });

      expect(onToggleTimer).toHaveBeenCalledTimes(2);
    });

    it("typical workflow: user typing in input, then clicks outside to trigger shortcut", () => {
      const onToggleTimer = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleTimer }));

      const input = document.createElement("input");
      const button = document.createElement("button");
      document.body.appendChild(input);
      document.body.appendChild(button);

      // User is typing - shortcut should not fire
      const inputEvent = new KeyboardEvent("keydown", {
        key: "t",
        metaKey: true,
        bubbles: true,
      });
      Object.defineProperty(inputEvent, "target", { value: input });

      act(() => {
        document.dispatchEvent(inputEvent);
      });

      expect(onToggleTimer).not.toHaveBeenCalled();

      // User clicks outside, presses shortcut - should fire
      const buttonEvent = new KeyboardEvent("keydown", {
        key: "t",
        metaKey: true,
        bubbles: true,
      });
      Object.defineProperty(buttonEvent, "target", { value: button });

      act(() => {
        document.dispatchEvent(buttonEvent);
      });

      expect(onToggleTimer).toHaveBeenCalledTimes(1);

      document.body.removeChild(input);
      document.body.removeChild(button);
    });
  });
});
