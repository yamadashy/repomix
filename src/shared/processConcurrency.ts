import os from 'node:os';
import { Tinypool } from 'tinypool';
import { logger } from './logger.js';

// Worker initialization is expensive, so we prefer fewer threads unless there are many files
const TASKS_PER_THREAD = 100;

export const getProcessConcurrency = (): number => {
  return typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
};

export interface WorkerConfig {
  minThreads?: number;
  maxThreads?: number;
}

export const getWorkerThreadCount = (
  numOfTasks: number,
  workerConfig: WorkerConfig = {}
): { minThreads: number; maxThreads: number } => {
  const processConcurrency = getProcessConcurrency();

  const minThreads = workerConfig.minThreads ?? 1;

  // Limit max threads based on number of tasks
  const maxThreadsFromTasks = Math.max(minThreads, Math.min(processConcurrency, Math.ceil(numOfTasks / TASKS_PER_THREAD)));
  const maxThreads = workerConfig.maxThreads ?? maxThreadsFromTasks;

  return {
    minThreads,
    maxThreads: Math.max(minThreads, maxThreads), // Ensure maxThreads >= minThreads
  };
};

export const createWorkerPool = (numOfTasks: number, workerPath: string, workerConfig: WorkerConfig = {}): Tinypool => {
  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks, workerConfig);

  logger.trace(
    `Initializing worker pool with min=${minThreads}, max=${maxThreads} threads. Worker path: ${workerPath}`,
  );

  const startTime = process.hrtime.bigint();

  const pool = new Tinypool({
    filename: workerPath,
    // Use child_process for better memory management
    runtime: 'child_process',
    minThreads,
    maxThreads,
    idleTimeout: 5000,
    workerData: {
      logLevel: logger.getLogLevel(),
    },
  });

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds

  logger.debug(`Tinypool initialization took ${initTime.toFixed(2)}ms`);

  return pool;
};

export const cleanupWorkerPool = async (pool: Tinypool): Promise<void> => {
  try {
    logger.debug('Cleaning up worker pool...');

    // Check if running in Bun runtime
    const isBun = process.versions?.bun;

    if (isBun) {
      // If running in Bun, we cannot use Tinypool's destroy method
      logger.debug('Running in Bun environment, skipping Tinypool destroy method');
    } else {
      // Standard Node.js cleanup
      await pool.destroy();
    }

    logger.debug('Worker pool cleaned up successfully');
  } catch (error) {
    logger.debug('Error during worker pool cleanup:', error);
  }
};

export interface TaskRunner<T, R> {
  run: (task: T) => Promise<R>;
  cleanup: () => Promise<void>;
}

export const initTaskRunner = <T, R>(numOfTasks: number, workerPath: string, workerConfig?: WorkerConfig): TaskRunner<T, R> => {
  const pool = createWorkerPool(numOfTasks, workerPath, workerConfig);
  return {
    run: (task: T) => pool.run(task),
    cleanup: () => cleanupWorkerPool(pool),
  };
};
