import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResponsibilityIcon } from "@/components/ui/responsibility-icon";

describe("ResponsibilityIcon", () => {
  describe("lawyer responsibility", () => {
    it("renders User icon for lawyer", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" />);

      // User icon is rendered as an SVG
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies amber color for lawyer", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("text-amber-600");
    });

    it("shows 'Your turn' label when showLabel is true", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" showLabel />);

      expect(screen.getByText("Your turn")).toBeInTheDocument();
    });
  });

  describe("staff responsibility", () => {
    it("renders User icon for staff", () => {
      render(<ResponsibilityIcon responsibleParty="staff" />);

      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies amber color for staff", () => {
      render(<ResponsibilityIcon responsibleParty="staff" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("text-amber-600");
    });

    it("shows 'Your turn' label when showLabel is true", () => {
      render(<ResponsibilityIcon responsibleParty="staff" showLabel />);

      expect(screen.getByText("Your turn")).toBeInTheDocument();
    });
  });

  describe("client responsibility", () => {
    it("renders Mail icon for client", () => {
      render(<ResponsibilityIcon responsibleParty="client" />);

      // Mail icon is rendered as an SVG
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies blue color for client", () => {
      render(<ResponsibilityIcon responsibleParty="client" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("text-blue-600");
    });

    it("shows 'Client's turn' label when showLabel is true", () => {
      render(<ResponsibilityIcon responsibleParty="client" showLabel />);

      expect(screen.getByText("Client's turn")).toBeInTheDocument();
    });
  });

  describe("icon only mode (showLabel=false)", () => {
    it("renders only icon without label by default", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" />);

      expect(screen.queryByText("Your turn")).not.toBeInTheDocument();
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("applies h-4 w-4 classes to icon", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("h-4", "w-4");
    });
  });

  describe("with label mode (showLabel=true)", () => {
    it("renders icon with label in a span", () => {
      render(<ResponsibilityIcon responsibleParty="client" showLabel />);

      const container = screen.getByText("Client's turn").closest("span");
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass("inline-flex", "items-center", "gap-1.5");
    });

    it("applies smaller icon size with label", () => {
      render(<ResponsibilityIcon responsibleParty="client" showLabel />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("h-3.5", "w-3.5");
    });

    it("applies text-xs font-medium to label container", () => {
      render(<ResponsibilityIcon responsibleParty="client" showLabel />);

      const container = screen.getByText("Client's turn").closest("span");
      expect(container).toHaveClass("text-xs", "font-medium");
    });
  });

  describe("custom className", () => {
    it("applies custom className to icon", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" className="custom-class" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("custom-class");
    });

    it("applies custom className to label container when showLabel is true", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" showLabel className="custom-class" />);

      const container = screen.getByText("Your turn").closest("span");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("dark mode classes", () => {
    it("has dark mode color class for client", () => {
      render(<ResponsibilityIcon responsibleParty="client" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("dark:text-blue-400");
    });

    it("has dark mode color class for lawyer", () => {
      render(<ResponsibilityIcon responsibleParty="lawyer" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("dark:text-amber-400");
    });
  });
});
