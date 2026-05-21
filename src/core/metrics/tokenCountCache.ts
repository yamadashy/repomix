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
// Per-repo "we've populated the shared cache for this repo before" markers
// live under `cache/seen/{md5(rootDirs)}`. Empty files; existence alone is
// the signal. See `tokenCountCacheSeenMarkerExistsSync` / `markRepoSeen`
// for the warm-likely heuristic that pairs the global cache file probe
// with a per-repo probe so unrelated repos cannot trigger a false warm
// signal just because some other repo populated the shared cache.
const SEEN_SUBDIR_NAME = 'seen';

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
 * Synchronously probe whether the on-disk cache file exists. Part 1 of the
 * "warm-likely" heuristic; see `tokenCountCacheSeenMarkerExistsSync` for
 * the per-repo half. A `false` here means the cache file is missing
 * machine-wide and no run has populated it yet.
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
 * Stable per-repo identifier used by the seen-marker filename. Resolves each
 * root to an absolute path before sorting + joining so callers that pass
 * relative roots (e.g. the public `pack()` API used as a library) cannot
 * collide markers across different cwds. A multi-root pack with the same
 * set of roots (in any order) hashes to the same marker, while a different
 * root set — or the same root cloned to a different absolute path, as
 * `--remote` does via `fs.mkdtemp(...)` — hashes to a different marker.
 */
const seenMarkerKey = (rootDirs: ReadonlyArray<string>): string => {
  const joined = rootDirs
    .map((d) => path.resolve(d))
    .sort()
    .join('\n');
  return createHash('md5').update(joined).digest('hex');
};

/**
 * Returns the absolute path to the per-repo "seen" marker file. Derived
 * from `getCacheFilePath()`'s directory so a `REPOMIX_TOKEN_CACHE_PATH`
 * override automatically relocates the marker alongside the cache it
 * predicts (keeps tests hermetic).
 *
 * The file itself is always 0 bytes — only existence is meaningful.
 */
export const getRepoSeenMarkerPath = (rootDirs: ReadonlyArray<string>): string => {
  const cacheDir = path.dirname(getCacheFilePath());
  return path.join(cacheDir, SEEN_SUBDIR_NAME, seenMarkerKey(rootDirs));
};

/**
 * Synchronously probe whether THIS repo has populated the shared cache in
 * a previous run. Pairs with `tokenCountCacheFileExistsSync`: the metrics
 * worker pool only treats the run as warm-likely when BOTH return true.
 *
 * The shared cache being present is necessary (otherwise there are no
 * entries to hit), but not sufficient — a fresh repo whose content has
 * never reached the cache would hit `getCached` zero times and still
 * benefit from the original `maxThreads` warm-up. The per-repo marker
 * narrows the heuristic to "this repo wrote to the cache at least once."
 *
 * Stale-marker failure mode: a previously-saved repo whose entries were
 * later FIFO-evicted by intervening packs of other repos. We still
 * predict warm, but the actual hit rate may be lower than expected.
 * Bounded: any miss spawns a worker lazily on the critical path; the
 * cost ceiling per pack is one BPE init per missing worker.
 *
 * Falsy results are conservative: cache disabled, marker missing, or
 * stat failure all return `false`.
 */
export const tokenCountCacheSeenMarkerExistsSync = (rootDirs: ReadonlyArray<string>): boolean => {
  if (isCacheDisabled()) return false;
  try {
    return fsExistsSync(getRepoSeenMarkerPath(rootDirs));
  } catch {
    return false;
  }
};

/**
 * Touch the per-repo seen marker (empty file) so future packs of the same
 * `rootDirs` recognise this machine has cache entries for it. Called from
 * `saveTokenCountCache` after the shared-cache write succeeds, so the
 * marker only appears when there is actually something cached.
 *
 * Errors degrade silently — a missing marker simply forces the next pack
 * onto the cold-prewarm path, which is correct fallback behavior.
 */
const markRepoSeen = async (rootDirs: ReadonlyArray<string>): Promise<void> => {
  if (isCacheDisabled() || rootDirs.length === 0) return;
  const markerPath = getRepoSeenMarkerPath(rootDirs);
  try {
    await fs.mkdir(path.dirname(markerPath), { recursive: true });
    // `writeFile` with empty content is the simplest cross-platform way to
    // touch a file; `O_CREAT` semantics mean overwriting an existing marker
    // is harmless (still 0 bytes, mtime refresh is fine).
    await fs.writeFile(markerPath, '', { mode: 0o600 });
  } catch (error) {
    logger.trace('Failed to touch repo-seen marker:', error);
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
 *
 * If `rootDirs` is provided, a per-repo "seen" marker is also touched on
 * successful save so future packs of the same `rootDirs` can detect that
 * this machine already has cache entries for them (see
 * `tokenCountCacheSeenMarkerExistsSync`).
 */
export const saveTokenCountCache = async (rootDirs: ReadonlyArray<string> = []): Promise<void> => {
  // Resync the per-repo marker even when the save below is a no-op. Two
  // scenarios this catches that the post-write `markRepoSeen` would miss:
  //
  //   - Upgrade from a pre-marker repomix release: the shared cache exists
  //     on disk from prior runs but no markers do. A fully-warm pack
  //     short-circuits the write (`!state.dirty`) and would otherwise
  //     never create a marker, leaving the repo stuck on cold-likely
  //     forever.
  //
  //   - Crash recovery: a previous pack landed the cache file via
  //     `fs.rename` but exited before `markRepoSeen` could touch the
  //     marker. The next run finds cache present + marker missing; this
  //     resync fixes it up.
  //
  // The touch is idempotent (0-byte writeFile over an existing 0-byte
  // file) so duplicating it with the post-write touch below is harmless.
  if (!isCacheDisabled() && rootDirs.length > 0 && tokenCountCacheFileExistsSync()) {
    await markRepoSeen(rootDirs);
  }

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

    // Touch the per-repo seen marker only after the shared-cache write
    // succeeds. If the rename above threw we skip the marker, so a future
    // pack will (correctly) take the cold-prewarm path until we actually
    // have something cached for this repo.
    if (rootDirs.length > 0) {
      await markRepoSeen(rootDirs);
    }
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
