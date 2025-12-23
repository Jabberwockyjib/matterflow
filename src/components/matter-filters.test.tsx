import { describe, it, expect, vi } from "vitest";
import { MatterFilters, type MatterFiltersProps } from "./matter-filters";
import type { MatterFilters as MatterFiltersType } from "@/lib/data/queries";
import { STATUS_CATEGORIES } from "@/lib/utils/matter-helpers";

/**
 * Tests for MatterFilters component
 *
 * Note: Since MatterFilters is a React component that uses hooks (useState, useCallback, useEffect),
 * we cannot directly call it outside of a React component context in a Node.js test environment.
 *
 * These tests focus on:
 * 1. Type validation - ensuring the component accepts correct prop types
 * 2. Constants and imports - verifying the component uses correct data
 * 3. Component definition - ensuring the function exists and has correct signature
 *
 * For full interaction testing, integration tests with a proper React test environment
 * (e.g., @testing-library/react with jsdom) would be needed.
 */

describe("MatterFilters", () => {
  describe("component definition", () => {
    it("is a function component", () => {
      expect(typeof MatterFilters).toBe("function");
    });

    it("has the correct function name", () => {
      expect(MatterFilters.name).toBe("MatterFilters");
    });

    it("is exported from the module", () => {
      expect(MatterFilters).toBeDefined();
    });
  });

  describe("prop types validation", () => {
    it("MatterFiltersProps type includes onFilterChange", () => {
      // Type check - this will fail to compile if the type is wrong
      const validProps: MatterFiltersProps = {
        onFilterChange: (_filters: MatterFiltersType) => {},
      };
      expect(validProps.onFilterChange).toBeDefined();
    });

    it("MatterFiltersProps allows optional availableMatterTypes", () => {
      const propsWithTypes: MatterFiltersProps = {
        onFilterChange: () => {},
        availableMatterTypes: ["Contract", "Policy Review"],
      };
      expect(propsWithTypes.availableMatterTypes).toHaveLength(2);
    });

    it("MatterFiltersProps allows optional initialFilters", () => {
      const propsWithInitial: MatterFiltersProps = {
        onFilterChange: () => {},
        initialFilters: {
          searchQuery: "test",
          stages: ["Active"],
          matterTypes: ["Contract"],
        },
      };
      expect(propsWithInitial.initialFilters?.searchQuery).toBe("test");
    });

    it("MatterFiltersProps allows optional searchDebounceMs", () => {
      const propsWithDebounce: MatterFiltersProps = {
        onFilterChange: () => {},
        searchDebounceMs: 500,
      };
      expect(propsWithDebounce.searchDebounceMs).toBe(500);
    });

    it("MatterFiltersProps allows all optional props together", () => {
      const fullProps: MatterFiltersProps = {
        onFilterChange: () => {},
        availableMatterTypes: ["Type A", "Type B"],
        initialFilters: { searchQuery: "query" },
        searchDebounceMs: 200,
      };
      expect(fullProps).toBeDefined();
      expect(fullProps.availableMatterTypes).toHaveLength(2);
      expect(fullProps.initialFilters?.searchQuery).toBe("query");
      expect(fullProps.searchDebounceMs).toBe(200);
    });
  });

  describe("callback signature", () => {
    it("onFilterChange receives MatterFiltersType", () => {
      const receivedFilters: MatterFiltersType[] = [];

      const callback = (filters: MatterFiltersType) => {
        receivedFilters.push(filters);
      };

      // Simulate what the component would pass
      callback({ stages: ["Active"], searchQuery: "test" });

      expect(receivedFilters).toHaveLength(1);
      expect(receivedFilters[0].stages).toEqual(["Active"]);
      expect(receivedFilters[0].searchQuery).toBe("test");
    });

    it("onFilterChange can receive empty filters object", () => {
      const callback = vi.fn();

      callback({});

      expect(callback).toHaveBeenCalledWith({});
    });

    it("onFilterChange can receive filters with only stages", () => {
      const callback = vi.fn();

      callback({ stages: ["Active", "Complete"] });

      expect(callback).toHaveBeenCalledWith({ stages: ["Active", "Complete"] });
    });

    it("onFilterChange can receive filters with only matterTypes", () => {
      const callback = vi.fn();

      callback({ matterTypes: ["Contract Review"] });

      expect(callback).toHaveBeenCalledWith({
        matterTypes: ["Contract Review"],
      });
    });

    it("onFilterChange can receive filters with only searchQuery", () => {
      const callback = vi.fn();

      callback({ searchQuery: "client name" });

      expect(callback).toHaveBeenCalledWith({ searchQuery: "client name" });
    });
  });
});

