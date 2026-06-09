import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { logger } from '../../shared/logger.js';
import { getRepomixTmpDir } from '../../shared/tmpDir.js';

// On-disk cache of *clean* secretlint verdicts for files that pass the cheap
// pre-filter (`mightContainSecret`). Those files are the only ones that reach
// the expensive `lintSource` engine call — the dominant cost of the security
// phase — and the overwhelming majority of them turn out clean (they merely
// contain an indicator word like `secret` in a comment). Caching the clean
// verdict lets warm runs skip the engine for them entirely.
//
// IMPORTANT — only clean verdicts are cached. Files that secretlint flags as
// suspicious are never written to this cache: their findings embed the detected
// secret text, and persisting that to a temp file would defeat the point of a
// secret scanner. Suspicious files are simply re-scanned every run (there are
// very few, so the cost is negligible) and therefore re-verified each time.
//
// A cached clean verdict is a pure function of (secretlint rule version, file
// path, file content). The secretlint version is baked into the cache file name
// (a rule upgrade reads from a fresh, empty cache), and the file path + content
// are folded into each entry key, so any change that could alter the engine's
// verdict produces a miss that falls through to the real check. This mirrors the
// token-count and BPE-ranks caches already used by repomix.
//
// The key uses the FULL file path, not just the extension: some preset rules
// branch on the file name, not only its type — e.g. `secretlint-rule-npm` runs
// extra checks only when the path ends with `package.json` / `package-lock.json`
// / `.npmrc`. Keying on the path keeps the verdict for, say, `package.json`
// distinct from a byte-identical `config.json`, so a clean verdict for one is
// never replayed for the other (which the engine might flag).

// Cache schema version. Bump when the on-disk format changes incompatibly so
// stale caches are discarded silently.
const CACHE_VERSION = 1;

// Hard cap on entries held in memory and persisted to disk. Each entry is a
// short key plus a small messages array (empty for the overwhelmingly common
// "clean" verdict), so 100k entries stays a few MB on disk. FIFO eviction on
// Map insertion order bounds the working set for long-running processes such as
// the MCP server.
export const MAX_CACHE_ENTRIES = 100_000;

const CACHE_SUBDIR_NAME = 'cache';

// The cache is a set of content keys verified clean by secretlint. The stored
// value is always the empty array (a clean verdict has no messages); only the
// key's presence is meaningful. `getCached` returns `[]` for a known-clean hit
// and `undefined` for a miss (unknown or known-suspicious — suspicious files are
// never stored, so they always miss and are re-scanned). The `string[]` value
// type keeps the on-disk JSON shape identical to the token-count cache's.
export type CachedSecurityResult = string[];

interface CacheData {
  version: number;
  // key: `${filePath}:${byteLength}:${md5_16(content)}`, value: always `[]` (clean)
  entries: Record<string, string[]>;
}

interface CacheState {
  loaded: boolean;
  dirty: boolean;
  revision: number;
  entries: Map<string, string[]>;
}

const createState = (): CacheState => ({
  loaded: false,
  dirty: false,
  revision: 0,
  entries: new Map(),
});

let state = createState();

const cjsRequire = createRequire(import.meta.url);

/**
 * Version of the secretlint recommended preset that produced the cached
 * verdicts. Baked into the cache file name so a dependency upgrade — which can
 * change which content is flagged — reads from a fresh, empty cache instead of
 * trusting stale results. Falls back to `'unknown'` if the package metadata
 * cannot be resolved (still correct: the cache file is simply keyed on
 * `'unknown'` until the version becomes readable again).
 */
const getSecretlintVersion = (): string => {
  try {
    return (cjsRequire('@secretlint/secretlint-rule-preset-recommend/package.json') as { version: string }).version;
  } catch {
    return 'unknown';
  }
};

/**
 * Returns true when the cache is disabled via `REPOMIX_SECURITY_CACHE=0`.
 * Any other value (including unset) leaves it enabled.
 */
export const isCacheDisabled = (): boolean => {
  return process.env.REPOMIX_SECURITY_CACHE === '0';
};

/**
 * Absolute path to the on-disk cache file. `REPOMIX_SECURITY_CACHE_PATH`
 * overrides the default location for tests and explicit user configuration.
 * The default file name embeds the secretlint preset version so upgrades start
 * from an empty cache automatically.
 */
export const getCacheFilePath = (): string => {
  const override = process.env.REPOMIX_SECURITY_CACHE_PATH;
  if (override) return override;
  return path.join(getRepomixTmpDir(), CACHE_SUBDIR_NAME, `security-results-${getSecretlintVersion()}.json`);
};

