import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../../shared/logger.js';

// Cache schema version — increment when the on-disk format changes incompatibly.
// Independent from the secretlint rule version baked into each cache key.
const CACHE_VERSION = 1;

// Insertion-order eviction (FIFO) when the cache exceeds this size — Map
// iteration order is insertion order, so we slice the tail. Approximates
// LRU because every pack run re-touches every file's entry, but stays
// honest in the comment.
const MAX_CACHE_ENTRIES = 100_000;

// Cache lives in the OS temp directory so it is never committed to user repos.
// One file per machine; content-addressed keys make this safe across repos.
const CACHE_FILE = path.join(os.tmpdir(), 'repomix-security-checks.json');

// `null` = clean (encoded compactly because ~99% of files have no findings).
type CachedSecurityResult = null | { messages: string[] };

interface CacheData {
  version: number;
  // Top-level fingerprint duplicates the per-key prefix so a sync header
  // probe (`securityCheckCacheUsable`) can decide whether the cache is
  // worth using BEFORE the async load completes — no need to parse every
  // entry. Mismatch ⇒ every key would miss anyway, so we discard wholesale
  // and let the worker pre-warm run (avoiding the ~100 ms cold-start
  // regression on the first run after a `@secretlint` upgrade).
  fingerprint: string;
  // key: `${fingerprint}:${contentSHA256hex16}`, value: CachedSecurityResult
  entries: Record<string, CachedSecurityResult>;
}

// In-memory state for the current process
let loaded = false;
let dirty = false;
const entries = new Map<string, CachedSecurityResult>();

// Embed `@secretlint/core` + recommended-rule package versions in every cache
// key so a dep bump invalidates every prior entry — no stale "clean" results
// can survive a rule-set upgrade. Repomix hardcodes the rule set (see
// `securityCheckWorker.ts:createSecretLintConfig`); if user-supplied
// `.secretlintrc` is ever wired up, this fingerprint must include those rules
// too. Sub-path resolution of `package.json` works under npm's flat layout
// and pnpm's symlinked layout for direct dependencies (these are direct deps
// of repomix), but we guard for the rare environment where it fails.
//
// Fallback is `null`, not a placeholder string: a `null` fingerprint causes
// `securityCacheKey` to refuse to mint keys, which short-circuits the whole
// cache (every lookup misses, every write is dropped). That avoids the
// cross-environment poisoning a literal placeholder like `'unknown'` would
// produce — two broken environments would otherwise share the same prefix.
const _require = createRequire(import.meta.url);
const SECRETLINT_RULE_FINGERPRINT: string | null = (() => {
  try {
    const corePkg = _require('@secretlint/core/package.json');
    const presetPkg = _require('@secretlint/secretlint-rule-preset-recommend/package.json');
    return `${corePkg.version}+${presetPkg.version}`;
  } catch {
    return null;
  }
})();