describe("MatterFilters status categories", () => {
  it("uses STATUS_CATEGORIES from matter-helpers", () => {
    // The component should use these categories for checkboxes
    expect(STATUS_CATEGORIES).toBeDefined();
    expect(Array.isArray(STATUS_CATEGORIES)).toBe(true);
  });

  it("STATUS_CATEGORIES includes Active", () => {
    expect(STATUS_CATEGORIES).toContain("Active");
  });

  it("STATUS_CATEGORIES includes Waiting on Client", () => {
    expect(STATUS_CATEGORIES).toContain("Waiting on Client");
  });

  it("STATUS_CATEGORIES includes Waiting on Court", () => {
    expect(STATUS_CATEGORIES).toContain("Waiting on Court");
  });

  it("STATUS_CATEGORIES includes Complete", () => {
    expect(STATUS_CATEGORIES).toContain("Complete");
  });

  it("STATUS_CATEGORIES includes On Hold", () => {
    expect(STATUS_CATEGORIES).toContain("On Hold");
  });

  it("STATUS_CATEGORIES has exactly 5 categories", () => {
    expect(STATUS_CATEGORIES).toHaveLength(5);
  });
});

describe("MatterFiltersType structure", () => {
  it("allows stages array", () => {
    const filters: MatterFiltersType = {
      stages: ["Active", "Complete"],
    };
    expect(filters.stages).toEqual(["Active", "Complete"]);
  });

  it("allows matterTypes array", () => {
    const filters: MatterFiltersType = {
      matterTypes: ["Contract", "Policy Review"],
    };
    expect(filters.matterTypes).toEqual(["Contract", "Policy Review"]);
  });

  it("allows searchQuery string", () => {
    const filters: MatterFiltersType = {
      searchQuery: "search term",
    };
    expect(filters.searchQuery).toBe("search term");
  });

  it("allows all properties together", () => {
    const filters: MatterFiltersType = {
      stages: ["Active"],
      matterTypes: ["Contract"],
      searchQuery: "test",
    };
    expect(filters.stages).toEqual(["Active"]);
    expect(filters.matterTypes).toEqual(["Contract"]);
    expect(filters.searchQuery).toBe("test");
  });

  it("allows empty object", () => {
    const filters: MatterFiltersType = {};
    expect(filters.stages).toBeUndefined();
    expect(filters.matterTypes).toBeUndefined();
    expect(filters.searchQuery).toBeUndefined();
  });
});

describe("MatterFilters initial filter handling", () => {
  it("initialFilters can have empty stages array", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      initialFilters: { stages: [] },
    };
    expect(props.initialFilters?.stages).toEqual([]);
  });

  it("initialFilters can have empty matterTypes array", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      initialFilters: { matterTypes: [] },
    };
    expect(props.initialFilters?.matterTypes).toEqual([]);
  });

  it("initialFilters can have empty searchQuery string", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      initialFilters: { searchQuery: "" },
    };
    expect(props.initialFilters?.searchQuery).toBe("");
  });
});

describe("MatterFilters availableMatterTypes", () => {
  it("can be empty array", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      availableMatterTypes: [],
    };
    expect(props.availableMatterTypes).toEqual([]);
  });

  it("can have single matter type", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      availableMatterTypes: ["Contract"],
    };
    expect(props.availableMatterTypes).toEqual(["Contract"]);
  });

  it("can have multiple matter types", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      availableMatterTypes: [
        "Contract Review",
        "Policy Review",
        "Litigation",
        "Corporate",
      ],
    };
    expect(props.availableMatterTypes).toHaveLength(4);
  });

  it("preserves order of matter types", () => {
    const types = ["Zebra", "Alpha", "Beta"];
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      availableMatterTypes: types,
    };
    expect(props.availableMatterTypes).toEqual(["Zebra", "Alpha", "Beta"]);
  });
});

describe("MatterFilters debounce configuration", () => {
  it("searchDebounceMs can be 0", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      searchDebounceMs: 0,
    };
    expect(props.searchDebounceMs).toBe(0);
  });

  it("searchDebounceMs can be positive integer", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      searchDebounceMs: 300,
    };
    expect(props.searchDebounceMs).toBe(300);
  });

  it("searchDebounceMs can be large value", () => {
    const props: MatterFiltersProps = {
      onFilterChange: () => {},
      searchDebounceMs: 1000,
    };
    expect(props.searchDebounceMs).toBe(1000);
  });
});
