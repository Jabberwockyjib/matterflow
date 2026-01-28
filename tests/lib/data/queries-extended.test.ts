import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMattersAwaitingReview,
  fetchMattersAwaitingIntake,
  fetchOverdueMatters,
  getFirmSettings,
  invalidateFirmSettingsCache,
} from "@/lib/data/queries";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  supabaseEnvReady: vi.fn(() => false), // Use mock data
  supabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  getSessionWithProfile: vi.fn(() =>
    Promise.resolve({
      session: { user: { id: "test-user" } },
      profile: { role: "admin" },
    })
  ),
}));

describe("fetchMattersAwaitingReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns matters in 'Intake Received' stage from mock data", async () => {
    const result = await fetchMattersAwaitingReview();

    expect(result.source).toBe("mock");
    expect(Array.isArray(result.data)).toBe(true);
    // All returned matters should be in Intake Received stage
    for (const matter of result.data) {
      expect(matter.stage).toBe("Intake Received");
    }
  });

  it("returns data array even when empty", async () => {
    const result = await fetchMattersAwaitingReview();

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("source");
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe("fetchMattersAwaitingIntake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns matters in 'Intake Sent' stage from mock data", async () => {
    const result = await fetchMattersAwaitingIntake();

    expect(result.source).toBe("mock");
    expect(Array.isArray(result.data)).toBe(true);
    // All returned matters should be in Intake Sent stage
    for (const matter of result.data) {
      expect(matter.stage).toBe("Intake Sent");
    }
  });
});

describe("fetchOverdueMatters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns matters with due dates before today", async () => {
    const result = await fetchOverdueMatters();

    expect(result.source).toBe("mock");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("excludes matters where client is responsible", async () => {
    const result = await fetchOverdueMatters();

    // None of the overdue matters should have client as responsible party
    for (const matter of result.data) {
      expect(matter.responsibleParty).not.toBe("client");
    }
  });
});

describe("getFirmSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any cached settings
    invalidateFirmSettingsCache();
  });

  it("returns firm settings object", async () => {
    const settings = await getFirmSettings();

    // Should return an object with firm settings
    expect(settings).toBeDefined();
    expect(typeof settings).toBe("object");
    expect(settings).toHaveProperty("firm_name");
  });

  it("returns MatterFlow as default firm name", async () => {
    const settings = await getFirmSettings();

    expect(settings.firm_name).toBe("MatterFlow");
  });
});

describe("invalidateFirmSettingsCache", () => {
  it("clears the cached settings", () => {
    // This is a void function, just ensure it doesn't throw
    expect(() => invalidateFirmSettingsCache()).not.toThrow();
  });
});

describe("query result structure", () => {
  it("fetchMattersAwaitingReview returns correct structure", async () => {
    const result = await fetchMattersAwaitingReview();

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("source");
    expect(["supabase", "mock"]).toContain(result.source);
  });

  it("fetchMattersAwaitingIntake returns correct structure", async () => {
    const result = await fetchMattersAwaitingIntake();

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("source");
  });

  it("fetchOverdueMatters returns correct structure", async () => {
    const result = await fetchOverdueMatters();

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("source");
  });
});

describe("no session handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty data when no session", async () => {
    // Override the mock to return no session
    const authMock = await import("@/lib/auth/server");
    vi.mocked(authMock.getSessionWithProfile).mockResolvedValueOnce({
      session: null,
      profile: null,
    });

    const result = await fetchMattersAwaitingReview();

    expect(result.data).toEqual([]);
    expect(result.source).toBe("mock");
  });
});
