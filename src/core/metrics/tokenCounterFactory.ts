import { logger } from '../../shared/logger.js';
import type { EncodingData } from './encodingCache.js';
import { TokenCounter } from './TokenCounter.js';
import type { TokenEncoding } from './tokenEncoding.js';

// Worker-level cache for TokenCounter instances by encoding
const tokenCounters = new Map<TokenEncoding, TokenCounter>();

/**
 * Get or create a TokenCounter instance for the given encoding.
 * This ensures only one TokenCounter exists per encoding per worker thread to optimize memory usage.
 * When preBuiltData is provided, the encoder Map construction is bypassed for faster initialization.
 */
export const getTokenCounter = (encoding: TokenEncoding, preBuiltData?: EncodingData): TokenCounter => {
  let tokenCounter = tokenCounters.get(encoding);
  if (!tokenCounter) {
    tokenCounter = new TokenCounter(encoding, preBuiltData);
    tokenCounters.set(encoding, tokenCounter);
  }
  return tokenCounter;
};

/**
 * Free all TokenCounter resources and clear the cache.
 * This should be called when the worker is terminating.
 */
export const freeTokenCounters = (): void => {
  for (const encoding of tokenCounters.keys()) {
    logger.debug(`Freed TokenCounter resources for encoding: ${encoding}`);
  }
  tokenCounters.clear();
};
