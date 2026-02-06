import { describe, it, expect } from "vitest";
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";

describe("sanitizeReturnUrl", () => {
  it("allows relative paths", () => {
    expect(sanitizeReturnUrl("/settings")).toBe("/settings");
    expect(sanitizeReturnUrl("/settings?tab=integrations")).toBe("/settings?tab=integrations");
    expect(sanitizeReturnUrl("/")).toBe("/");
  });

  it("rejects absolute URLs to external domains", () => {
    expect(sanitizeReturnUrl("https://evil.com")).toBe("/");
    expect(sanitizeReturnUrl("https://evil.com/phishing")).toBe("/");
    expect(sanitizeReturnUrl("http://attacker.com")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeReturnUrl("//evil.com")).toBe("/");
    expect(sanitizeReturnUrl("//evil.com/path")).toBe("/");
  });

  it("rejects javascript: URLs", () => {
    expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/");
  });

  it("rejects data: URLs", () => {
    expect(sanitizeReturnUrl("data:text/html,<script>alert(1)</script>")).toBe("/");
  });

  it("returns / for empty or undefined input", () => {
    expect(sanitizeReturnUrl("")).toBe("/");
    expect(sanitizeReturnUrl(undefined as any)).toBe("/");
    expect(sanitizeReturnUrl(null as any)).toBe("/");
  });

  it("allows paths with hash fragments", () => {
    expect(sanitizeReturnUrl("/matters#section")).toBe("/matters#section");
  });
});
