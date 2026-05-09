import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../../shared/logger.js';
import type { TokenEncoding } from './tokenEncodings.js';

// Cache schema version — increment when the format changes incompatibly
const CACHE_VERSION = 1;

// Discard the least-recently-used entries when the cache exceeds this size.
// At ~24 bytes per entry, 100 000 entries ≈ 2.4 MB on disk.
const MAX_CACHE_ENTRIES = 100_000;

// Cache lives in the OS temp directory so it is never committed to user repos.
// The fixed filename means all repomix invocations on the same machine share
// one cache; content-addressed keys make this safe across repos.
const CACHE_FILE = path.join(os.tmpdir(), 'repomix-token-counts.json');

interface CacheData {
  version: number;
  // key: `${encoding}:${contentMD5hex}`, value: tokenCount
  entries: Record<string, number>;
}

// In-memory state for the current process
let loaded = false;
let dirty = false;
const entries = new Map<string, number>();

/**
 * Load the on-disk cache into memory.  Silently ignores all errors (missing
 * file, corrupt JSON, wrong version) so the program degrades gracefully on
 * the first run or after the cache is deleted.
 */
export const loadTokenCountCache = async (): Promise<void> => {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw) as CacheData;
    if (data.version !== CACHE_VERSION) {
      logger.trace('Token count cache version mismatch — discarding');
      return;
    }
    for (const [key, value] of Object.entries(data.entries)) {
      entries.set(key, value);
    }
    logger.trace(`Loaded ${entries.size} token count cache entries from ${CACHE_FILE}`);
  } catch {
    // Missing, unreadable, or corrupt cache — start fresh
    logger.trace('Token count cache not found or unreadable — starting fresh');
  }
};

/**
 * Persist the in-memory cache to disk.  Fire-and-forget; errors are logged
 * but do not propagate to the caller.
 */
export const saveTokenCountCache = async (): Promise<void> => {
  if (!dirty || entries.size === 0) return;
  try {
    // Evict entries down to MAX_CACHE_ENTRIES using a simple LRU approximation:
    // keep only the latest MAX entries by converting to array and slicing.
    // Map iteration order is insertion order, so the oldest entries come first.
    let entriesToSave = entries;
    if (entries.size > MAX_CACHE_ENTRIES) {
      const arr = [...entries.entries()];
      entriesToSave = new Map(arr.slice(arr.length - MAX_CACHE_ENTRIES));
    }

    const data: CacheData = {
      version: CACHE_VERSION,
      entries: Object.fromEntries(entriesToSave),
    };
    await fs.writeFile(CACHE_FILE, JSON.stringify(data));
    logger.trace(`Saved ${entriesToSave.size} token count cache entries to ${CACHE_FILE}`);
  } catch (error) {
    logger.trace('Failed to save token count cache:', error);
  }
};

/**
 * Compute a compact cache key for a piece of content and its encoding.
 *
 * Uses the first 16 hex characters (64 bits) of the MD5 digest — sufficient
 * for collision resistance in a cache of up to 100 000 entries (birthday
 * probability ≈ 5×10⁻⁹ at 16 hex chars / 10 000 entries), and keeps keys
 * short to minimise JSON overhead.
 */
export const contentCacheKey = (encoding: TokenEncoding, content: string): string => {
  const digest = createHash('md5').update(content).digest('hex').slice(0, 16);
  return `${encoding}:${digest}`;
};

/**
 * Return the cached token count for the given key, or undefined on miss.
 */
export const getCached = (key: string): number | undefined => {
  return entries.get(key);
};

/**
 * Store a token count in the in-memory cache.
 */
export const setCached = (key: string, tokenCount: number): void => {
  entries.set(key, tokenCount);
  dirty = true;
};
