import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a div element", () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton").tagName).toBe("DIV");
  });

  it("has animate-pulse class for loading animation", () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse");
  });

  it("has rounded-md class for border radius", () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton")).toHaveClass("rounded-md");
  });

  it("has bg-muted class for background color", () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton")).toHaveClass("bg-muted");
  });

  it("applies custom className", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-full" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("h-4", "w-full");
    expect(skeleton).toHaveClass("animate-pulse"); // base classes preserved
  });

  it("passes through additional props", () => {
    render(<Skeleton data-testid="skeleton" aria-label="Loading..." />);

    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-label", "Loading...");
  });

  it("can be used for text placeholders", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-[200px]" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("h-4", "w-[200px]");
  });

  it("can be used for circular avatars", () => {
    render(<Skeleton data-testid="skeleton" className="h-12 w-12 rounded-full" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("h-12", "w-12", "rounded-full");
  });

  it("can be used for card placeholders", () => {
    render(<Skeleton data-testid="skeleton" className="h-[125px] w-[250px] rounded-xl" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("h-[125px]", "w-[250px]", "rounded-xl");
  });

  it("renders multiple skeletons for loading lists", () => {
    render(
      <div data-testid="skeleton-list">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );

    const container = screen.getByTestId("skeleton-list");
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(3);
  });
});
