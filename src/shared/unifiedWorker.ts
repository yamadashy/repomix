/**
 * Unified Worker Entry Point
 *
 * This module serves as a single entry point for all worker types in Repomix.
 * It enables full bundling support by allowing the bundled file to spawn workers
 * using itself (import.meta.url), eliminating path resolution issues.
 *
 * When running as a worker, it dynamically imports the appropriate worker handler
 * based on the workerType specified in workerData.
 */

import { isMainThread, workerData } from 'node:worker_threads';

// Detect if running as a Tinypool worker
// For worker_threads: isMainThread is false
// For child_process: process.__tinypool_state__.isTinypoolWorker is true
const isTinypoolWorker = (): boolean => {
  // Check for child_process runtime (Tinypool sets this before importing worker)
  const tinypoolState = (process as NodeJS.Process & { __tinypool_state__?: { isTinypoolWorker?: boolean } }).__tinypool_state__;
  if (tinypoolState?.isTinypoolWorker) {
    return true;
  }
  // Check for worker_threads runtime
  return !isMainThread;
};

// Worker type definitions
export type WorkerType =
  | 'fileCollect'
  | 'fileProcess'
  | 'securityCheck'
  | 'calculateMetrics'
  | 'defaultAction';

// Worker handler type - uses 'any' to accommodate different worker signatures
// biome-ignore lint/suspicious/noExplicitAny: Worker handlers have varying signatures
type WorkerHandler = (task: any) => Promise<any>;
type WorkerCleanup = () => void | Promise<void>;

// Store the loaded handler and cleanup function
let loadedHandler: WorkerHandler | null = null;
let loadedCleanup: WorkerCleanup | null = null;

/**
 * Dynamically load the appropriate worker handler based on workerType.
 * Uses dynamic imports to avoid loading all worker code when not needed.
 */
const loadWorkerHandler = async (workerType: WorkerType): Promise<{ handler: WorkerHandler; cleanup?: WorkerCleanup }> => {
  switch (workerType) {
    case 'fileCollect': {
      const module = await import('../core/file/workers/fileCollectWorker.js');
      return { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
    }
    case 'fileProcess': {
      const module = await import('../core/file/workers/fileProcessWorker.js');
      return { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
    }
    case 'securityCheck': {
      const module = await import('../core/security/workers/securityCheckWorker.js');
      return { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
    }
    case 'calculateMetrics': {
      const module = await import('../core/metrics/workers/calculateMetricsWorker.js');
      return { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
    }
    case 'defaultAction': {
      const module = await import('../cli/actions/workers/defaultActionWorker.js');
      return { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
    }
    default:
      throw new Error(`Unknown worker type: ${workerType}`);
  }
};

/**
 * Initialize the worker handler if running as a Tinypool worker.
 * This is called at module load time.
 */
const initializeWorker = async (): Promise<void> => {
  if (!isTinypoolWorker()) {
    return;
  }

  // Get workerType from multiple sources:
  // 1. worker_threads workerData (for worker_threads runtime)
  // 2. Environment variable (for child_process runtime)
  const workerType: WorkerType | undefined =
    (workerData as { workerType?: WorkerType } | undefined)?.workerType ??
    (process.env.REPOMIX_WORKER_TYPE as WorkerType | undefined);

  // Debug: Log worker initialization
  if (process.env.REPOMIX_DEBUG_WORKER) {
    console.error(
      `[UnifiedWorker] Initializing: workerType=${workerType}, ` +
        `env.REPOMIX_WORKER_TYPE=${process.env.REPOMIX_WORKER_TYPE}, ` +
        `workerData=${JSON.stringify(workerData)}, ` +
        `PID=${process.pid}`,
    );
  }

  if (!workerType) {
    throw new Error('Worker started without workerType (check workerData or REPOMIX_WORKER_TYPE env)');
  }

  const { handler, cleanup } = await loadWorkerHandler(workerType);
  loadedHandler = handler;
  loadedCleanup = cleanup ?? null;
};

// Initialize worker on module load (only in worker threads)
const initPromise = initializeWorker();

/**
 * Default export for Tinypool.
 * This function is called for each task and delegates to the loaded handler.
 */
export default async (task: unknown): Promise<unknown> => {
  // Ensure initialization is complete
  await initPromise;

  if (!loadedHandler) {
    throw new Error('Worker handler not initialized');
  }

  // Debug: Log task details in bundled environment
  if (process.env.REPOMIX_DEBUG_WORKER) {
    console.error('[UnifiedWorker] Task received:', JSON.stringify(task, null, 2));
  }

  return loadedHandler(task);
};

/**
 * Cleanup function for Tinypool teardown.
 * Delegates to the loaded worker's cleanup function.
 */
export const onWorkerTermination = async (): Promise<void> => {
  if (loadedCleanup) {
    await loadedCleanup();
  }
};

/**
 * Get the path to this unified worker module.
 * Used by processConcurrency.ts to spawn workers.
 *
 * In bundled environments, set REPOMIX_WORKER_PATH to the bundled file path.
 * The bundled file should contain all worker code, and when imported as a worker,
 * the isTinypoolWorker() check will trigger initialization.
 */
export const getUnifiedWorkerPath = (): string => {
  // Allow override for bundled environments
  if (process.env.REPOMIX_WORKER_PATH) {
    return process.env.REPOMIX_WORKER_PATH;
  }
  return new URL('./unifiedWorker.js', import.meta.url).href;
};
