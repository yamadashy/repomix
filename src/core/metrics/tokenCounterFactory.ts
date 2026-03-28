import { logger } from '../../shared/logger.js';
import { TokenCounter, type TokenEncoding } from './TokenCounter.js';

// Cache for initialized TokenCounter instances by encoding
const tokenCounters = new Map<TokenEncoding, TokenCounter>();

// In-flight initialization promises to prevent duplicate initialization
const pendingInits = new Map<TokenEncoding, Promise<TokenCounter>>();

/**
 * Get or create a TokenCounter instance for the given encoding.
 * This ensures only one TokenCounter exists per encoding to optimize memory usage.
 * Concurrent calls for the same encoding share a single initialization promise.
 */
export const getTokenCounter = async (encoding: TokenEncoding): Promise<TokenCounter> => {
  const cached = tokenCounters.get(encoding);
  if (cached) {
    return cached;
  }

  const pending = pendingInits.get(encoding);
  if (pending) {
    return pending;
  }

  const initPromise = (async () => {
    const tokenCounter = new TokenCounter(encoding);
    await tokenCounter.init();
    tokenCounters.set(encoding, tokenCounter);
    pendingInits.delete(encoding);
    return tokenCounter;
  })();

  initPromise.catch(() => {
    pendingInits.delete(encoding);
  });

  pendingInits.set(encoding, initPromise);
  return initPromise;
};

/**
 * Free all TokenCounter resources and clear the cache.
 * No-op for gpt-tokenizer (pure JS), but kept for API compatibility.
 */
export const freeTokenCounters = (): void => {
  pendingInits.clear();
  for (const [encoding, tokenCounter] of tokenCounters.entries()) {
    tokenCounter.free();
    logger.debug(`Freed TokenCounter resources for encoding: ${encoding}`);
  }
  tokenCounters.clear();
};
