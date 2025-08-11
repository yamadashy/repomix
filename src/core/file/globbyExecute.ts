import type { Options } from 'globby';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import type { GlobbyTask } from './workers/globbyWorker.js';

/**
 * Execute globby in worker to isolate memory usage
 */
export const executeGlobbyInWorker = async (
  patterns: string[],
  options: Options,
  deps = {
    initTaskRunner,
  },
): Promise<string[]> => {
  const taskRunner = deps.initTaskRunner<GlobbyTask, string[]>(
    1,
    new URL('./workers/globbyWorker.js', import.meta.url).href,
    'worker_threads',
  );

  try {
    logger.trace('Starting globby in worker for memory isolation');
    const startTime = process.hrtime.bigint();

    const result = await taskRunner.run({
      patterns,
      options,
    });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Globby completed in worker in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    logger.error('Error during globby execution:', error);
    throw error;
  } finally {
    // Always cleanup worker pool
    await taskRunner.cleanup();
  }
};
