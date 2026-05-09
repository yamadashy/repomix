import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../../shared/logger.js';

// Cache schema version — bump the leading integer for breaking format changes.
// The trailing component pins the cache to the actually-installed version of
// the secretlint rule preset; a `npm update` that adds new rules will produce
// a different version string and invalidate the on-disk cache automatically,
// preventing previously-clean files from being permanently bypassed even
// though the new rules would now flag them.
const SCHEMA_VERSION = 1;
const CACHE_VERSION: string = (() => {
  try {
    const req = createRequire(import.meta.url);
    const pkg = req('@secretlint/secretlint-rule-preset-recommend/package.json') as { version?: string };
    return `${SCHEMA_VERSION}:${pkg.version ?? 'unknown'}`;
  } catch {
    return `${SCHEMA_VERSION}:unknown`;
  }
})();

// Discard the least-recently-used entries when the cache exceeds this size.
// At ~17 bytes per entry (16-hex digest + JSON quoting + comma), 100 000
// entries ≈ 1.7 MB on disk.
const MAX_CACHE_ENTRIES = 100_000;

// Cache lives in the OS temp directory so it is never committed to user repos.
// The fixed filename means all repomix invocations on the same machine share
// one cache; content-addressed keys make this safe across repos.
const CACHE_FILE = path.join(os.tmpdir(), 'repomix-security-clean.json');

interface CacheData {
  version: string;
  // 16-hex-char MD5 prefixes of contents previously confirmed clean.
  entries: string[];
}

// In-memory state for the current process
let loaded = false;
let dirty = false;
const cleanHashes = new Set<string>();

/**
 * Load the on-disk cache into memory.  Silently ignores all errors (missing
 * file, corrupt JSON, wrong version) so the program degrades gracefully on
 * the first run or after the cache is deleted.
 */
export const loadSecurityCheckCache = async (): Promise<void> => {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw) as CacheData;
    if (data.version !== CACHE_VERSION) {
      logger.trace('Security check cache version mismatch — discarding');
      return;
    }
    for (const key of data.entries) {
      cleanHashes.add(key);
    }
    logger.trace(`Loaded ${cleanHashes.size} security cache entries from ${CACHE_FILE}`);
  } catch {
    // Missing, unreadable, or corrupt cache — start fresh
    logger.trace('Security check cache not found or unreadable — starting fresh');
  }
};

/**
 * Persist the in-memory cache to disk.  Fire-and-forget; errors are logged
 * but do not propagate to the caller.
 *
 * Only the set of clean-content hashes is persisted — never the messages from
 * suspicious findings, which can quote secret material from user code.
 */
export const saveSecurityCheckCache = async (): Promise<void> => {
  if (!dirty || cleanHashes.size === 0) return;
  try {
    // Evict entries down to MAX_CACHE_ENTRIES using a simple LRU approximation:
    // keep only the latest MAX entries by converting to array and slicing.
    // Set iteration order is insertion order, so the oldest entries come first.
    let entriesToSave = cleanHashes;
    if (cleanHashes.size > MAX_CACHE_ENTRIES) {
      const arr = [...cleanHashes];
      entriesToSave = new Set(arr.slice(arr.length - MAX_CACHE_ENTRIES));
    }

    const data: CacheData = {
      version: CACHE_VERSION,
      entries: [...entriesToSave],
    };
    // mode 0o600 keeps the cache readable only by the owning user. Without
    // it, the file lands at the umask default (typically 0o644) in the
    // shared $TMPDIR, where another user could read it as a set-membership
    // oracle: hash any candidate file content and look up whether the
    // 16-hex prefix appears in the JSON to learn whether the owner's repo
    // contains that exact byte-for-byte content.
    await fs.writeFile(CACHE_FILE, JSON.stringify(data), { mode: 0o600 });
    logger.trace(`Saved ${entriesToSave.size} security cache entries to ${CACHE_FILE}`);
  } catch (error) {
    logger.trace('Failed to save security check cache:', error);
  }
};

/**
 * Compute a compact cache key for a piece of content.
 *
 * Uses the first 16 hex characters (64 bits) of the MD5 digest — sufficient
 * for collision resistance in a cache of up to 100 000 entries (birthday
 * probability ≈ 5×10⁻⁹ at 16 hex chars / 10 000 entries), and keeps keys
 * short to minimise JSON overhead.
 */
export const securityCacheKey = (content: string): string => {
  return createHash('md5').update(content).digest('hex').slice(0, 16);
};

/**
 * Return true if the content was previously confirmed clean.
 * False either means "not seen before" or "previously suspicious" — both
 * cases require running the linter again to be sure.
 */
export const isCleanCached = (key: string): boolean => {
  return cleanHashes.has(key);
};

/**
 * Number of cached entries currently in memory. Used by the security check
 * to skip the per-file pre-hash pass on a cold cache (where every item is
 * guaranteed to be a miss), avoiding the ~30 ms of blocking MD5 work that
 * would otherwise extend the security-check critical path on first runs.
 */
export const getCacheSize = (): number => cleanHashes.size;

/**
 * Record that content with this key was scanned and produced no findings.
 * Suspicious results are intentionally NOT cached so that re-runs always
 * re-report them (and so the cache file never holds quoted secrets).
 */
export const markClean = (key: string): void => {
  if (!cleanHashes.has(key)) {
    cleanHashes.add(key);
    dirty = true;
  }
};

/**
 * Test-only reset hook. Clears in-memory state so each test starts from a
 * pristine cache without touching the on-disk file.
 */
export const __resetForTests = (): void => {
  loaded = false;
  dirty = false;
  cleanHashes.clear();
};