/**
 * Load the on-disk cache into memory. Errors (missing file, corrupt JSON,
 * version mismatch) degrade silently to an empty cache so first runs and
 * deleted caches keep working — and a load failure can never cause a missed
 * secret, only a re-check.
 */
export const loadSecurityResultCache = async (): Promise<void> => {
  if (state.loaded) return;
  state.loaded = true;
  if (isCacheDisabled()) {
    logger.trace('Security result cache disabled via REPOMIX_SECURITY_CACHE=0');
    return;
  }
  const cacheFile = getCacheFilePath();
  try {
    const raw = await fs.readFile(cacheFile, 'utf8');
    const data = JSON.parse(raw) as CacheData;
    if (data?.version !== CACHE_VERSION || !data.entries) {
      logger.trace('Security result cache version mismatch — discarding');
      return;
    }
    for (const key in data.entries) {
      const value = data.entries[key];
      if (Array.isArray(value)) {
        state.entries.set(key, value);
      }
    }
    logger.trace(`Loaded ${state.entries.size} security result cache entries from ${cacheFile}`);
  } catch {
    logger.trace('Security result cache not found or unreadable — starting fresh');
  }
};

/**
 * Persist the in-memory cache to disk via temp-write + atomic rename, mirroring
 * `saveTokenCountCache`. Caller should await this so verdicts produced this run
 * are not lost on immediate process exit. All failures degrade silently.
 */
export const saveSecurityResultCache = async (): Promise<void> => {
  if (!state.dirty || state.entries.size === 0) return;
  if (isCacheDisabled()) return;

  const cacheFile = getCacheFilePath();
  const cacheDir = path.dirname(cacheFile);

  try {
    await fs.mkdir(cacheDir, { recursive: true });

    // FIFO eviction defence-in-depth (matches the token cache): trim to the cap
    // by iterating keys in insertion order rather than materialising the full
    // entry list.
    if (state.entries.size > MAX_CACHE_ENTRIES) {
      const toRemove = state.entries.size - MAX_CACHE_ENTRIES;
      const keys = state.entries.keys();
      for (let i = 0; i < toRemove; i++) {
        const oldest = keys.next().value;
        if (oldest === undefined) break;
        state.entries.delete(oldest);
      }
    }

    const startRevision = state.revision;
    const data: CacheData = {
      version: CACHE_VERSION,
      entries: Object.fromEntries(state.entries),
    };

    const uniqueSuffix = randomBytes(4).toString('hex');
    const tmpFile = `${cacheFile}.${process.pid}.${uniqueSuffix}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(tmpFile, cacheFile);

    // If a concurrent setCached ran during the in-flight write, keep dirty so the
    // next save re-persists the now-current state (mirrors the token cache).
    state.dirty = state.revision !== startRevision;
    logger.trace(`Saved ${state.entries.size} security result cache entries to ${cacheFile}`);
  } catch (error) {
    logger.trace('Failed to save security result cache:', error);
  }
};

/**
 * Build a cache key for a file's clean-verdict lookup.
 *
 * Format: `${filePath}:${byteLength}:${md5_16(content)}`. The full file path is
 * included — not just the extension — because some preset rules branch on the
 * file name (see the module header); keying on the path is what the engine
 * effectively keys its verdict on. The byte length guards against MD5 collisions
 * on differently-sized inputs and keeps the 16-hex (64 bit) digest compact — the
 * same collision posture as the token-count cache.
 */
export const securityResultCacheKey = (content: string, filePath: string): string => {
  const byteLength = Buffer.byteLength(content);
  const digest = createHash('md5').update(content).digest('hex').slice(0, 16);
  return `${filePath}:${byteLength}:${digest}`;
};

/**
 * Returns `[]` when `key`'s content is known clean from a previous run, or
 * `undefined` on a miss (never seen, or known suspicious — suspicious verdicts
 * are deliberately not cached).
 */
export const getCached = (key: string): CachedSecurityResult | undefined => {
  if (isCacheDisabled()) return undefined;
  return state.entries.get(key);
};

/**
 * Record that `key`'s content was verified clean by secretlint. Only clean
 * verdicts are ever stored (see the module header) — the value is always the
 * empty array, so no detected secret text reaches disk.
 */
export const setCachedClean = (key: string): void => {
  if (isCacheDisabled()) return;
  if (!state.entries.has(key) && state.entries.size >= MAX_CACHE_ENTRIES) {
    const oldest = state.entries.keys().next().value;
    if (oldest !== undefined) {
      state.entries.delete(oldest);
    }
  }
  state.entries.set(key, []);
  state.dirty = true;
  state.revision += 1;
};

/**
 * Test-only: drop all in-memory state so each test starts with a clean slate.
 */
export const __resetSecurityResultCacheForTests = (): void => {
  state = createState();
};
