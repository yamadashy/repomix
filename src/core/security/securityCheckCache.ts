import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../../shared/logger.js';

// Cache schema version — increment when the on-disk JSON shape changes
// incompatibly (e.g. value type, encoding of the version field).
const CACHE_SCHEMA_VERSION = 1;

// Read the actual installed versions of the secretlint engine and rule preset
// and bake them into the cache file's version field. A patch- or minor-level
// upgrade to either package can introduce new detection rules that would now
// flag content a previous run cached as "clean"; tying the cache to the exact
// installed package versions causes such upgrades to invalidate the on-disk
// cache automatically rather than relying on a manual `CACHE_VERSION` bump.
// The version string is read once at module load via `createRequire`, which
// gives us synchronous JSON access without needing import assertions.
const moduleRequire = createRequire(import.meta.url);
const readPkgVersion = (pkg: string): string => {
  try {
    return (moduleRequire(`${pkg}/package.json`) as { version: string }).version;
  } catch {
    // Fall back to a sentinel so a missing package.json still invalidates the
    // cache (any future run that succeeds in reading it will see a different
    // value and discard the file).
    return 'unknown';
  }
};
const SECRETLINT_CORE_VERSION = readPkgVersion('@secretlint/core');
const SECRETLINT_RULES_VERSION = readPkgVersion('@secretlint/secretlint-rule-preset-recommend');
const CACHE_VERSION = `${CACHE_SCHEMA_VERSION}:core@${SECRETLINT_CORE_VERSION}:rules@${SECRETLINT_RULES_VERSION}`;

// Discard the least-recently-used entries when the cache exceeds this size.
const MAX_CACHE_ENTRIES = 100_000;

// Cache lives in the OS temp directory so it is never committed to user repos.
// Content-addressed keys make this safe across repos on the same machine.
const CACHE_FILE = path.join(os.tmpdir(), 'repomix-security-check.json');

// A cached scan result: `null` means secretlint found no issues for that exact
// content; a string[] is the list of detected message strings. The original
// SuspiciousFileResult also carries `filePath` and `type`, but those are
// per-call context, not properties of the content itself — they are restored
// by the caller when reconstructing a result from a cache hit.
type CacheEntry = null | string[];

interface CacheData {
  version: string;
  // key: full 32-hex MD5 digest of the scanned content
  entries: Record<string, CacheEntry>;
}

// In-memory state for the current process
let loaded = false;
let dirty = false;
const entries = new Map<string, CacheEntry>();

/**
 * Load the on-disk cache into memory. Silently ignores all errors (missing
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
    for (const [key, value] of Object.entries(data.entries)) {
      entries.set(key, value);
    }
    logger.trace(`Loaded ${entries.size} security check cache entries from ${CACHE_FILE}`);
  } catch {
    // Missing, unreadable, or corrupt cache — start fresh
    logger.trace('Security check cache not found or unreadable — starting fresh');
  }
};

/**
 * Persist the in-memory cache to disk. Fire-and-forget; errors are logged
 * but do not propagate to the caller.
 */
export const saveSecurityCheckCache = async (): Promise<void> => {
  if (!dirty || entries.size === 0) return;
  try {
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
    logger.trace(`Saved ${entriesToSave.size} security check cache entries to ${CACHE_FILE}`);
  } catch (error) {
    logger.trace('Failed to save security check cache:', error);
  }
};

/**
 * Compute a cache key for a piece of content.
 *
 * Uses the full 32-hex (128-bit) MD5 digest. Unlike the token-count cache,
 * which truncates to 64 bits, the security cache uses the full digest because
 * a collision here would mean reusing a "clean" verdict for content that was
 * never actually scanned — a security-relevant outcome rather than just a
 * mis-reported token count. With a 128-bit key the random-collision
 * probability is negligible (~1.5×10⁻²⁹ per pair at 10⁵ entries).
 */
export const contentCacheKey = (content: string): string => {
  return createHash('md5').update(content).digest('hex');
};

/**
 * Return the cached scan result for the given key, or undefined on miss.
 * `null` is a valid hit meaning "previously scanned, no issues found".
 */
export const getCached = (key: string): CacheEntry | undefined => {
  return entries.get(key);
};

/**
 * Store a scan result in the in-memory cache.
 */
export const setCached = (key: string, value: CacheEntry): void => {
  entries.set(key, value);
  dirty = true;
};

/**
 * Number of entries currently held in the in-memory cache. Used by
 * `runSecurityCheck` to decide whether to spend main-thread time hashing
 * every file before dispatch: on a cold cache (no entries loaded) every
 * file would miss the lookup anyway, so the pre-hashing pass is pure
 * overhead and is deferred to after worker results come back, where each
 * batch's hashing overlaps with subsequent batches' worker scanning.
 */
export const getCacheSize = (): number => entries.size;

/**
 * Reset all in-memory cache state. Intended for unit tests that share a
 * process with other tests using the same module-level cache.
 */
export const resetSecurityCheckCacheForTests = (): void => {
  entries.clear();
  loaded = false;
  dirty = false;
};
