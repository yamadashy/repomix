import type { PackOptions } from '../types.js';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class RequestCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttl: number;

  constructor(ttlInSeconds = 60) {
    this.ttl = ttlInSeconds * 1000; // Convert to milliseconds
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  // cleanup method to remove expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// utility function to generate a cache key
export function generateCacheKey(url: string, format: string, options: PackOptions): string {
  return JSON.stringify({
    url,
    format,
    options,
  });
}
