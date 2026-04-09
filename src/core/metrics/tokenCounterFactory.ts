import { logger } from '../../shared/logger.js';
import { type BpeRanks, TokenCounter, type TokenEncoding } from './TokenCounter.js';

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
 * Initialize a TokenCounter from pre-loaded BPE rank data.
 * Called by worker threads receiving BPE data from the main thread,
 * skipping the expensive per-worker file I/O (~105ms per worker).
 */
export const initTokenCounterFromBpeRanks = (encoding: TokenEncoding, bpeRanks: BpeRanks): void => {
  if (tokenCounters.has(encoding)) {
    return;
  }
  const tokenCounter = new TokenCounter(encoding);
  tokenCounter.initFromBpeRanks(bpeRanks);
  tokenCounters.set(encoding, tokenCounter);
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
