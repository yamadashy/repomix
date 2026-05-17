import { createHash, randomBytes } from 'node:crypto';
import { existsSync as fsExistsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../shared/logger.js';
import { getRepomixTmpDir } from '../../shared/tmpDir.js';
import type { TokenEncoding } from './tokenEncodings.js';

// Cache schema version. Bump when the on-disk format changes incompatibly so
// stale caches are discarded silently.
const CACHE_VERSION = 1;

// Hard cap on the number of entries held in memory and persisted to disk.
// At ~32 bytes per JSON entry, 100k entries ≈ 3 MB on disk; in-memory the
// V8 `Map<string, number>` with ~48-char string keys is closer to ~10 MB
// once Map slot and string header overhead are counted. Eviction is FIFO on
// Map insertion order, applied both on `setCached` (to bound the working
// set in long-running processes such as the MCP server) and again on save
// (defence in depth — the file cannot exceed the cap even if the eviction
// logic ever breaks).
export const MAX_CACHE_ENTRIES = 100_000;

// Cache lives under $TMPDIR/repomix/cache/, sharing the `repomix/` umbrella
// (see shared/tmpDir.ts) with other ephemeral state such as mcp-outputs/.
const CACHE_SUBDIR_NAME = 'cache';
const CACHE_FILE_NAME = 'token-counts.json';

interface CacheData {
  version: number;
  // key: `${encoding}:${byteLength}:${md5_16}`, value: tokenCount
  entries: Record<string, number>;
}

interface CacheState {
  loaded: boolean;
  dirty: boolean;
  // Monotonic counter incremented on every `setCached`. Save snapshots this
  // before writing and only clears `dirty` if the value is unchanged after
  // the write completes — this prevents `setCached` calls that ran during
  // an in-flight save from silently losing their persistence guarantee
  // (a race that can hit the MCP server when concurrent `pack()` calls
  // overlap).
  revision: number;
  entries: Map<string, number>;
}

const createState = (): CacheState => ({
  loaded: false,
  dirty: false,
  revision: 0,
  entries: new Map(),
});

let state = createState();

/**
 * Returns the absolute path to the on-disk cache file.
 * `REPOMIX_TOKEN_CACHE_PATH` overrides the default location for tests and
 * explicit user configuration.
 */
export const getCacheFilePath = (): string => {
  const override = process.env.REPOMIX_TOKEN_CACHE_PATH;
  if (override) return override;
  return path.join(getRepomixTmpDir(), CACHE_SUBDIR_NAME, CACHE_FILE_NAME);
};

/**
 * Returns true when the cache is disabled via `REPOMIX_TOKEN_CACHE=0`.
 * Any other value (including unset) leaves it enabled.
 */
export const isCacheDisabled = (): boolean => {
  return process.env.REPOMIX_TOKEN_CACHE === '0';
};

/**
 * Synchronously probe whether the on-disk cache file exists. A `true` result
 * means a previous run wrote a cache to disk and this run is almost
 * certainly going to hit a substantial fraction of `getCached` lookups — a
 * "warm-likely" heuristic used by the metrics worker pool sizing to avoid
 * pre-warming workers that will never receive a real task.
 *
 * Falsy results are conservative: cache disabled, file missing, or stat
 * failure all return `false`, which keeps the caller on the existing
 * (uncapped) warm-up path.
 */
export const tokenCountCacheFileExistsSync = (): boolean => {
  if (isCacheDisabled()) return false;
  try {
    return fsExistsSync(getCacheFilePath());
  } catch {
    return false;
  }
};

/**
 * Load the on-disk cache into memory. Errors (missing file, corrupt JSON,
 * version mismatch) degrade silently to an empty cache so first runs and
 * deleted caches keep working.
 */
export const loadTokenCountCache = async (): Promise<void> => {
  if (state.loaded) return;
  state.loaded = true;
  if (isCacheDisabled()) {
    logger.trace('Token count cache disabled via REPOMIX_TOKEN_CACHE=0');
    return;
  }
  const cacheFile = getCacheFilePath();
  try {
    const raw = await fs.readFile(cacheFile, 'utf8');
    const data = JSON.parse(raw) as CacheData;
    if (data?.version !== CACHE_VERSION || !data.entries) {
      logger.trace('Token count cache version mismatch — discarding');
      return;
    }
    // `for...in` over the parsed object avoids materialising a 100k-entry
    // `[key, value]` tuple array via `Object.entries`, which is a measurable
    // memory spike on cold load when the cache is near its cap.
    for (const key in data.entries) {
      const value = data.entries[key];
      if (typeof value === 'number') {
        state.entries.set(key, value);
      }
    }
    logger.trace(`Loaded ${state.entries.size} token count cache entries from ${cacheFile}`);
  } catch {
    logger.trace('Token count cache not found or unreadable — starting fresh');
  }
};

/**
 * Persist the in-memory cache to disk. Writes to a temporary sibling and
 * renames over the destination so concurrent invocations and interrupts
 * cannot leave a torn JSON file. Caller should await this so newly produced
 * entries are not lost on process exit.
 */
export const saveTokenCountCache = async (): Promise<void> => {
  if (!state.dirty || state.entries.size === 0) return;
  if (isCacheDisabled()) return;

  const cacheFile = getCacheFilePath();
  const cacheDir = path.dirname(cacheFile);

  try {
    // Match the directory-creation pattern used by MCP outputs
    // (`$TMPDIR/repomix/mcp-outputs/`) so all repomix temp artifacts share
    // a single `repomix/` parent. The file itself is mode 0600 below.
    await fs.mkdir(cacheDir, { recursive: true });

    // FIFO eviction defence-in-depth: setCached already caps the in-memory
    // map at MAX_CACHE_ENTRIES, but a cache file loaded from a previous
    // version with a larger cap could still arrive oversized. Prune by
    // iterating keys in insertion order (cheap) instead of materialising
    // the full entry list (expensive at 100k entries).
    if (state.entries.size > MAX_CACHE_ENTRIES) {
      const toRemove = state.entries.size - MAX_CACHE_ENTRIES;
      const keys = state.entries.keys();
      for (let i = 0; i < toRemove; i++) {
        const oldest = keys.next().value;
        if (oldest === undefined) break;
        state.entries.delete(oldest);
      }
    }

    // Snapshot revision before serialising. Any setCached() that runs while
    // we are writing will increment state.revision; we use that to decide
    // whether it is safe to clear state.dirty after the rename completes.
    const startRevision = state.revision;

    const data: CacheData = {
      version: CACHE_VERSION,
      entries: Object.fromEntries(state.entries),
    };

    // Tmp filename includes pid + a random component so two concurrent saves
    // in the same process (e.g. overlapping pack() calls in the MCP server)
    // do not collide on the same temp path before the atomic rename.
    const uniqueSuffix = randomBytes(4).toString('hex');
    const tmpFile = `${cacheFile}.${process.pid}.${uniqueSuffix}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(tmpFile, cacheFile);

    if (state.revision === startRevision) {
      state.dirty = false;
    } else {
      // Our snapshot was already stale by the time the rename landed
      // (a concurrent `setCached` ran during the in-flight write). Two
      // overlapping saves can also let the stale snapshot rename *after*
      // the newer one, so the disk now holds out-of-date data. Force
      // `dirty = true` so the next save re-persists the actual current
      // state and corrects the disk.
      state.dirty = true;
    }
    logger.trace(`Saved ${state.entries.size} token count cache entries to ${cacheFile}`);
  } catch (error) {
    logger.trace('Failed to save token count cache:', error);
  }
};

/**
 * Build a cache key for content under a specific token encoding.
 *
 * Format: `${encoding}:${byteLength}:${md5_16}`. Including the byte length
 * makes the key tolerant to MD5 collisions on differently-sized inputs and
 * keeps the digest portion short (16 hex chars / 64 bits) for compact JSON.
 */
export const contentCacheKey = (encoding: TokenEncoding, content: string): string => {
  const byteLength = Buffer.byteLength(content);
  const digest = createHash('md5').update(content).digest('hex').slice(0, 16);
  return `${encoding}:${byteLength}:${digest}`;
};

export const getCached = (key: string): number | undefined => {
  if (isCacheDisabled()) return undefined;
  return state.entries.get(key);
};

export const setCached = (key: string, tokenCount: number): void => {
  if (isCacheDisabled()) return;
  // Evict the oldest entry when inserting a new key over the cap so the
  // in-memory working set stays bounded in long-running processes (e.g. the
  // MCP server). Existing keys are refreshed without eviction.
  if (!state.entries.has(key) && state.entries.size >= MAX_CACHE_ENTRIES) {
    const oldest = state.entries.keys().next().value;
    if (oldest !== undefined) {
      state.entries.delete(oldest);
    }
  }
  state.entries.set(key, tokenCount);
  state.dirty = true;
  state.revision += 1;
};

/**
 * Test-only: drop all in-memory state so each test starts with a clean slate.
 */
export const __resetTokenCountCacheForTests = (): void => {
  state = createState();
};
