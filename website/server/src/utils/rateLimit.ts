interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupIntervalId: ReturnType<typeof setInterval> | undefined;

  constructor(windowMs = 60000, maxRequests = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodically purge expired entries to prevent unbounded memory growth.
    // Without cleanup, each unique IP adds ~100-500 bytes that never gets freed.
    this.cleanupIntervalId = setInterval(() => this.cleanup(), windowMs * 2);
    // Allow the process to exit even if the interval is still active
    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref();
    }
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return 0;
    return Math.max(0, entry.resetTime - Date.now());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
    this.limits.clear();
  }
}
