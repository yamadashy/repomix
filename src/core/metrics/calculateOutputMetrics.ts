import { logger, repomixLogLevels } from '../../shared/logger.js';
import type { TokenCountEncoding, TokenCounter } from './TokenCounter.js';

export const calculateOutputMetrics = async (
  content: string,
  _encoding: TokenCountEncoding,
  path: string | undefined,
  deps: { tokenCounter: TokenCounter },
): Promise<number> => {
  const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;

  try {
    if (isTracing) {
      logger.trace(`Starting output token count for ${path || 'output'}`);
    }
    const startTime = isTracing ? process.hrtime.bigint() : 0n;

    // Count tokens directly on the main thread — gpt-tokenizer is pure JS,
    // so worker thread structured clone overhead far exceeds the computation cost.
    const result = deps.tokenCounter.countTokens(content, path);

    if (isTracing) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6;
      logger.trace(`Output token count completed in ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    logger.error('Error during token count:', error);
    throw error;
  }
};
