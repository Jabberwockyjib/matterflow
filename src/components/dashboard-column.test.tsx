import { describe, it, expect } from "vitest";
import { DashboardColumn } from "./dashboard-column";
import type { MatterSummary } from "@/lib/data/queries";
import type { StatusCategory } from "@/lib/utils/matter-helpers";

// Helper to render component and get JSX output
function renderDashboardColumn(
  title: string,
  statusCategory: StatusCategory,
  matters: MatterSummary[],
) {
  return DashboardColumn({ title, statusCategory, matters });
}

// Helper to create a matter with defaults
function createMatter(overrides: Partial<MatterSummary> = {}): MatterSummary {
  return {
    id: "matter-1",
    title: "Test Matter",
    stage: "Active",
    nextAction: "Review documents",
    nextActionDueDate: "2024-06-18",
    responsibleParty: "lawyer",
    billingModel: "hourly",
    matterType: "Contract Review",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    clientName: "Test Client",
    dueDate: "2024-06-18",
    ...overrides,
  };
}

describe("DashboardColumn", () => {
  describe("renders with title and matter cards", () => {
    it("renders column with title", () => {
      const matters = [createMatter({ id: "1" })];
      const element = renderDashboardColumn("Active", "Active", matters);

      expect(element).toBeDefined();
      expect(element.props["data-testid"]).toBe("dashboard-column");
      expect(element.props["data-status-category"]).toBe("Active");
    });

    it("renders column header with correct title", () => {
      const matters = [createMatter({ id: "1" })];
      const element = renderDashboardColumn("Active", "Active", matters);

      // Find the header element
      const header = element.props.children[0]; // First child is header
      expect(header.props["data-testid"]).toBe("dashboard-column-header");
    });

    it("renders count badge with correct number", () => {
      const matters = [
        createMatter({ id: "1" }),
        createMatter({ id: "2" }),
        createMatter({ id: "3" }),
      ];
      const element = renderDashboardColumn("Active", "Active", matters);

      // Find the header and then the badge
      const header = element.props.children[0];
      const badge = header.props.children[1]; // Second child in header is badge
      expect(badge.props["data-testid"]).toBe("dashboard-column-count");
      expect(badge.props.children).toBe(3);
    });

    it("renders matter cards for each matter", () => {
      const matters = [
        createMatter({ id: "1" }),
        createMatter({ id: "2" }),
      ];
      const element = renderDashboardColumn("Active", "Active", matters);

      // Content container is second child
      const content = element.props.children[1];
      expect(content.props["data-testid"]).toBe("dashboard-column-content");
      expect(content.props.children).toHaveLength(2);
    });
  });

  describe("empty state", () => {
    it("renders empty state when no matters", () => {
      const element = renderDashboardColumn("Active", "Active", []);

      // Content container is second child
      const content = element.props.children[1];
      const emptyState = content.props.children;
      expect(emptyState.props["data-testid"]).toBe("dashboard-column-empty");
      expect(emptyState.props.children).toBe("No matters");
    });

    it("shows count of 0 for empty column", () => {
      const element = renderDashboardColumn("Active", "Active", []);

      const header = element.props.children[0];
      const badge = header.props.children[1];
      expect(badge.props.children).toBe(0);
    });
  });

  describe("status category styling", () => {
    const categories: StatusCategory[] = [
      "Active",
      "Waiting on Client",
      "Waiting on Court",
      "Complete",
      "On Hold",
    ];

    categories.forEach((category) => {
      it(`renders with correct data attribute for ${category}`, () => {
        const element = renderDashboardColumn(category, category, []);

        expect(element.props["data-status-category"]).toBe(category);
      });

      it(`applies styling for ${category}`, () => {
        const matters = [createMatter({ id: "1" })];
        const element = renderDashboardColumn(category, category, matters);

        // Header should have category-specific styling
        const header = element.props.children[0];
        expect(header.props.className).toBeDefined();
        expect(typeof header.props.className).toBe("string");
      });
    });
  });

  describe("column structure", () => {
    it("renders as a flex column container", () => {
      const element = renderDashboardColumn("Active", "Active", []);

      expect(element.props.className).toContain("flex");
      expect(element.props.className).toContain("flex-col");
    });

    it("has minimum width for proper column display", () => {
      const element = renderDashboardColumn("Active", "Active", []);

      expect(element.props.className).toContain("min-w-");
    });

    it("content container has gap for spacing", () => {
      const matters = [createMatter({ id: "1" })];
      const element = renderDashboardColumn("Active", "Active", matters);

      const content = element.props.children[1];
      expect(content.props.className).toContain("gap-");
    });
  });

  describe("matter card rendering", () => {
    it("passes matter data to MatterCard", () => {
      const matter = createMatter({ id: "unique-123", clientName: "Acme Corp" });
      const element = renderDashboardColumn("Active", "Active", [matter]);

      const content = element.props.children[1];
      const cards = content.props.children;
      // Cards are rendered with key prop (matter.id)
      expect(cards).toHaveLength(1);
    });

    it("renders multiple matter cards in order", () => {
      const matters = [
        createMatter({ id: "1", clientName: "First Client" }),
        createMatter({ id: "2", clientName: "Second Client" }),
        createMatter({ id: "3", clientName: "Third Client" }),
      ];
      const element = renderDashboardColumn("Active", "Active", matters);

      const content = element.props.children[1];
      const cards = content.props.children;
      expect(cards).toHaveLength(3);

      // Verify each card has the correct key
      cards.forEach((card: { key: string }, index: number) => {
        expect(card.key).toBe(matters[index].id);
      });
    });
  });

  describe("accessibility", () => {
    it("has test ids for all major elements", () => {
      const matters = [createMatter({ id: "1" })];
      const element = renderDashboardColumn("Active", "Active", matters);

      // Column container
      expect(element.props["data-testid"]).toBe("dashboard-column");

      // Header
      const header = element.props.children[0];
      expect(header.props["data-testid"]).toBe("dashboard-column-header");

      // Count badge
      const badge = header.props.children[1];
      expect(badge.props["data-testid"]).toBe("dashboard-column-count");

      // Content area
      const content = element.props.children[1];
      expect(content.props["data-testid"]).toBe("dashboard-column-content");
    });

    it("has semantic h2 heading for column title", () => {
      const element = renderDashboardColumn("Active", "Active", []);

      const header = element.props.children[0];
      const title = header.props.children[0];
      expect(title.type).toBe("h2");
    });
  });
});

describe("DashboardColumn integration with types", () => {
  it("accepts valid StatusCategory types", () => {
    const categories: StatusCategory[] = [
      "Active",
      "Waiting on Client",
      "Waiting on Court",
      "Complete",
      "On Hold",
    ];

    categories.forEach((category) => {
      const element = DashboardColumn({
        title: category,
        statusCategory: category,
        matters: [],
      });
      expect(element).toBeDefined();
    });
  });

  it("accepts MatterSummary array", () => {
    const matters: MatterSummary[] = [
      {
        id: "1",
        title: "Matter 1",
        stage: "Active",
        nextAction: "Review documents",
        nextActionDueDate: "2024-06-18",
        responsibleParty: "lawyer",
        billingModel: "hourly",
        matterType: "Contract",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        clientName: null,
        dueDate: "2024-06-18",
      },
    ];

    const element = DashboardColumn({
      title: "Active",
      statusCategory: "Active",
      matters,
    });
    expect(element).toBeDefined();
  });
});
