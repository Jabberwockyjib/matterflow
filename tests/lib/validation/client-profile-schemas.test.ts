import { describe, it, expect } from "vitest";
import { updateClientProfileSchema, phoneTypeValues, preferredContactMethodValues } from "@/lib/validation/schemas";

describe("updateClientProfileSchema", () => {
  it("accepts valid client profile data", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      phone: "555-123-4567",
      phoneType: "mobile",
      companyName: "Acme Corp",
      addressStreet: "123 Main St",
      addressCity: "Springfield",
      addressState: "IL",
      addressZip: "62701",
      preferredContactMethod: "email",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("requires valid UUID for userId", () => {
    const data = { userId: "not-a-uuid" };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates phone type enum", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      phoneType: "invalid",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates preferred contact method enum", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      preferredContactMethod: "carrier_pigeon",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("enforces max length on internal notes", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      internalNotes: "x".repeat(10001),
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows all fields to be optional except userId", () => {
    const data = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
    };
    const result = updateClientProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("phoneTypeValues", () => {
  it("has correct values", () => {
    expect(phoneTypeValues).toContain("mobile");
    expect(phoneTypeValues).toContain("business");
    expect(phoneTypeValues).toContain("home");
    expect(phoneTypeValues.length).toBe(3);
  });
});

describe("preferredContactMethodValues", () => {
  it("has correct values", () => {
    expect(preferredContactMethodValues).toContain("email");
    expect(preferredContactMethodValues).toContain("phone");
    expect(preferredContactMethodValues).toContain("text");
    expect(preferredContactMethodValues.length).toBe(3);
  });
});
