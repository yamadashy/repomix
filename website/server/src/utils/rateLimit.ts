interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly cleanupIntervalId: ReturnType<typeof setInterval>;

  constructor(windowMs = 60000, maxRequests = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodically purge expired entries to prevent unbounded memory growth.
    // Without this, the Map accumulates one entry per unique IP indefinitely,
    // since expired entries are only lazily replaced on the next isAllowed() call.
    this.cleanupIntervalId = setInterval(this.cleanup.bind(this), windowMs);
    this.cleanupIntervalId.unref();
  }

  dispose(): void {
    clearInterval(this.cleanupIntervalId);
    this.limits.clear();
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

  // Remove expired entries from the limits map
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}
