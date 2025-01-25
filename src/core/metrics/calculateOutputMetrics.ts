import type { TiktokenEncoding } from 'tiktoken';
import { logger } from '../../shared/logger.js';
import { initPiscina } from '../../shared/processConcurrency.js';
import type { OutputMetricsTask } from './workers/outputMetricsWorker.js';

const initTaskRunner = () => {
  const pool = initPiscina(1, new URL('./workers/outputMetricsWorker.js', import.meta.url).href);
  return (task: OutputMetricsTask) => pool.run(task);
};

export const calculateOutputMetrics = async (
  content: string,
  encoding: TiktokenEncoding,
  path?: string,
  deps = {
    initTaskRunner,
  },
): Promise<number> => {
  const runTask = deps.initTaskRunner();

  try {
    logger.trace(`Starting output token count for ${path}`);
    const startTime = process.hrtime.bigint();

    const result = await runTask({ content, encoding, path });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Output token count completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    logger.error('Error during token count:', error);
    throw error;
  }
};
