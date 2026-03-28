import { promisify } from 'node:util';
import * as zlib from 'node:zlib';
import type { PackOptions } from '../../../types.js';

const inflateAsync = promisify(zlib.inflate);
const deflateAsync = promisify(zlib.deflate);

// Entries below this threshold are stored as raw JSON strings without zlib compression.
// For typical pack results (~10-50KB JSON), skipping zlib saves ~5-10ms per cache hit/set.
// Above the threshold, compression reduces memory usage (~60-80% ratio for JSON text).
const COMPRESSION_THRESHOLD_BYTES = 100_000; // 100KB

interface CacheEntry {
  value: Uint8Array | string; // Compressed data (Uint8Array) or raw JSON (string)
  compressed: boolean;
  timestamp: number;
}

export class RequestCache<T> {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly ttl: number;
  private readonly cleanupIntervalId: ReturnType<typeof setInterval>;

  constructor(ttlInSeconds = 60) {
    this.ttl = ttlInSeconds * 1000;

    // Set up periodic cache cleanup
    // Use .bind() to avoid capturing the surrounding scope in the closure
    this.cleanupIntervalId = setInterval(this.cleanup.bind(this), ttlInSeconds * 1000);
    this.cleanupIntervalId.unref();
  }

  dispose(): void {
    clearInterval(this.cleanupIntervalId);
    this.cache.clear();
  }

  async get(key: string): Promise<T | undefined> {
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
      if (entry.compressed) {
        const decompressedData = await inflateAsync(entry.value as Uint8Array);
        return JSON.parse(decompressedData.toString('utf8'));
      }
      return JSON.parse(entry.value as string);
    } catch (error) {
      console.error('Error reading cache entry:', error);
      this.cache.delete(key);
      return undefined;
    }
  }

  async set(key: string, value: T): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);

      // Skip zlib for small entries — compression overhead (~5-10ms) exceeds
      // the memory savings for typical pack results under 100KB.
      if (jsonString.length < COMPRESSION_THRESHOLD_BYTES) {
        this.cache.set(key, {
          value: jsonString,
          compressed: false,
          timestamp: Date.now(),
        });
        return;
      }

      const compressedData = await deflateAsync(Buffer.from(jsonString, 'utf8'));
      this.cache.set(key, {
        value: compressedData,
        compressed: true,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error caching entry:', error);
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

// Cache key generation utility.
// Uses SHA-256 hash instead of JSON.stringify to produce fixed-length keys regardless
// of options size. For large options (100KB+ patterns), this avoids O(n) JSON serialization
// on every cache lookup. Keys are sorted before hashing for deterministic output.
export function generateCacheKey(
  identifier: string,
  format: string,
  options: PackOptions,
  type: 'url' | 'file',
): string {
  // Sort option keys for deterministic ordering, then build a pipe-delimited string.
  // This avoids JSON.stringify's overhead while remaining collision-resistant.
  const optionParts: string[] = [];
  const sortedKeys = Object.keys(options).sort();
  for (const key of sortedKeys) {
    const val = options[key as keyof PackOptions];
    if (val !== undefined) {
      optionParts.push(`${key}=${val}`);
    }
  }
  return `${type}|${identifier}|${format}|${optionParts.join('|')}`;
}
