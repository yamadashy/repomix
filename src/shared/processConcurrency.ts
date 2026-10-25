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
  maxWorkerThreads?: number;
  // Aborting destroys the pool: queued and running tasks reject and the workers are
  // terminated, and run() refuses new tasks.
  signal?: AbortSignal;
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

// Every worker_threads worker pipes its stdout and stderr into the parent's, and each pipe
// adds an 'error' listener there. Node lifts the listener limit only for that one add, so
// with ~10+ live workers the next unrelated listener (e.g. the MCP stdio transport adding
// one per message it sends) triggers a spurious MaxListenersExceededWarning. A pool raises
// the limit by its worker count while alive, as Tinypool already does for child_process.
const PIPED_STREAMS = [process.stdout, process.stderr];
// Per pool, the streams whose limit was actually raised, so cleanup undoes only those.
const reservedListeners = new WeakMap<Tinypool, Map<NodeJS.WriteStream, number>>();

const raisePipedStreamMaxListeners = (amount: number): Map<NodeJS.WriteStream, number> => {
  const raised = new Map<NodeJS.WriteStream, number>();
  for (const stream of PIPED_STREAMS) {
    const current = stream.getMaxListeners();
    // 0 or Infinity means unlimited; leave it alone.
    if (current === 0 || current === Number.POSITIVE_INFINITY) continue;
    stream.setMaxListeners(current + amount);
    raised.set(stream, amount);
  }
  return raised;
};

export const createWorkerPool = (options: WorkerOptions): Tinypool => {
  const { numOfTasks, workerType, runtime = 'child_process', maxWorkerThreads } = options;
  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks, maxWorkerThreads);

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
        // Pass terminal width for spinner line-clearing accuracy in child processes
        COLUMNS: process.env.COLUMNS || process.stdout.columns?.toString() || '',
      },
    }),
  });

  if (runtime === 'worker_threads') {
    reservedListeners.set(pool, raisePipedStreamMaxListeners(maxThreads));
  }

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
  } finally {
    const raised = reservedListeners.get(pool);
    reservedListeners.delete(pool);
    for (const [stream, amount] of raised ?? []) {
      const current = stream.getMaxListeners();
      if (current === 0 || current === Number.POSITIVE_INFINITY) continue;
      stream.setMaxListeners(Math.max(1, current - amount));
    }
  }
};

export interface TaskRunner<T, R> {
  run: (task: T) => Promise<R>;
  cleanup: () => Promise<void>;
}

export const initTaskRunner = <T, R>(options: WorkerOptions): TaskRunner<T, R> => {
  const pool = createWorkerPool(options);
  const { signal } = options;
  // Shared so cleanup() after an abort waits for the teardown the abort started.
  let teardown: Promise<void> | undefined;
  const destroy = () => {
    teardown ??= cleanupWorkerPool(pool);
    return teardown;
  };
  // One listener per pool rather than Tinypool's per-task `signal` option, which would
  // add an abort listener for every queued task.
  const onAbort = () => {
    void destroy();
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  return {
    run: (task: T) => (signal?.aborted ? Promise.reject(signal.reason) : pool.run(task)),
    cleanup: async () => {
      signal?.removeEventListener('abort', onAbort);
      await destroy();
    },
  };
};
