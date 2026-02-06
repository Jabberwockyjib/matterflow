import { describe, it, expect, afterEach } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  afterEach(() => {
    limiter?.destroy();
  });

  it("allows requests within the limit", () => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 });

    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });

    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(true);

    const result = limiter.check("user1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different keys independently", () => {
    limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });

    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user2").allowed).toBe(true);

    expect(limiter.check("user1").allowed).toBe(false);
    expect(limiter.check("user2").allowed).toBe(false);
  });

  it("allows requests after the window expires", () => {
    limiter = new RateLimiter({ maxRequests: 1, windowMs: 10 });

    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(false);

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(limiter.check("user1").allowed).toBe(true);
        resolve();
      }, 20);
    });
  });
});
