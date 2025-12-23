import { describe, it, expect } from "vitest";
import type { MatterSummary } from "@/lib/data/queries";
import {
  STATUS_CATEGORIES,
  getStatusCategory,
  createEmptyGroupedMatters,
  groupMattersByStatus,
  getMatterCountsByStatus,
  getUniqueStages,
  getUniqueMatterTypes,
  filterMattersByCategories,
  sortMattersByDueDate,
  groupAndSortMatters,
} from "./matter-helpers";

// Helper to create a mock MatterSummary
function createMockMatter(
  overrides: Partial<MatterSummary> = {},
): MatterSummary {
  return {
    id: "test-1",
    title: "Test Matter",
    stage: "Active",
    nextAction: null,
    responsibleParty: "lawyer",
    billingModel: "flat",
    matterType: "Contract Review",
    updatedAt: new Date().toISOString(),
    clientName: "Test Client",
    dueDate: null,
    ...overrides,
  };
}

describe("matter-helpers", () => {
  describe("STATUS_CATEGORIES", () => {
    it("contains all required status categories", () => {
      expect(STATUS_CATEGORIES).toContain("Active");
      expect(STATUS_CATEGORIES).toContain("Waiting on Client");
      expect(STATUS_CATEGORIES).toContain("Waiting on Court");
      expect(STATUS_CATEGORIES).toContain("Complete");
      expect(STATUS_CATEGORIES).toContain("On Hold");
    });

    it("has exactly 5 categories", () => {
      expect(STATUS_CATEGORIES).toHaveLength(5);
    });
  });

  describe("getStatusCategory", () => {
    describe("Active stages", () => {
      it("maps 'Active' to 'Active'", () => {
        expect(getStatusCategory("Active")).toBe("Active");
      });

      it("maps 'Under Review' to 'Active'", () => {
        expect(getStatusCategory("Under Review")).toBe("Active");
      });

      it("maps 'In Progress' to 'Active'", () => {
        expect(getStatusCategory("In Progress")).toBe("Active");
      });

      it("maps 'Drafting' to 'Active'", () => {
        expect(getStatusCategory("Drafting")).toBe("Active");
      });

      it("maps 'New' to 'Active'", () => {
        expect(getStatusCategory("New")).toBe("Active");
      });

      it("maps 'Open' to 'Active'", () => {
        expect(getStatusCategory("Open")).toBe("Active");
      });
    });

    describe("Waiting on Client stages", () => {
      it("maps 'Waiting on Client' to 'Waiting on Client'", () => {
        expect(getStatusCategory("Waiting on Client")).toBe("Waiting on Client");
      });

      it("maps 'Pending Client' to 'Waiting on Client'", () => {
        expect(getStatusCategory("Pending Client")).toBe("Waiting on Client");
      });

      it("maps 'Client Review' to 'Waiting on Client'", () => {
        expect(getStatusCategory("Client Review")).toBe("Waiting on Client");
      });

      it("maps 'Awaiting Client' to 'Waiting on Client'", () => {
        expect(getStatusCategory("Awaiting Client")).toBe("Waiting on Client");
      });
    });

    describe("Waiting on Court stages", () => {
      it("maps 'Waiting on Court' to 'Waiting on Court'", () => {
        expect(getStatusCategory("Waiting on Court")).toBe("Waiting on Court");
      });

      it("maps 'Court Review' to 'Waiting on Court'", () => {
        expect(getStatusCategory("Court Review")).toBe("Waiting on Court");
      });

      it("maps 'Filed' to 'Waiting on Court'", () => {
        expect(getStatusCategory("Filed")).toBe("Waiting on Court");
      });

      it("maps 'Pending Court' to 'Waiting on Court'", () => {
        expect(getStatusCategory("Pending Court")).toBe("Waiting on Court");
      });
    });

    describe("Complete stages", () => {
      it("maps 'Complete' to 'Complete'", () => {
        expect(getStatusCategory("Complete")).toBe("Complete");
      });

      it("maps 'Completed' to 'Complete'", () => {
        expect(getStatusCategory("Completed")).toBe("Complete");
      });

      it("maps 'Closed' to 'Complete'", () => {
        expect(getStatusCategory("Closed")).toBe("Complete");
      });

      it("maps 'Done' to 'Complete'", () => {
        expect(getStatusCategory("Done")).toBe("Complete");
      });

      it("maps 'Resolved' to 'Complete'", () => {
        expect(getStatusCategory("Resolved")).toBe("Complete");
      });
    });

    describe("On Hold stages", () => {
      it("maps 'On Hold' to 'On Hold'", () => {
        expect(getStatusCategory("On Hold")).toBe("On Hold");
      });

      it("maps 'Hold' to 'On Hold'", () => {
        expect(getStatusCategory("Hold")).toBe("On Hold");
      });

      it("maps 'Paused' to 'On Hold'", () => {
        expect(getStatusCategory("Paused")).toBe("On Hold");
      });

      it("maps 'Suspended' to 'On Hold'", () => {
        expect(getStatusCategory("Suspended")).toBe("On Hold");
      });

      it("maps 'Inactive' to 'On Hold'", () => {
        expect(getStatusCategory("Inactive")).toBe("On Hold");
      });
    });

    describe("unknown stages", () => {
      it("defaults unknown stages to 'Active'", () => {
        expect(getStatusCategory("Unknown Stage")).toBe("Active");
        expect(getStatusCategory("Random Value")).toBe("Active");
        expect(getStatusCategory("")).toBe("Active");
      });
    });
  });

  describe("createEmptyGroupedMatters", () => {
    it("creates an object with all status categories", () => {
      const grouped = createEmptyGroupedMatters();
      expect(grouped).toHaveProperty("Active");
      expect(grouped).toHaveProperty("Waiting on Client");
      expect(grouped).toHaveProperty("Waiting on Court");
      expect(grouped).toHaveProperty("Complete");
      expect(grouped).toHaveProperty("On Hold");
    });

    it("initializes all categories with empty arrays", () => {
      const grouped = createEmptyGroupedMatters();
      expect(grouped["Active"]).toEqual([]);
      expect(grouped["Waiting on Client"]).toEqual([]);
      expect(grouped["Waiting on Court"]).toEqual([]);
      expect(grouped["Complete"]).toEqual([]);
      expect(grouped["On Hold"]).toEqual([]);
    });

    it("returns a new object each time", () => {
      const grouped1 = createEmptyGroupedMatters();
      const grouped2 = createEmptyGroupedMatters();
      expect(grouped1).not.toBe(grouped2);
    });
  });

  describe("groupMattersByStatus", () => {
    it("groups matters into correct categories", () => {
      const matters = [
        createMockMatter({ id: "1", stage: "Active" }),
        createMockMatter({ id: "2", stage: "Waiting on Client" }),
        createMockMatter({ id: "3", stage: "Under Review" }),
        createMockMatter({ id: "4", stage: "Complete" }),
        createMockMatter({ id: "5", stage: "On Hold" }),
      ];

      const grouped = groupMattersByStatus(matters);

      expect(grouped["Active"]).toHaveLength(2); // Active + Under Review
      expect(grouped["Waiting on Client"]).toHaveLength(1);
      expect(grouped["Waiting on Court"]).toHaveLength(0);
      expect(grouped["Complete"]).toHaveLength(1);
      expect(grouped["On Hold"]).toHaveLength(1);
    });

    it("handles empty input array", () => {
      const grouped = groupMattersByStatus([]);
      expect(grouped["Active"]).toEqual([]);
      expect(grouped["Waiting on Client"]).toEqual([]);
      expect(grouped["Waiting on Court"]).toEqual([]);
      expect(grouped["Complete"]).toEqual([]);
      expect(grouped["On Hold"]).toEqual([]);
    });

    it("preserves matter data in grouped results", () => {
      const matter = createMockMatter({
        id: "preserve-test",
        title: "Test Title",
        clientName: "Test Client",
        stage: "Active",
      });

      const grouped = groupMattersByStatus([matter]);

      expect(grouped["Active"][0]).toEqual(matter);
    });

    it("handles unknown stages by defaulting to Active", () => {
      const matter = createMockMatter({ stage: "Unknown Stage" });
      const grouped = groupMattersByStatus([matter]);
      expect(grouped["Active"]).toHaveLength(1);
    });
  });

  describe("getMatterCountsByStatus", () => {
    it("returns correct counts for each category", () => {
      const matters = [
        createMockMatter({ stage: "Active" }),
        createMockMatter({ stage: "Active" }),
        createMockMatter({ stage: "Waiting on Client" }),
        createMockMatter({ stage: "Complete" }),
        createMockMatter({ stage: "Complete" }),
        createMockMatter({ stage: "Complete" }),
      ];

      const counts = getMatterCountsByStatus(matters);

      expect(counts["Active"]).toBe(2);
      expect(counts["Waiting on Client"]).toBe(1);
      expect(counts["Waiting on Court"]).toBe(0);
      expect(counts["Complete"]).toBe(3);
      expect(counts["On Hold"]).toBe(0);
    });

    it("returns all zeros for empty input", () => {
      const counts = getMatterCountsByStatus([]);
      expect(counts["Active"]).toBe(0);
      expect(counts["Waiting on Client"]).toBe(0);
      expect(counts["Waiting on Court"]).toBe(0);
      expect(counts["Complete"]).toBe(0);
      expect(counts["On Hold"]).toBe(0);
    });
  });

  describe("getUniqueStages", () => {
    it("returns unique stages sorted alphabetically", () => {
      const matters = [
        createMockMatter({ stage: "Complete" }),
        createMockMatter({ stage: "Active" }),
        createMockMatter({ stage: "Active" }),
        createMockMatter({ stage: "On Hold" }),
      ];

      const stages = getUniqueStages(matters);

      expect(stages).toEqual(["Active", "Complete", "On Hold"]);
    });

    it("returns empty array for empty input", () => {
      expect(getUniqueStages([])).toEqual([]);
    });
  });

  describe("getUniqueMatterTypes", () => {
    it("returns unique matter types sorted alphabetically", () => {
      const matters = [
        createMockMatter({ matterType: "Policy Review" }),
        createMockMatter({ matterType: "Contract Review" }),
        createMockMatter({ matterType: "Policy Review" }),
        createMockMatter({ matterType: "Trademark" }),
      ];

      const types = getUniqueMatterTypes(matters);

      expect(types).toEqual(["Contract Review", "Policy Review", "Trademark"]);
    });

    it("returns empty array for empty input", () => {
      expect(getUniqueMatterTypes([])).toEqual([]);
    });
  });

  describe("filterMattersByCategories", () => {
    const matters = [
      createMockMatter({ id: "1", stage: "Active" }),
      createMockMatter({ id: "2", stage: "Waiting on Client" }),
      createMockMatter({ id: "3", stage: "Complete" }),
      createMockMatter({ id: "4", stage: "On Hold" }),
      createMockMatter({ id: "5", stage: "Under Review" }), // Maps to Active
    ];

    it("filters matters by single category", () => {
      const filtered = filterMattersByCategories(matters, ["Active"]);
      expect(filtered).toHaveLength(2); // Active + Under Review
    });

    it("filters matters by multiple categories", () => {
      const filtered = filterMattersByCategories(matters, [
        "Active",
        "On Hold",
      ]);
      expect(filtered).toHaveLength(3);
    });

    it("returns all matters when categories array is empty", () => {
      const filtered = filterMattersByCategories(matters, []);
      expect(filtered).toHaveLength(5);
    });

    it("returns empty array when no matters match", () => {
      const filtered = filterMattersByCategories(matters, ["Waiting on Court"]);
      expect(filtered).toHaveLength(0);
    });
  });

  describe("sortMattersByDueDate", () => {
    it("sorts matters by due date (earliest first)", () => {
      const matters = [
        createMockMatter({ id: "1", dueDate: "2024-06-20" }),
        createMockMatter({ id: "2", dueDate: "2024-06-15" }),
        createMockMatter({ id: "3", dueDate: "2024-06-25" }),
      ];

      const sorted = sortMattersByDueDate(matters);

      expect(sorted[0].id).toBe("2"); // June 15
      expect(sorted[1].id).toBe("1"); // June 20
      expect(sorted[2].id).toBe("3"); // June 25
    });

    it("puts null due dates at the end", () => {
      const matters = [
        createMockMatter({ id: "1", dueDate: null }),
        createMockMatter({ id: "2", dueDate: "2024-06-15" }),
        createMockMatter({ id: "3", dueDate: null }),
      ];

      const sorted = sortMattersByDueDate(matters);

      expect(sorted[0].id).toBe("2"); // With date
      expect(sorted[1].dueDate).toBe(null);
      expect(sorted[2].dueDate).toBe(null);
    });

    it("does not mutate original array", () => {
      const matters = [
        createMockMatter({ id: "1", dueDate: "2024-06-20" }),
        createMockMatter({ id: "2", dueDate: "2024-06-15" }),
      ];
      const originalFirst = matters[0];

      sortMattersByDueDate(matters);

      expect(matters[0]).toBe(originalFirst);
    });

    it("handles empty array", () => {
      expect(sortMattersByDueDate([])).toEqual([]);
    });

    it("handles array with all null due dates", () => {
      const matters = [
        createMockMatter({ id: "1", dueDate: null }),
        createMockMatter({ id: "2", dueDate: null }),
      ];

      const sorted = sortMattersByDueDate(matters);

      expect(sorted).toHaveLength(2);
    });
  });

  describe("groupAndSortMatters", () => {
    it("groups matters and sorts each group by due date", () => {
      const matters = [
        createMockMatter({ id: "1", stage: "Active", dueDate: "2024-06-20" }),
        createMockMatter({ id: "2", stage: "Active", dueDate: "2024-06-15" }),
        createMockMatter({ id: "3", stage: "Complete", dueDate: "2024-06-25" }),
        createMockMatter({ id: "4", stage: "Complete", dueDate: "2024-06-10" }),
      ];

      const grouped = groupAndSortMatters(matters);

      // Check Active is sorted by due date
      expect(grouped["Active"][0].id).toBe("2"); // June 15
      expect(grouped["Active"][1].id).toBe("1"); // June 20

      // Check Complete is sorted by due date
      expect(grouped["Complete"][0].id).toBe("4"); // June 10
      expect(grouped["Complete"][1].id).toBe("3"); // June 25
    });

    it("handles empty input", () => {
      const grouped = groupAndSortMatters([]);
      expect(grouped["Active"]).toEqual([]);
      expect(grouped["Waiting on Client"]).toEqual([]);
      expect(grouped["Waiting on Court"]).toEqual([]);
      expect(grouped["Complete"]).toEqual([]);
      expect(grouped["On Hold"]).toEqual([]);
    });
  });
});
