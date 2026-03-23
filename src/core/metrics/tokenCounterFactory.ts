import { logger } from '../../shared/logger.js';
import { TokenCounter, type TokenEncoding } from './TokenCounter.js';

// Cache for TokenCounter initialization promises by encoding.
// Using Promise cache prevents concurrent init calls for the same encoding.
const tokenCounterPromises = new Map<TokenEncoding, Promise<TokenCounter>>();

/**
 * Get or create a TokenCounter instance for the given encoding.
 * This ensures only one TokenCounter exists per encoding to optimize memory usage.
 * Concurrent calls for the same encoding share a single init promise.
 */
export const getTokenCounter = (encoding: TokenEncoding): Promise<TokenCounter> => {
  let promise = tokenCounterPromises.get(encoding);
  if (!promise) {
    promise = (async () => {
      const tokenCounter = new TokenCounter(encoding);
      await tokenCounter.init();
      return tokenCounter;
    })();
    tokenCounterPromises.set(encoding, promise);
  }
  return promise;
};

/**
 * Free all TokenCounter resources and clear the cache.
 * No-op for gpt-tokenizer (pure JS), but kept for API compatibility.
 */
export const freeTokenCounters = async (): Promise<void> => {
  for (const [encoding, promise] of tokenCounterPromises.entries()) {
    try {
      const tokenCounter = await promise;
      tokenCounter.free();
      logger.debug(`Freed TokenCounter resources for encoding: ${encoding}`);
    } catch {
      // Init failed, nothing to free
    }
  }
  tokenCounterPromises.clear();
};
