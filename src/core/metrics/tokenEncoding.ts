/**
 * Token encoding types and loader for gpt-tokenizer.
 *
 * Replaces tiktoken (WASM-based) with gpt-tokenizer (pure JS) for ~3x faster
 * token counting with identical results.
 */

import { createRequire } from 'node:module';

export type TokenEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'r50k_base' | 'p50k_edit';

export interface GptTokenizerEncoding {
  encode(text: string, options?: { allowedSpecial?: Set<string>; disallowedSpecial?: Set<string> }): number[];
  decode(tokens: number[]): string;
}

// Cache loaded encodings to avoid redundant loads
const encodingCache = new Map<TokenEncoding, GptTokenizerEncoding>();

// Use createRequire for synchronous loading in ESM context
const esmRequire = createRequire(import.meta.url);

/**
 * Load a token encoding module synchronously.
 * Uses require() for synchronous loading to support synchronous TokenCounter constructor.
 */
export const loadTokenEncoding = (encoding: TokenEncoding): GptTokenizerEncoding => {
  const cached = encodingCache.get(encoding);
  if (cached) {
    return cached;
  }

  const mod = esmRequire(`gpt-tokenizer/cjs/encoding/${encoding}`) as GptTokenizerEncoding;
  encodingCache.set(encoding, mod);
  return mod;
};
