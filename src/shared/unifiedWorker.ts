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

import { workerData } from 'node:worker_threads';

// Worker type definitions
export type WorkerType = 'fileCollect' | 'fileProcess' | 'securityCheck' | 'calculateMetrics' | 'defaultAction';

// Worker handler type - uses 'any' to accommodate different worker signatures
// biome-ignore lint/suspicious/noExplicitAny: Worker handlers have varying signatures
type WorkerHandler = (task: any) => Promise<any>;
type WorkerCleanup = () => void | Promise<void>;

// Cache loaded handlers by worker type
const handlerCache = new Map<WorkerType, { handler: WorkerHandler; cleanup?: WorkerCleanup }>();

/**
 * Dynamically load the appropriate worker handler based on workerType.
 * Uses dynamic imports to avoid loading all worker code when not needed.
 * Results are cached for reuse.
 */
const loadWorkerHandler = async (
  workerType: WorkerType,
): Promise<{ handler: WorkerHandler; cleanup?: WorkerCleanup }> => {
  // Check cache first
  const cached = handlerCache.get(workerType);
  if (cached) {
    return cached;
  }

  let result: { handler: WorkerHandler; cleanup?: WorkerCleanup };

  switch (workerType) {
    case 'fileCollect': {
      const module = await import('../core/file/workers/fileCollectWorker.js');
      result = { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
      break;
    }
    case 'fileProcess': {
      const module = await import('../core/file/workers/fileProcessWorker.js');
      result = { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
      break;
    }
    case 'securityCheck': {
      const module = await import('../core/security/workers/securityCheckWorker.js');
      result = { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
      break;
    }
    case 'calculateMetrics': {
      const module = await import('../core/metrics/workers/calculateMetricsWorker.js');
      result = { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
      break;
    }
    case 'defaultAction': {
      const module = await import('../cli/actions/workers/defaultActionWorker.js');
      result = { handler: module.default as WorkerHandler, cleanup: module.onWorkerTermination };
      break;
    }
    default:
      throw new Error(`Unknown worker type: ${workerType}`);
  }

  // Cache the result
  handlerCache.set(workerType, result);
  return result;
};

/**
 * Infer worker type from task structure.
 * This is used in bundled environments where Tinypool may reuse child processes
 * across different worker pools.
 */
const inferWorkerTypeFromTask = (task: unknown): WorkerType | null => {
  if (!task || typeof task !== 'object') {
    return null;
  }

  const taskObj = task as Record<string, unknown>;

  // defaultAction: has directories, cwd, config, cliOptions
  if ('directories' in taskObj && 'cwd' in taskObj && 'config' in taskObj) {
    return 'defaultAction';
  }

  // defaultAction ping task
  if ('ping' in taskObj) {
    return 'defaultAction';
  }

  // fileCollect: has filePath, rootDir, maxFileSize
  if ('filePath' in taskObj && 'rootDir' in taskObj && 'maxFileSize' in taskObj) {
    return 'fileCollect';
  }

  // fileProcess: has rawFile (nested object) and config
  if ('rawFile' in taskObj && 'config' in taskObj) {
    return 'fileProcess';
  }

  // calculateMetrics: has content, encoding (must check before securityCheck)
  if ('content' in taskObj && 'encoding' in taskObj) {
    return 'calculateMetrics';
  }

  // securityCheck: has filePath, content, type
  if ('filePath' in taskObj && 'content' in taskObj && 'type' in taskObj) {
    return 'securityCheck';
  }

  return null;
};

/**
 * Get workerType from workerData.
 * In Tinypool child_process mode, workerData is an array.
 */
const getWorkerTypeFromWorkerData = (): WorkerType | undefined => {
  if (!workerData) {
    return undefined;
  }

  // Handle array format (Tinypool child_process mode)
  if (Array.isArray(workerData)) {
    for (const item of workerData) {
      if (item && typeof item === 'object' && 'workerType' in item) {
        return item.workerType as WorkerType;
      }
    }
    return undefined;
  }

  // Handle object format (worker_threads mode)
  if (typeof workerData === 'object' && 'workerType' in workerData) {
    return (workerData as { workerType?: WorkerType }).workerType;
  }

  return undefined;
};

/**
 * Default export for Tinypool.
 * This function is called for each task and delegates to the appropriate handler.
 *
 * In bundled environments where Tinypool may reuse child processes across different
 * worker pools, we use task-based inference to determine the correct handler.
 */
export default async (task: unknown): Promise<unknown> => {
  // Determine worker type: try workerData/env first, then infer from task
  let workerType: WorkerType | undefined =
    getWorkerTypeFromWorkerData() ?? (process.env.REPOMIX_WORKER_TYPE as WorkerType | undefined);

  // In bundled environments, Tinypool may reuse child processes.
  // If the task doesn't match the initially configured worker type, infer from task.
  const inferredType = inferWorkerTypeFromTask(task);

  // Use inferred type if available (more reliable in bundled env)
  if (inferredType) {
    workerType = inferredType;
  }

  if (!workerType) {
    throw new Error('Cannot determine worker type from workerData, env, or task structure');
  }

  // Load handler (cached)
  const { handler } = await loadWorkerHandler(workerType);
  return handler(task);
};

/**
 * Cleanup function for Tinypool teardown.
 * Cleans up all cached handlers.
 */
export const onWorkerTermination = async (): Promise<void> => {
  for (const { cleanup } of handlerCache.values()) {
    if (cleanup) {
      await cleanup();
    }
  }
  handlerCache.clear();
};
