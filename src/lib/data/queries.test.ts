import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMattersWithFilters,
  type MatterSummary,
  type MatterFilters,
} from "./queries";

// Mock the supabase server module
vi.mock("@/lib/supabase/server", () => ({
  supabaseEnvReady: vi.fn(() => false), // Default to using mock data
  supabaseAdmin: vi.fn(),
}));

describe("fetchMattersWithFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with mock data (no Supabase)", () => {
    it("returns all mock data when no filters provided", async () => {
      const result = await fetchMattersWithFilters();

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(5);
      expect(result.error).toBeUndefined();
    });

    it("returns all mock data when empty filters provided", async () => {
      const result = await fetchMattersWithFilters({});

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(5);
    });

    it("filters by single stage", async () => {
      const result = await fetchMattersWithFilters({
        stages: ["Under Review"],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].stage).toBe("Under Review");
    });

    it("filters by multiple stages", async () => {
      const result = await fetchMattersWithFilters({
        stages: ["Under Review", "Waiting on Client"],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(2);
    });

    it("returns empty array when stage filter matches nothing", async () => {
      const result = await fetchMattersWithFilters({
        stages: ["Non-existent Stage"],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(0);
    });

    it("filters by single matter type", async () => {
      const result = await fetchMattersWithFilters({
        matterTypes: ["Policy Review"],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(2); // mock-1 and mock-5 are both Policy Review
      expect(result.data[0].matterType).toBe("Policy Review");
    });

    it("filters by multiple matter types", async () => {
      const result = await fetchMattersWithFilters({
        matterTypes: ["Policy Review", "Contract Review"],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(4); // mock-1, mock-2, mock-4, mock-5
    });

    it("filters by search query matching title", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "Evergreen",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toContain("Evergreen");
    });

    it("filters by search query matching client name", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "Lotus",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].clientName).toContain("Lotus");
    });

    it("filters by search query matching next action", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "Nudge",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].nextAction).toContain("Nudge");
    });

    it("search is case-insensitive", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "EVERGREEN",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
    });

    it("search trims whitespace", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "  Evergreen  ",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
    });

    it("returns empty array when search matches nothing", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "NonExistentSearchTerm",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(0);
    });

    it("combines stage and matter type filters", async () => {
      const result = await fetchMattersWithFilters({
        stages: ["Under Review"],
        matterTypes: ["Policy Review"],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].stage).toBe("Under Review");
      expect(result.data[0].matterType).toBe("Policy Review");
    });

    it("combines all filters", async () => {
      const result = await fetchMattersWithFilters({
        stages: ["Under Review", "Waiting on Client"],
        matterTypes: ["Policy Review"],
        searchQuery: "Evergreen",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toContain("Evergreen");
    });

    it("returns empty when combined filters match nothing", async () => {
      const result = await fetchMattersWithFilters({
        stages: ["Under Review"],
        matterTypes: ["Contract Review"], // This doesn't match Under Review stage
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(0);
    });

    it("ignores empty stages array", async () => {
      const result = await fetchMattersWithFilters({
        stages: [],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(5);
    });

    it("ignores empty matterTypes array", async () => {
      const result = await fetchMattersWithFilters({
        matterTypes: [],
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(5);
    });

    it("ignores empty search query", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(5);
    });

    it("ignores whitespace-only search query", async () => {
      const result = await fetchMattersWithFilters({
        searchQuery: "   ",
      });

      expect(result.source).toBe("mock");
      expect(result.data).toHaveLength(5);
    });
  });

  describe("return type structure", () => {
    it("returns correct MatterSummary structure", async () => {
      const result = await fetchMattersWithFilters();

      expect(result.data.length).toBeGreaterThan(0);
      const matter = result.data[0];

      expect(matter).toHaveProperty("id");
      expect(matter).toHaveProperty("title");
      expect(matter).toHaveProperty("stage");
      expect(matter).toHaveProperty("nextAction");
      expect(matter).toHaveProperty("responsibleParty");
      expect(matter).toHaveProperty("billingModel");
      expect(matter).toHaveProperty("matterType");
      expect(matter).toHaveProperty("updatedAt");
      expect(matter).toHaveProperty("clientName");
      expect(matter).toHaveProperty("dueDate");
    });

    it("returns data, source, and optional error", async () => {
      const result = await fetchMattersWithFilters();

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("source");
      expect(Array.isArray(result.data)).toBe(true);
      expect(["supabase", "mock"]).toContain(result.source);
    });
  });
});
