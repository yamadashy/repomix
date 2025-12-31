import os from 'node:os';
import { type Options, Tinypool } from 'tinypool';
import { logger } from './logger.js';
import type { WorkerType } from './unifiedWorker.js';

export type WorkerRuntime = NonNullable<Options['runtime']>;

// Re-export WorkerType for external consumers
export type { WorkerType } from './unifiedWorker.js';

export interface WorkerOptions {
  numOfTasks: number;
  workerType: WorkerType;
  runtime: WorkerRuntime;
}

/**
 * Get the worker file path for a given worker type.
 * In bundled environments (REPOMIX_WORKER_PATH set), uses the unified worker.
 * Otherwise, uses individual worker files.
 */
const getWorkerPath = (workerType: WorkerType): string => {
  // Bundled environment: use unified worker path
  if (process.env.REPOMIX_WORKER_PATH) {
    return process.env.REPOMIX_WORKER_PATH;
  }

  // Non-bundled environment: use individual worker files
  switch (workerType) {
    case 'fileCollect':
      return new URL('../core/file/workers/fileCollectWorker.js', import.meta.url).href;
    case 'fileProcess':
      return new URL('../core/file/workers/fileProcessWorker.js', import.meta.url).href;
    case 'securityCheck':
      return new URL('../core/security/workers/securityCheckWorker.js', import.meta.url).href;
    case 'calculateMetrics':
      return new URL('../core/metrics/workers/calculateMetricsWorker.js', import.meta.url).href;
    case 'defaultAction':
      return new URL('../cli/actions/workers/defaultActionWorker.js', import.meta.url).href;
    default:
      throw new Error(`Unknown worker type: ${workerType}`);
  }
};

// Worker initialization is expensive, so we prefer fewer threads unless there are many files
const TASKS_PER_THREAD = 100;

export const getProcessConcurrency = (): number => {
  return typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
};

export const getWorkerThreadCount = (numOfTasks: number): { minThreads: number; maxThreads: number } => {
  const processConcurrency = getProcessConcurrency();

  const minThreads = 1;

  // Limit max threads based on number of tasks
  const maxThreads = Math.max(minThreads, Math.min(processConcurrency, Math.ceil(numOfTasks / TASKS_PER_THREAD)));

  return {
    minThreads,
    maxThreads,
  };
};

export const createWorkerPool = (options: WorkerOptions): Tinypool => {
  const { numOfTasks, workerType, runtime = 'child_process' } = options;
  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks);

  // Get worker path - uses unified worker in bundled env, individual files otherwise
  const workerPath = getWorkerPath(workerType);

  logger.trace(
    `Initializing worker pool with min=${minThreads}, max=${maxThreads} threads, runtime=${runtime}. Worker type: ${workerType}`,
  );

  const startTime = process.hrtime.bigint();

  const pool = new Tinypool({
    filename: workerPath,
    runtime,
    minThreads,
    maxThreads,
    idleTimeout: 5000,
    teardown: 'onWorkerTermination',
    workerData: {
      workerType,
      logLevel: logger.getLogLevel(),
    },
    // Only add env for child_process workers
    ...(runtime === 'child_process' && {
      env: {
        ...process.env,
        // Pass worker type as environment variable for child_process workers
        // This is needed because workerData is not directly accessible in child_process runtime
        REPOMIX_WORKER_TYPE: workerType,
        // Pass log level as environment variable for child_process workers
        REPOMIX_LOG_LEVEL: logger.getLogLevel().toString(),
        // Ensure color support in child_process workers
        FORCE_COLOR: process.env.FORCE_COLOR || (process.stdout.isTTY ? '1' : '0'),
        // Pass terminal capabilities
        TERM: process.env.TERM || 'xterm-256color',
      },
    }),
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

export const initTaskRunner = <T, R>(options: WorkerOptions): TaskRunner<T, R> => {
  const pool = createWorkerPool(options);
  return {
    run: (task: T) => pool.run(task),
    cleanup: () => cleanupWorkerPool(pool),
  };
};
