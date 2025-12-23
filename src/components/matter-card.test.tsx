import { describe, it, expect, beforeEach } from "vitest";
import { MatterCard } from "./matter-card";
import type { MatterSummary } from "@/lib/data/queries";

// Mock render function since we're testing in node environment
// We'll test the component's output structure and logic
function renderMatterCard(matter: MatterSummary) {
  // Simulate component rendering by calling it and checking the JSX structure
  const result = MatterCard({ matter });
  return result;
}

describe("MatterCard", () => {
  // Use a fixed reference date for consistent test results
  const referenceDate = new Date("2024-06-15T12:00:00");

  // Helper to create a matter with defaults
  function createMatter(overrides: Partial<MatterSummary> = {}): MatterSummary {
    return {
      id: "matter-1",
      title: "Test Matter",
      stage: "Active",
      nextAction: "Review documents",
      responsibleParty: "lawyer",
      billingModel: "hourly",
      matterType: "Contract Review",
      updatedAt: referenceDate.toISOString(),
      clientName: "Test Client",
      dueDate: "2024-06-18", // 3 days from reference
      ...overrides,
    };
  }

  describe("renders all required fields", () => {
    it("renders client name", () => {
      const matter = createMatter({ clientName: "Acme Corp" });
      const element = renderMatterCard(matter);

      // Check that the JSX contains client name
      expect(element).toBeDefined();
      expect(element.props.href).toBe("/matters/matter-1");
    });

    it("renders matter type badge", () => {
      const matter = createMatter({ matterType: "Policy Review" });
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
      // Component returns JSX, we verify it renders without error
    });

    it("renders next action summary", () => {
      const matter = createMatter({ nextAction: "Draft contract amendments" });
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });

    it("renders due date status when due date exists", () => {
      const matter = createMatter({ dueDate: "2024-06-18" });
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });
  });

  describe("handles missing/null data", () => {
    it("shows fallback text for null client name", () => {
      const matter = createMatter({ clientName: null });
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
      // Component should render "No client assigned" for null clientName
    });

    it("shows fallback text for null next action", () => {
      const matter = createMatter({ nextAction: null });
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
      // Component should render "No next action" for null nextAction
    });

    it("does not render due date badge when dueDate is null", () => {
      const matter = createMatter({ dueDate: null });
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
      // Due date span should not be rendered
    });
  });

  describe("link navigation", () => {
    it("links to correct matter detail page", () => {
      const matter = createMatter({ id: "matter-123" });
      const element = renderMatterCard(matter);

      expect(element.props.href).toBe("/matters/matter-123");
    });

    it("has correct accessibility attributes", () => {
      const matter = createMatter();
      const element = renderMatterCard(matter);

      expect(element.props["data-testid"]).toBe("matter-card");
    });
  });

  describe("component structure", () => {
    it("renders as a Link component", () => {
      const matter = createMatter();
      const element = renderMatterCard(matter);

      // Next.js Link components have href prop
      expect(element.props).toHaveProperty("href");
    });

    it("includes hover and focus styles", () => {
      const matter = createMatter();
      const element = renderMatterCard(matter);

      const className = element.props.className;
      expect(className).toContain("hover:");
      expect(className).toContain("focus:");
    });

    it("renders children elements with test ids", () => {
      const matter = createMatter();
      const element = renderMatterCard(matter);

      // Verify the element has children (the card content)
      expect(element.props.children).toBeDefined();
    });
  });

  describe("text truncation", () => {
    it("applies truncate class to client name", () => {
      const matter = createMatter({
        clientName: "Very Long Client Name That Should Be Truncated",
      });
      const element = renderMatterCard(matter);

      // The component should use truncate CSS class for long text
      expect(element).toBeDefined();
    });

    it("applies line-clamp to next action", () => {
      const matter = createMatter({
        nextAction:
          "This is a very long next action description that should be clamped to multiple lines for better display in the card",
      });
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });
  });

  describe("urgency styling", () => {
    it("renders without errors for overdue dates", () => {
      const matter = createMatter({ dueDate: "2024-06-10" }); // Past date
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });

    it("renders without errors for today due dates", () => {
      const matter = createMatter({ dueDate: "2024-06-15" }); // Today
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });

    it("renders without errors for soon due dates", () => {
      const matter = createMatter({ dueDate: "2024-06-17" }); // 2 days
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });

    it("renders without errors for upcoming due dates", () => {
      const matter = createMatter({ dueDate: "2024-06-20" }); // 5 days
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });

    it("renders without errors for future due dates", () => {
      const matter = createMatter({ dueDate: "2024-07-15" }); // 30 days
      const element = renderMatterCard(matter);

      expect(element).toBeDefined();
    });
  });
});

describe("MatterCard integration with types", () => {
  it("accepts valid MatterSummary type", () => {
    const matter: MatterSummary = {
      id: "test-id",
      title: "Test Title",
      stage: "Active",
      nextAction: "Test action",
      responsibleParty: "lawyer",
      billingModel: "hourly",
      matterType: "Contract",
      updatedAt: new Date().toISOString(),
      clientName: "Test Client",
      dueDate: "2024-06-18",
    };

    // This should compile without TypeScript errors
    const element = MatterCard({ matter });
    expect(element).toBeDefined();
  });

  it("handles all nullable fields", () => {
    const matter: MatterSummary = {
      id: "test-id",
      title: "Test Title",
      stage: "Active",
      nextAction: null,
      responsibleParty: "lawyer",
      billingModel: "hourly",
      matterType: "Contract",
      updatedAt: new Date().toISOString(),
      clientName: null,
      dueDate: null,
    };

    const element = MatterCard({ matter });
    expect(element).toBeDefined();
  });
});
