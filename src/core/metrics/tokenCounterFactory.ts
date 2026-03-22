import { logger } from '../../shared/logger.js';
import { type TokenCountEncoding, TokenCounter } from './TokenCounter.js';

// Cache for TokenCounter instances by encoding
const tokenCounters = new Map<TokenCountEncoding, TokenCounter>();

/**
 * Get or create a TokenCounter instance for the given encoding.
 * This ensures only one TokenCounter exists per encoding to optimize memory usage.
 */
export const getTokenCounter = async (encoding: TokenCountEncoding): Promise<TokenCounter> => {
  let tokenCounter = tokenCounters.get(encoding);
  if (!tokenCounter) {
    tokenCounter = await TokenCounter.create(encoding);
    tokenCounters.set(encoding, tokenCounter);
  }
  return tokenCounter;
};

/**
 * Free all TokenCounter resources and clear the cache.
 */
export const freeTokenCounters = (): void => {
  for (const [encoding, tokenCounter] of tokenCounters.entries()) {
    tokenCounter.free();
    logger.debug(`Freed TokenCounter resources for encoding: ${encoding}`);
  }
  tokenCounters.clear();
};
