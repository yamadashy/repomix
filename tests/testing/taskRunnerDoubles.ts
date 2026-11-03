import { vi } from 'vitest';
import type { createMetricsTaskRunner } from '../../src/core/metrics/calculateMetrics.js';
import type { MetricsTaskRunner } from '../../src/core/metrics/metricsWorkerRunner.js';
import { countTokens } from '../../src/core/metrics/workers/calculateMetricsWorker.js';
import type { initTaskRunner, TaskRunner, WorkerOptions } from '../../src/shared/processConcurrency.js';

/**
 * An `initTaskRunner` stand-in that runs every task in-process through `handler` (usually the
 * worker module's entry point), so tests exercise the real worker logic without spawning threads.
 * `initTaskRunner` is generic over the task and result types, so the bridge to `handler` is cast.
 */
export const inlineInitTaskRunner =
  <Task, Result>(handler: (task: Task) => Promise<Result>): typeof initTaskRunner =>
  <T, R>(_options: WorkerOptions): TaskRunner<T, R> => ({
    run: async (task: T) => (await handler(task as unknown as Task)) as unknown as R,
    cleanup: async () => {},
  });

/**
 * A metrics `TaskRunner` that counts tokens in-process with the real worker logic, for single
 * (`TokenCountTask`) and batched (`TokenCountBatchTask`) tasks alike.
 */
export const createInlineMetricsTaskRunner = (): MetricsTaskRunner => ({
  run: async (task) => {
    if ('items' in task) {
      return Promise.all(
        task.items.map((item) => countTokens({ content: item.content, encoding: task.encoding, path: item.path })),
      );
    }
    return countTokens(task);
  },
  cleanup: async () => {},
});

/**
 * A `createMetricsTaskRunner` stand-in for `pack()`. Its runner resolves every task to 0, and the
 * returned `taskRunner` spies let tests assert that the pipeline cleaned the worker pool up.
 */
export const createMetricsTaskRunnerDouble = ({
  warmupPromise = Promise.resolve(),
}: {
  warmupPromise?: Promise<unknown>;
} = {}) => {
  const taskRunner = {
    run: vi.fn<MetricsTaskRunner['run']>(async () => 0),
    cleanup: vi.fn<MetricsTaskRunner['cleanup']>(async () => {}),
  };
  const create = vi.fn<typeof createMetricsTaskRunner>(() => ({ taskRunner, warmupPromise }));
  return { createMetricsTaskRunner: create, taskRunner };
};
