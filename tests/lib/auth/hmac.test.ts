import { describe, it, expect } from "vitest";
import { createHmacSignature, verifyHmacSignature } from "@/lib/auth/hmac";

describe("createHmacSignature", () => {
  it("creates hex signature by default", () => {
    const sig = createHmacSignature("secret", "data");
    expect(sig).toMatch(/^[0-9a-f]+$/);
    expect(sig.length).toBe(64); // SHA-256 hex = 64 chars
  });

  it("creates base64 signature", () => {
    const sig = createHmacSignature("secret", "data", "base64");
    expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("produces deterministic output", () => {
    const a = createHmacSignature("key", "msg", "hex");
    const b = createHmacSignature("key", "msg", "hex");
    expect(a).toBe(b);
  });

  it("different secrets produce different signatures", () => {
    const a = createHmacSignature("key1", "msg", "hex");
    const b = createHmacSignature("key2", "msg", "hex");
    expect(a).not.toBe(b);
  });
});

describe("verifyHmacSignature", () => {
  it("returns true for valid hex signature", () => {
    const sig = createHmacSignature("secret", "data", "hex");
    expect(verifyHmacSignature("secret", "data", sig, "hex")).toBe(true);
  });

  it("returns true for valid base64 signature", () => {
    const sig = createHmacSignature("secret", "data", "base64");
    expect(verifyHmacSignature("secret", "data", sig, "base64")).toBe(true);
  });

  it("returns false for tampered signature", () => {
    expect(verifyHmacSignature("secret", "data", "invalidsig", "hex")).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const sig = createHmacSignature("secret", "data", "hex");
    expect(verifyHmacSignature("wrong", "data", sig, "hex")).toBe(false);
  });

  it("returns false for wrong data", () => {
    const sig = createHmacSignature("secret", "data", "hex");
    expect(verifyHmacSignature("secret", "tampered", sig, "hex")).toBe(false);
  });
});
