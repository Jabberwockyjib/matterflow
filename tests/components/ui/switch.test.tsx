import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  it("renders a switch element", () => {
    render(<Switch aria-label="Toggle" />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeInTheDocument();
  });

  it("starts unchecked by default", () => {
    render(<Switch aria-label="Toggle" />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveAttribute("data-state", "unchecked");
  });

  it("can be initialized as checked", () => {
    render(<Switch aria-label="Toggle" defaultChecked />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveAttribute("data-state", "checked");
  });

  it("toggles state when clicked", () => {
    render(<Switch aria-label="Toggle" />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveAttribute("data-state", "unchecked");

    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute("data-state", "checked");

    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute("data-state", "unchecked");
  });

  it("calls onCheckedChange when toggled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Toggle" onCheckedChange={onCheckedChange} />);

    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("can be controlled", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Switch aria-label="Toggle" checked={false} onCheckedChange={onCheckedChange} />
    );

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveAttribute("data-state", "unchecked");

    rerender(<Switch aria-label="Toggle" checked={true} onCheckedChange={onCheckedChange} />);
    expect(switchEl).toHaveAttribute("data-state", "checked");
  });

  it("applies custom className", () => {
    render(<Switch aria-label="Toggle" className="custom-class" />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveClass("custom-class");
  });

  it("can be disabled", () => {
    render(<Switch aria-label="Toggle" disabled />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeDisabled();
    expect(switchEl).toHaveClass("disabled:cursor-not-allowed");
  });

  it("does not toggle when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Toggle" disabled onCheckedChange={onCheckedChange} />);

    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(switchEl).toHaveAttribute("data-state", "unchecked");
  });

  it("forwards ref to the switch element", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Switch aria-label="Toggle" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
