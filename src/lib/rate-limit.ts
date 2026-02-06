/**
 * In-memory sliding window rate limiter.
 *
 * Each limiter tracks requests by a key (typically IP or user ID).
 * Not suitable for multi-instance deployments; use Redis for that.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxRequests: number;
  private windowMs: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;

    // Periodically clean up expired entries (every 60 seconds)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    // Allow the process to exit even if this interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Check if a request should be allowed.
   * Returns { allowed: true } or { allowed: false, retryAfterMs }.
   */
  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    entry.timestamps.push(now);
    return { allowed: true };
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Pre-configured rate limiters for different endpoints
export const authLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 10 requests per 15 minutes
});

export const uploadLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000, // 20 uploads per minute
});

export const webhookLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 webhooks per minute
});

/**
 * Extract a rate limit key from a request.
 * Uses X-Forwarded-For header (set by reverse proxy) or falls back to a default.
 */
export function getRateLimitKey(request: Request): string {
  try {
    const forwarded = request.headers?.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
  } catch {
    // headers may not be available in some contexts
  }
  return "unknown";
}