/**
 * Load the on-disk cache into memory. Silently ignores missing / corrupt
 * files and discards entries when version OR rule fingerprint changed.
 * Concurrent callers see the in-flight load as already loaded (sets the
 * `loaded` flag synchronously) — same trade-off as `tokenCountCache`:
 * possible cache miss for a racing pack(), never corrupted state.
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
    if (data.fingerprint !== SECRETLINT_RULE_FINGERPRINT || SECRETLINT_RULE_FINGERPRINT === null) {
      // Rule set changed (or fingerprint unavailable). Every key in this
      // file is now stale; loading them would still produce 100 % misses
      // but would also flip `hasLoadedSecurityCheckEntries()` to true,
      // skewing the cold/warm decision. Discard wholesale instead.
      logger.trace('Security check cache fingerprint mismatch — discarding');
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
    if (SECRETLINT_RULE_FINGERPRINT === null) {
      logger.trace('Security check cache fingerprint unavailable — skipping save');
      return;
    }
    const data: CacheData = {
      version: CACHE_VERSION,
      fingerprint: SECRETLINT_RULE_FINGERPRINT,
      entries: Object.fromEntries(entriesToSave),
    };
    // `mode: 0o600` keeps the file owner-only — secretlint match strings
    // can include partial matches of the secret context (e.g. "Found AWS
    // Access Key: AKIA…"), so the cache must not be world-readable on
    // shared `/tmp` directories. `fs.writeFile`'s `mode` only applies when
    // the file is created, so we follow up with an explicit `chmod` to
    // tighten the permission on pre-existing files written by older
    // repomix versions that did not set the mode.
    await fs.writeFile(CACHE_FILE, JSON.stringify(data), { mode: 0o600 });
    try {
      await fs.chmod(CACHE_FILE, 0o600);
    } catch {
      // Non-POSIX FS (e.g. some Windows configurations) may reject chmod;
      // ignore — the file was at least written, and the owner-only mode
      // is a defence-in-depth on top of the in-memory threat model.
    }
    logger.trace(`Saved ${entriesToSave.size} security check cache entries to ${CACHE_FILE}`);
  } catch (error) {
    logger.trace('Failed to save security check cache:', error);
  }
};

/**
 * Mint a cache key for `content` under the loaded rule set, or return
 * `null` to bypass the cache when the fingerprint is unavailable
 * (returning `null` instead of a placeholder string avoids cross-broken-env
 * poisoning).
 *
 * SHA-256 truncated to 16 hex chars (64 bits). MD5 would suffice for
 * birthday-collision resistance at `MAX_CACHE_ENTRIES` (~3×10⁻¹⁰ at 100k
 * entries) but has known practical collision attacks; a malicious file
 * engineered to share the prefix of a clean entry could be misclassified
 * as clean on a subsequent run. SHA-256 has no such preimage weakness in
 * this threat model and the per-file CPU difference is under 2 %.
 * Static `createHash` import keeps the tight per-file loop fast (~1000
 * calls per pack).
 */
export const securityCacheKey = (content: string): string | null => {
  if (SECRETLINT_RULE_FINGERPRINT === null) return null;
  const digest = createHash('sha256').update(content).digest('hex').slice(0, 16);
  return `${SECRETLINT_RULE_FINGERPRINT}:${digest}`;
};

/**
 * Cached result for `key`, or `undefined` for a miss. The `null` vs
 * `undefined` distinction mirrors the on-disk encoding so callers can tell
 * "checked, clean" apart from "not yet checked".
 */
export const getCachedSecurityResult = (key: string): CachedSecurityResult | undefined => {
  return entries.get(key);
};

/**
 * `runSecurityCheck` uses this to skip the per-file SHA-256 lookup loop on the
 * cold pipeline (empty cache → guaranteed misses), saving ~28 ms / 1000 files.
 */
export const hasLoadedSecurityCheckEntries = (): boolean => entries.size > 0;

/**
 * Store a result. `null` = clean; `{ messages }` = rule-match strings only
 * (never the file content).
 */
export const setCachedSecurityResult = (key: string, value: CachedSecurityResult): void => {
  entries.set(key, value);
  dirty = true;
};

/**
 * Synchronously decide whether a prior cache file is usable for THIS run.
 * Returns true only when the file exists, parses, has the matching schema
 * version, AND its top-level fingerprint matches the loaded rule set —
 * i.e. when subsequent lookups are likely to hit. The packager uses this
 * to gate the security worker pool warm-up: skipping it on warm runs
 * saves ~50 ms of `@secretlint/core` module load per worker, but a stale
 * cache (post-`@secretlint` upgrade, fingerprint mismatch) must NOT skip
 * warmup or the cold-start runs sequentially after collectFiles, adding
 * ~100 ms of regression on the upgrade day. Sync is acceptable here:
 * the cache file is small (≤ a few MB at the LRU cap) and the probe runs
 * once at pack-start, before any I/O critical path.
 */
export const securityCheckCacheUsable = (): boolean => {
  if (SECRETLINT_RULE_FINGERPRINT === null) return false;
  if (!existsSync(CACHE_FILE)) return false;
  try {
    const raw = readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw) as Partial<CacheData>;
    if (data.version !== CACHE_VERSION) return false;
    if (data.fingerprint !== SECRETLINT_RULE_FINGERPRINT) return false;
    return true;
  } catch {
    return false;
  }
};
