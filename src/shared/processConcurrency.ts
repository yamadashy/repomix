import os from 'node:os';
import { type Options, Tinypool } from 'tinypool';
import { logger } from './logger.js';
import { isSandboxedProcess } from './sandboxEnv.js';
import type { WorkerType } from './unifiedWorker.js';

export type WorkerRuntime = NonNullable<Options['runtime']>;

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

// Under the kernel sandbox (REPOMIX_SANDBOXED=1, set by the sandboxed MCP server),
// run worker tasks INLINE on the main thread instead of spawning worker threads.
// A fresh V8 worker isolate needs broad filesystem reads at init that the macOS
// (Seatbelt) and Windows (AppContainer) kernel sandboxes deny — so pack_codebase's
// workers would fail there. The main thread is already booted and confined, and
// processes the same tasks correctly (just without cross-file parallelism, which
// is an acceptable trade for a single confined workspace).
const shouldRunInline = (): boolean => isSandboxedProcess();

// Per-worker-type inline state: one shared FIFO queue + one warm module, kept for
// the life of the process. All inline runners of a type share the module's
// process-global singletons (notably the web-tree-sitter parser), and packs can run
// concurrently — tasks must serialize through the shared queue or they'd corrupt it.
// cleanup() is deliberately a no-op: every onWorkerTermination only frees bounded,
// enum-keyed memory (grammars ≈23MB ceiling; per-file parse trees are freed per
// parse; token free() and the security hook are no-ops), so warm modules are safe,
// faster on repeat packs, and make a dispose-during-a-concurrent-pack race
// impossible — proven leak-free by e2e/mcp-sandbox/leakProof.test.ts. Revisit if a
// worker ever gains a correctness-critical teardown.
interface InlineWorkerState {
  queue: Promise<unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: the worker module's dynamic shape
  modPromise?: Promise<any>;
}
const inlineWorkers = new Map<WorkerType, InlineWorkerState>();

const createInlineTaskRunner = <T, R>(workerType: WorkerType): TaskRunner<T, R> => {
  const moduleUrl = getWorkerPath(workerType);
  let state = inlineWorkers.get(workerType);
  if (!state) {
    state = { queue: Promise.resolve() };
    inlineWorkers.set(workerType, state);
  }
  const shared = state;
  return {
    run: (task: T): Promise<R> => {
      const result = shared.queue.then(async (): Promise<R> => {
        if (!shared.modPromise) shared.modPromise = import(moduleUrl);
        const mod = await shared.modPromise;
        return mod.default(task);
      });
      // Keep the chain alive whether this task resolves or rejects.
      shared.queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    // No-op by design — the module stays warm for the process lifetime (see above).
    cleanup: async (): Promise<void> => {},
  };
};

export const initTaskRunner = <T, R>(options: WorkerOptions): TaskRunner<T, R> => {
  if (shouldRunInline()) {
    logger.debug(`Running ${options.workerType} tasks inline (sandboxed — no worker threads)`);
    return createInlineTaskRunner<T, R>(options.workerType);
  }
  const pool = createWorkerPool(options);
  return {
    run: (task: T) => pool.run(task),
    cleanup: () => cleanupWorkerPool(pool),
  };
};
