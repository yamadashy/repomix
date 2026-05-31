import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { logger } from '../../shared/logger.js';
import { getRepomixTmpDir } from '../../shared/tmpDir.js';
import { isCacheDisabled } from './tokenCountCache.js';
import type { TokenEncoding } from './tokenEncodings.js';

// On-disk JSON cache for gpt-tokenizer's BPE merge-rank tables.
//
// gpt-tokenizer ships each table as a ~2 MB CommonJS module of inline array
// literals. `resolveEncodingAsync` `require`s it, forcing V8 to lex/parse/
// execute the file and allocate a ~200k-element array on every cold worker
// thread (~120 ms) — the single largest cost on a warm-cache CLI run. The
// resolved value is a plain JSON-serializable array, so we persist it once and
// reload it with `readFileSync` + `JSON.parse` (~40 ms) on later runs: a
// restricted-grammar parse V8 handles in native code, ~3x faster than
// re-executing the JS module. The reloaded array is byte-identical to the
// resolved one (same encode output), so token counts are unchanged.
//
// This is a pure optimization: every read/write failure is swallowed and the
// caller falls back to `resolveEncodingAsync`. The cache shares the
// `REPOMIX_TOKEN_CACHE=0` opt-out and the `$TMPDIR/repomix/cache/` umbrella
// with the token-count cache (see tokenCountCache.ts).

const cjsRequire = createRequire(import.meta.url);

// On-disk serialization format version. Bump only if the persisted JSON shape
// changes in a way incompatible with files written by older repomix versions.
const BPE_RANKS_CACHE_FORMAT = 1;
// Shares the `cache/` umbrella with the token-count cache; the per-encoding
// files live in a `bpe-ranks/` subdirectory beneath it.
const CACHE_SUBDIR_NAME = 'cache';
const BPE_RANKS_SUBDIR_NAME = 'bpe-ranks';

// gpt-tokenizer version keys the cache file name so a dependency upgrade that
// changes a table automatically invalidates the stale file (different name →
// cache miss → rebuild). `gpt-tokenizer/package.json` is exported by the
// package, so this resolves the same way `gpt-tokenizer/GptEncoding` does.
//
// Files from superseded versions are not swept; they live under $TMPDIR (which
// the OS may evict) and amount to a few MB per version, so the simplicity is
// worth more than reclaiming the space.
const getGptTokenizerVersion = (): string => {
  try {
    return (cjsRequire('gpt-tokenizer/package.json') as { version: string }).version;
  } catch {
    return 'unknown';
  }
};

/**
 * Absolute path of the cached BPE-ranks file for an encoding.
 *
 * `REPOMIX_BPE_RANKS_CACHE_PATH` overrides the parent directory for tests and
 * explicit user configuration (mirrors `REPOMIX_TOKEN_CACHE_PATH`).
 */
export const getBpeRanksCachePath = (encodingName: TokenEncoding): string => {
  const fileName = `${encodingName}-${getGptTokenizerVersion()}-v${BPE_RANKS_CACHE_FORMAT}.json`;
  const override = process.env.REPOMIX_BPE_RANKS_CACHE_PATH;
  if (override) {
    return path.join(override, fileName);
  }
  return path.join(getRepomixTmpDir(), CACHE_SUBDIR_NAME, BPE_RANKS_SUBDIR_NAME, fileName);
};

/**
 * Read and parse the cached BPE ranks for `encodingName`. Returns `undefined`
 * on a cache miss, an unreadable/corrupt file, or when caching is disabled
 * (`REPOMIX_TOKEN_CACHE=0`). Never throws.
 *
 * A shape check rejects any structurally-valid-but-wrong file (e.g. an object,
 * a number, or an empty array left by an incompatible writer) so it is treated
 * as a clean miss and rebuilt, rather than handed to the tokenizer where it
 * would silently produce zero token counts.
 */
export const readBpeRanksCache = (encodingName: TokenEncoding): unknown | undefined => {
  if (isCacheDisabled()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(getBpeRanksCachePath(encodingName), 'utf8'));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      logger.trace(`Ignoring malformed BPE ranks cache for ${encodingName}`);
      return undefined;
    }
    logger.trace(`Loaded BPE ranks for ${encodingName} from cache`);
    return parsed;
  } catch {
    // Cache miss or unreadable/corrupt file — caller resolves from gpt-tokenizer.
    return undefined;
  }
};

/**
 * Persist `bpeRanks` for `encodingName` as JSON. Best-effort and never throws.
 *
 * A unique tmp name (pid + crypto-random suffix) written then atomically
 * renamed means a concurrent reader never observes a partial file, even when
 * several worker threads (which share this process's pid) resolve the same
 * encoding at once. No-ops when caching is disabled. All errors (read-only FS,
 * permission denied, races) are swallowed — the cache is optional.
 */
export const writeBpeRanksCache = (encodingName: TokenEncoding, bpeRanks: unknown): void => {
  if (isCacheDisabled()) {
    return;
  }
  const cachePath = getBpeRanksCachePath(encodingName);
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const tmpPath = `${cachePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(bpeRanks), { mode: 0o600 });
    fs.renameSync(tmpPath, cachePath);
  } catch (error) {
    logger.trace(`Failed to persist BPE ranks cache for ${encodingName}:`, error);
  }
};
