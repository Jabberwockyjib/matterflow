// tests/lib/billing/utils.test.ts
import { describe, it, expect } from "vitest";
import { calculateBillableDuration } from "@/lib/billing/utils";

describe("calculateBillableDuration", () => {
  describe("with 6-minute increment (default)", () => {
    it("rounds 1 minute up to 6", () => {
      expect(calculateBillableDuration(1, 6)).toBe(6);
    });

    it("keeps 6 minutes as 6", () => {
      expect(calculateBillableDuration(6, 6)).toBe(6);
    });

    it("rounds 7 minutes up to 12", () => {
      expect(calculateBillableDuration(7, 6)).toBe(12);
    });

    it("rounds 20 minutes up to 24", () => {
      expect(calculateBillableDuration(20, 6)).toBe(24);
    });
  });

  describe("with 15-minute increment", () => {
    it("rounds 3 minutes up to 15", () => {
      expect(calculateBillableDuration(3, 15)).toBe(15);
    });

    it("keeps 15 minutes as 15", () => {
      expect(calculateBillableDuration(15, 15)).toBe(15);
    });

    it("rounds 20 minutes up to 30", () => {
      expect(calculateBillableDuration(20, 15)).toBe(30);
    });

    it("rounds 21 minutes up to 30", () => {
      expect(calculateBillableDuration(21, 15)).toBe(30);
    });
  });

  describe("with 1-minute increment (no rounding)", () => {
    it("keeps 3 minutes as 3", () => {
      expect(calculateBillableDuration(3, 1)).toBe(3);
    });

    it("keeps 7 minutes as 7", () => {
      expect(calculateBillableDuration(7, 1)).toBe(7);
    });
  });

  describe("edge cases", () => {
    it("handles 0 minutes", () => {
      expect(calculateBillableDuration(0, 6)).toBe(0);
    });

    it("handles null increment by returning actual", () => {
      expect(calculateBillableDuration(7, null)).toBe(7);
    });

    it("handles undefined increment by returning actual", () => {
      expect(calculateBillableDuration(7, undefined)).toBe(7);
    });
  });
});
