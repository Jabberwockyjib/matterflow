import { describe, expect, it } from "vitest";
import { getRouteContext } from "@/hooks/use-route-context";

describe("getRouteContext", () => {
  describe("matter detail pages", () => {
    it("extracts matter ID from /matters/[id]", () => {
      const result = getRouteContext("/matters/abc-123");

      expect(result.matterId).toBe("abc-123");
      expect(result.isOnMatterPage).toBe(true);
      expect(result.pathname).toBe("/matters/abc-123");
    });

    it("extracts matter ID from /matters/[id]/edit", () => {
      const result = getRouteContext("/matters/abc-123/edit");

      expect(result.matterId).toBe("abc-123");
      expect(result.isOnMatterPage).toBe(true);
    });

    it("extracts matter ID from /matters/[id]/time", () => {
      const result = getRouteContext("/matters/abc-123/time");

      expect(result.matterId).toBe("abc-123");
      expect(result.isOnMatterPage).toBe(true);
    });

    it("extracts matter ID from /matters/[id]/tasks", () => {
      const result = getRouteContext("/matters/abc-123/tasks");

      expect(result.matterId).toBe("abc-123");
      expect(result.isOnMatterPage).toBe(true);
    });

    it("extracts matter ID from /matters/[id]/billing", () => {
      const result = getRouteContext("/matters/abc-123/billing");

      expect(result.matterId).toBe("abc-123");
      expect(result.isOnMatterPage).toBe(true);
    });

    it("extracts matter ID from /matters/[id]/documents", () => {
      const result = getRouteContext("/matters/abc-123/documents");

      expect(result.matterId).toBe("abc-123");
      expect(result.isOnMatterPage).toBe(true);
    });

    it("extracts matter ID from /matters/[id]/notes", () => {
      const result = getRouteContext("/matters/abc-123/notes");

      expect(result.matterId).toBe("abc-123");
      expect(result.isOnMatterPage).toBe(true);
    });
  });

  describe("non-matter pages", () => {
    it("returns null for home page", () => {
      const result = getRouteContext("/");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });

    it("returns null for matters list page", () => {
      const result = getRouteContext("/matters");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });

    it("returns null for tasks page", () => {
      const result = getRouteContext("/tasks");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });

    it("returns null for time page", () => {
      const result = getRouteContext("/time");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });

    it("returns null for billing page", () => {
      const result = getRouteContext("/billing");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });

    it("returns null for settings page", () => {
      const result = getRouteContext("/settings");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles UUID-style matter IDs", () => {
      const result = getRouteContext("/matters/550e8400-e29b-41d4-a716-446655440000");

      expect(result.matterId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.isOnMatterPage).toBe(true);
    });

    it("handles alphanumeric matter IDs", () => {
      const result = getRouteContext("/matters/matter123ABC");

      expect(result.matterId).toBe("matter123ABC");
      expect(result.isOnMatterPage).toBe(true);
    });

    it("returns null for unrecognized subpaths", () => {
      const result = getRouteContext("/matters/abc-123/unknown-subpath");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });

    it("returns null for deeply nested paths", () => {
      const result = getRouteContext("/matters/abc-123/tasks/456");

      expect(result.matterId).toBeNull();
      expect(result.isOnMatterPage).toBe(false);
    });
  });
});
