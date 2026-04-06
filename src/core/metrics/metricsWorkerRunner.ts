import type { TaskRunner } from '../../shared/processConcurrency.js';
import type {
  MetricsWorkerResult,
  MetricsWorkerTask,
  TokenCountBatchTask,
  TokenCountTask,
} from './workers/calculateMetricsWorker.js';

export type MetricsTaskRunner = TaskRunner<MetricsWorkerTask, MetricsWorkerResult>;

export const runTokenCount = (taskRunner: MetricsTaskRunner, task: TokenCountTask): Promise<number> => {
  return taskRunner.run(task) as Promise<number>;
};

export const runBatchTokenCount = (taskRunner: MetricsTaskRunner, task: TokenCountBatchTask): Promise<number[]> => {
  return taskRunner.run(task) as Promise<number[]>;
};
