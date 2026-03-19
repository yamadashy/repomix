import { logger } from '../../shared/logger.js';
import { TokenCounter } from './TokenCounter.js';
import type { TokenEncoding } from './tokenEncoding.js';

// Worker-level cache for TokenCounter instances by encoding
const tokenCounters = new Map<TokenEncoding, TokenCounter>();

/**
 * Get or create a TokenCounter instance for the given encoding.
 * This ensures only one TokenCounter exists per encoding per worker thread to optimize memory usage.
 */
export const getTokenCounter = (encoding: TokenEncoding): TokenCounter => {
  let tokenCounter = tokenCounters.get(encoding);
  if (!tokenCounter) {
    tokenCounter = new TokenCounter(encoding);
    tokenCounters.set(encoding, tokenCounter);
  }
  return tokenCounter;
};

/**
 * Free all TokenCounter resources and clear the cache.
 * This should be called when the worker is terminating.
 */
export const freeTokenCounters = (): void => {
  for (const [encoding] of tokenCounters.entries()) {
    logger.debug(`Freed TokenCounter resources for encoding: ${encoding}`);
  }
  tokenCounters.clear();
};
