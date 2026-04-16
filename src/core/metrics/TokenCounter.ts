import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncodingAsync } from 'gpt-tokenizer/resolveEncodingAsync';
import { logger } from '../../shared/logger.js';
import type { TokenEncoding } from './tokenEncodings.js';

// Re-export from the standalone module for backward compatibility
export { TOKEN_ENCODINGS, type TokenEncoding } from './tokenEncodings.js';

interface CountTokensOptions {
  disallowedSpecial?: Set<string>;
}

type CountTokensFn = (text: string, options?: CountTokensOptions) => number;

// Treat all text as regular content by disallowing nothing,
// so special tokens like <|endoftext|> are tokenized as ordinary text.
const PLAIN_TEXT_OPTIONS: CountTokensOptions = { disallowedSpecial: new Set() };

// Lazy-loaded countTokens functions keyed by encoding
const encodingModules = new Map<string, CountTokensFn>();

// Embed gpt-tokenizer version in the cache filename so upgrading the
// package naturally invalidates stale cache files.
const _require = createRequire(import.meta.url);
const GPT_TOKENIZER_VERSION: string = (_require('gpt-tokenizer/package.json') as { version: string }).version;

/**
 * Resolve the JSON cache path for a given encoding.
 * Uses NODE_COMPILE_CACHE (set by bin/repomix.cjs and propagated to workers)
 * so that all workers share the same cache directory. Falls back to os.tmpdir().
 * The filename includes the gpt-tokenizer version to auto-invalidate after upgrades.
 */
const getBpeCachePath = (encodingName: TokenEncoding): string => {
  const cacheDir = process.env.NODE_COMPILE_CACHE || path.join(os.tmpdir(), 'repomix-cache');
  return path.join(cacheDir, `repomix-bpe-${encodingName}-v${GPT_TOKENIZER_VERSION}.json`);
};

/**
 * Load BPE ranks from a JSON cache file or fall back to the gpt-tokenizer module.
 *
 * JSON.parse is ~5x faster than evaluating the 2.2 MB gpt-tokenizer BPE JavaScript
 * module (~24 ms vs ~108 ms) because V8 uses a specialized JSON parser that skips
 * the full JS compilation pipeline. With 4 worker threads loading BPE concurrently,
 * this reduces CPU contention during warmup and eliminates ~100-130 ms of critical
 * path delay from the slowest worker.
 */
const loadBpeRanks = async (encodingName: TokenEncoding): Promise<readonly (string | readonly number[])[]> => {
  const cachePath = getBpeCachePath(encodingName);
  try {
    const data = fs.readFileSync(cachePath, 'utf-8');
    const parsed = JSON.parse(data);
    // Guard against corrupt-but-valid-JSON (e.g. `{}`, `0`, truncated array).
    // A valid BPE ranks file has ~200K entries; anything tiny is bogus.
    if (!Array.isArray(parsed) || parsed.length < 1000) {
      throw new Error('invalid cache');
    }
    return parsed as readonly (string | readonly number[])[];
  } catch {
    // Cache miss: load from gpt-tokenizer and write cache for next run.
    // Write to a temp file and rename atomically to prevent concurrent
    // workers from producing a partially-written cache file.
    const bpeRanks = await resolveEncodingAsync(encodingName);
    const tmpPath = `${cachePath}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(tmpPath, JSON.stringify(bpeRanks));
      fs.renameSync(tmpPath, cachePath);
    } catch {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup failures
      }
    }
    return bpeRanks;
  }
};

const loadEncoding = async (encodingName: TokenEncoding): Promise<CountTokensFn> => {
  const cached = encodingModules.get(encodingName);
  if (cached) {
    return cached;
  }

  const startTime = process.hrtime.bigint();

  const bpeRanks = await loadBpeRanks(encodingName);
  const encoder = GptEncoding.getEncodingApi(encodingName, () => bpeRanks);
  const countFn = encoder.countTokens.bind(encoder) as CountTokensFn;
  encodingModules.set(encodingName, countFn);

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`TokenCounter initialization for ${encodingName} took ${initTime.toFixed(2)}ms`);

  return countFn;
};

export class TokenCounter {
  private countFn: CountTokensFn | null = null;
  private readonly encodingName: TokenEncoding;

  constructor(encodingName: TokenEncoding) {
    this.encodingName = encodingName;
  }

  async init(): Promise<void> {
    this.countFn = await loadEncoding(this.encodingName);
  }

  public countTokens(content: string, filePath?: string): number {
    if (!this.countFn) {
      throw new Error('TokenCounter not initialized. Call init() first.');
    }

    try {
      // Use PLAIN_TEXT_OPTIONS to treat all content as ordinary text,
      // skipping gpt-tokenizer's default regex scan for special tokens.
      return this.countFn(content, PLAIN_TEXT_OPTIONS);
    } catch (error) {
      let message = '';
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }

      if (filePath) {
        logger.warn(`Failed to count tokens. path: ${filePath}, error: ${message}`);
      } else {
        logger.warn(`Failed to count tokens. error: ${message}`);
      }

      return 0;
    }
  }

  // No-op: gpt-tokenizer is pure JS, no WASM resources to free
  public free(): void {}
}
