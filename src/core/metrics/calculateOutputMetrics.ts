import { logger } from '../../shared/logger.js';
import { getTokenCounter } from './tokenCounterFactory.js';
import type { TokenEncoding } from './tokenEncoding.js';

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
): Promise<number> => {
  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    // Count tokens on main thread — gpt-tokenizer (pure JS) is fast enough that
    // worker thread overhead (pool init, structured clone serialization, message passing)
    // exceeds the computation cost.
    const counter = getTokenCounter(encoding);
    const result = counter.countTokens(content, path);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Output token count completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    logger.error('Error during token count:', error);
    throw error;
  }
};
