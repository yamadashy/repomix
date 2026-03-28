import { logger } from '../../shared/logger.js';
import type { TokenEncoding } from './TokenCounter.js';
import { getTokenCounter } from './tokenCounterFactory.js';

const defaultDeps = {
  getTokenCounter,
};

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: Partial<typeof defaultDeps> = {},
): Promise<number> => {
  const resolvedDeps = { ...defaultDeps, ...deps };

  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    const counter = await resolvedDeps.getTokenCounter(encoding);
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
