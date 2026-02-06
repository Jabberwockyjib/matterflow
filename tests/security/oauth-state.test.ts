import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOAuthState, verifyOAuthState } from "@/lib/auth/oauth-state";

describe("OAuth State Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = "test-secret-for-hmac";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createOAuthState", () => {
    it("creates a base64-encoded state string", () => {
      const state = createOAuthState({ returnUrl: "/settings" });
      expect(typeof state).toBe("string");
      // Should be valid base64
      expect(() => Buffer.from(state, "base64")).not.toThrow();
    });

    it("includes the payload data", () => {
      const state = createOAuthState({ returnUrl: "/settings", extra: "data" });
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      expect(decoded.data).toContain("returnUrl");
      expect(decoded.data).toContain("/settings");
      expect(decoded.sig).toBeDefined();
    });
  });

  describe("verifyOAuthState", () => {
    it("returns payload for valid state", () => {
      const state = createOAuthState({ returnUrl: "/settings" });
      const result = verifyOAuthState(state);
      expect(result).not.toBeNull();
      expect(result!.returnUrl).toBe("/settings");
      expect(result!.timestamp).toBeDefined();
    });

    it("returns null for null/empty state", () => {
      expect(verifyOAuthState(null)).toBeNull();
      expect(verifyOAuthState("")).toBeNull();
    });

    it("returns null for tampered state", () => {
      const state = createOAuthState({ returnUrl: "/settings" });
      // Tamper with the state
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      const data = JSON.parse(decoded.data);
      data.returnUrl = "https://evil.com";
      decoded.data = JSON.stringify(data);
      const tampered = Buffer.from(JSON.stringify(decoded)).toString("base64");

      expect(verifyOAuthState(tampered)).toBeNull();
    });

    it("returns null for expired state (>10 minutes)", () => {
      // Create state with an old timestamp by mocking Date.now
      const realNow = Date.now;
      const elevenMinutesAgo = realNow() - 11 * 60 * 1000;

      Date.now = vi.fn(() => elevenMinutesAgo);
      const state = createOAuthState({ returnUrl: "/settings" });
      Date.now = realNow;

      // Verify with current time — should be expired
      expect(verifyOAuthState(state)).toBeNull();
    });

    it("accepts state within 10 minutes", () => {
      // Create state with a recent timestamp
      const realNow = Date.now;
      const nineMinutesAgo = realNow() - 9 * 60 * 1000;

      Date.now = vi.fn(() => nineMinutesAgo);
      const state = createOAuthState({ returnUrl: "/settings" });
      Date.now = realNow;

      expect(verifyOAuthState(state)).not.toBeNull();
    });

    it("returns null for completely invalid base64", () => {
      expect(verifyOAuthState("not-valid-base64!!!")).toBeNull();
    });

    it("returns null when HMAC signature is missing", () => {
      const payload = Buffer.from(
        JSON.stringify({ data: '{"returnUrl":"/"}' })
      ).toString("base64");
      expect(verifyOAuthState(payload)).toBeNull();
    });
  });
});
