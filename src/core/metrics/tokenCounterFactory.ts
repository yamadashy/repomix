import { logger } from '../../shared/logger.js';
import { TokenCounter, type TokenEncoding } from './TokenCounter.js';

// Worker-level cache for TokenCounter instances by encoding
const tokenCounters = new Map<TokenEncoding, TokenCounter>();

/**
 * Get or create a TokenCounter instance for the given encoding.
 * This ensures only one TokenCounter exists per encoding per worker thread to optimize memory usage.
 */
export const getTokenCounter = async (encoding: TokenEncoding): Promise<TokenCounter> => {
  let tokenCounter = tokenCounters.get(encoding);
  if (!tokenCounter) {
    tokenCounter = new TokenCounter(encoding);
    await tokenCounter.init();
    tokenCounters.set(encoding, tokenCounter);
  }
  return tokenCounter;
};

/**
 * Free all TokenCounter resources and clear the cache.
 * No-op for gpt-tokenizer (pure JS), but kept for API compatibility.
 */
export const freeTokenCounters = (): void => {
  for (const [encoding, tokenCounter] of tokenCounters.entries()) {
    tokenCounter.free();
    logger.debug(`Freed TokenCounter resources for encoding: ${encoding}`);
  }
  tokenCounters.clear();
};
