import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

describe("Tabs", () => {
  const renderTabs = (props?: { defaultValue?: string; value?: string; onValueChange?: (value: string) => void }) => {
    return render(
      <Tabs {...props}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    );
  };

  describe("TabsList", () => {
    it("renders all tab triggers", () => {
      renderTabs({ defaultValue: "tab1" });

      expect(screen.getByText("Tab 1")).toBeInTheDocument();
      expect(screen.getByText("Tab 2")).toBeInTheDocument();
      expect(screen.getByText("Tab 3")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list-class">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabsList = screen.getByText("Tab 1").parentElement;
      expect(tabsList).toHaveClass("custom-list-class");
    });
  });

  describe("TabsTrigger", () => {
    it("renders as a button", () => {
      renderTabs({ defaultValue: "tab1" });

      const triggers = screen.getAllByRole("button");
      expect(triggers).toHaveLength(3);
    });

    it("applies active styles to selected tab", () => {
      renderTabs({ defaultValue: "tab1" });

      const tab1 = screen.getByText("Tab 1");
      const tab2 = screen.getByText("Tab 2");

      expect(tab1).toHaveClass("bg-white", "text-slate-900");
      expect(tab2).not.toHaveClass("bg-white");
    });

    it("changes active tab on click", () => {
      renderTabs({ defaultValue: "tab1" });

      const tab2 = screen.getByText("Tab 2");
      fireEvent.click(tab2);

      expect(tab2).toHaveClass("bg-white", "text-slate-900");
      expect(screen.getByText("Tab 1")).not.toHaveClass("bg-white");
    });

    it("applies custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger-class">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("Tab 1")).toHaveClass("custom-trigger-class");
    });
  });

  describe("TabsContent", () => {
    it("shows content for active tab", () => {
      renderTabs({ defaultValue: "tab1" });

      expect(screen.getByText("Content 1")).toBeInTheDocument();
      expect(screen.queryByText("Content 2")).not.toBeInTheDocument();
      expect(screen.queryByText("Content 3")).not.toBeInTheDocument();
    });

    it("updates content when tab changes", () => {
      renderTabs({ defaultValue: "tab1" });

      fireEvent.click(screen.getByText("Tab 2"));

      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content-class">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("Content 1")).toHaveClass("custom-content-class");
    });
  });

  describe("controlled mode", () => {
    it("respects controlled value prop", () => {
      const { rerender } = render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("Content 1")).toBeInTheDocument();

      rerender(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("calls onValueChange when tab is clicked", () => {
      const onValueChange = vi.fn();
      renderTabs({ value: "tab1", onValueChange });

      fireEvent.click(screen.getByText("Tab 2"));

      expect(onValueChange).toHaveBeenCalledWith("tab2");
    });

    it("does not internally update state when controlled", () => {
      const onValueChange = vi.fn();
      renderTabs({ value: "tab1", onValueChange });

      fireEvent.click(screen.getByText("Tab 2"));

      // Content should still show tab1 because value is controlled
      expect(screen.getByText("Content 1")).toBeInTheDocument();
    });
  });

  describe("uncontrolled mode", () => {
    it("uses defaultValue for initial state", () => {
      renderTabs({ defaultValue: "tab2" });

      expect(screen.getByText("Content 2")).toBeInTheDocument();
      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    });

    it("manages state internally without onValueChange", () => {
      renderTabs({ defaultValue: "tab1" });

      expect(screen.getByText("Content 1")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Tab 2"));

      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });
  });

  describe("Tabs container", () => {
    it("applies custom className to container", () => {
      render(
        <Tabs defaultValue="tab1" className="custom-tabs-class">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const container = screen.getByText("Tab 1").closest(".custom-tabs-class");
      expect(container).toBeInTheDocument();
    });
  });
});
