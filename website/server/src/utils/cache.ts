import pako from 'pako';
import type { PackOptions } from '../types.js';

interface CacheEntry<T> {
  value: Uint8Array; // Compressed data
  timestamp: number;
}

export class RequestCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttl: number;

  constructor(ttlInSeconds = 60) {
    this.ttl = ttlInSeconds * 1000;

    // Set up periodic cache cleanup
    setInterval(() => this.cleanup(), ttlInSeconds * 1000);
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

    try {
      // Decompress and return the data
      const decompressedData = pako.inflate(entry.value, { to: 'string' });
      return JSON.parse(decompressedData);
    } catch (error) {
      console.error('Error decompressing cache entry:', error);
      this.cache.delete(key);
      return undefined;
    }
  }

  set(key: string, value: T): void {
    try {
      // Convert data to JSON string and compress
      const jsonString = JSON.stringify(value);
      const compressedData = pako.deflate(jsonString);

      this.cache.set(key, {
        value: compressedData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error compressing cache entry:', error);
    }
  }

  // Remove expired entries from cache
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Cache key generation utility
export function generateCacheKey(url: string, format: string, options: PackOptions): string {
  return JSON.stringify({
    url,
    format,
    options,
  });
}
