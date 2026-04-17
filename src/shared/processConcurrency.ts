import os from 'node:os';
import type { Options, Tinypool } from 'tinypool';
import { logger } from './logger.js';
import type { WorkerType } from './unifiedWorker.js';

export type WorkerRuntime = NonNullable<Options['runtime']>;

let _tinypoolModule: Promise<typeof import('tinypool')> | null = null;
const loadTinypool = (): Promise<typeof import('tinypool')> => {
  _tinypoolModule ??= import('tinypool');
  return _tinypoolModule;
};

// Re-export WorkerType for external consumers
export type { WorkerType } from './unifiedWorker.js';

export interface WorkerOptions {
  numOfTasks: number;
  workerType: WorkerType;
  runtime: WorkerRuntime;
  maxWorkerThreads?: number;
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
    case 'fileProcess':
      return new URL('../core/file/workers/fileProcessWorker.js', import.meta.url).href;
    case 'securityCheck':
      return new URL('../core/security/workers/securityCheckWorker.js', import.meta.url).href;
    case 'calculateMetrics':
      return new URL('../core/metrics/workers/calculateMetricsWorker.js', import.meta.url).href;
    default:
      throw new Error(`Unknown worker type: ${workerType}`);
  }
};

// Worker initialization is expensive, so we prefer fewer threads unless there are many files
const TASKS_PER_THREAD = 100;

export const getProcessConcurrency = (): number => {
  return typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
};

export const getWorkerThreadCount = (
  numOfTasks: number,
  maxWorkerThreads?: number,
): { minThreads: number; maxThreads: number } => {
  const processConcurrency = getProcessConcurrency();

  const minThreads = 1;

  // Apply optional cap to limit thread count (e.g., to reduce contention with other concurrent pools)
  const effectiveConcurrency =
    maxWorkerThreads != null ? Math.min(processConcurrency, maxWorkerThreads) : processConcurrency;

  // Limit max threads based on number of tasks
  const maxThreads = Math.max(minThreads, Math.min(effectiveConcurrency, Math.ceil(numOfTasks / TASKS_PER_THREAD)));

  return {
    minThreads,
    maxThreads,
  };
};

export const createWorkerPool = async (options: WorkerOptions): Promise<Tinypool> => {
  const { numOfTasks, workerType, runtime = 'child_process', maxWorkerThreads } = options;
  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks, maxWorkerThreads);

  // Get worker path - uses unified worker in bundled env, individual files otherwise
  const workerPath = getWorkerPath(workerType);

  logger.trace(
    `Initializing worker pool with min=${minThreads}, max=${maxThreads} threads, runtime=${runtime}. Worker type: ${workerType}`,
  );

  const startTime = process.hrtime.bigint();

  const { Tinypool } = await loadTinypool();
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
        // Pass terminal width for spinner line-clearing accuracy in child processes
        COLUMNS: process.env.COLUMNS || process.stdout.columns?.toString() || '',
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
      // Non-blocking cleanup: unref worker threads so they don't prevent
      // process exit, then initiate destruction without awaiting. This
      // saves ~70-80ms per pool that was previously spent synchronously
      // waiting for each thread to acknowledge SIGTERM. The CLI calls
      // process.exit() after all work completes, so the pending destroy
      // is cleaned up on exit. For long-lived processes (MCP server),
      // Tinypool's idleTimeout handles worker recycling independently.
      for (const thread of pool.threads) {
        if (thread && typeof thread.unref === 'function') {
          thread.unref();
        }
      }
      pool.destroy().catch((error) => {
        logger.debug('Error during worker pool destroy:', error);
      });
    }

    logger.debug('Worker pool cleanup initiated');
  } catch (error) {
    logger.debug('Error during worker pool cleanup:', error);
  }
};

export interface TaskRunner<T, R> {
  run: (task: T) => Promise<R>;
  cleanup: () => Promise<void>;
}

export const initTaskRunner = async <T, R>(options: WorkerOptions): Promise<TaskRunner<T, R>> => {
  const pool = await createWorkerPool(options);
  return {
    run: (task: T) => pool.run(task),
    cleanup: () => cleanupWorkerPool(pool),
  };
};
