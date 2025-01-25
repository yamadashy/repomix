import os from 'node:os';
import { Piscina } from 'piscina';
import { logger } from './logger.js';

export const getProcessConcurrency = (): number => {
  return typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
};

export const getWorkerThreadCount = (numOfTasks: number): { minThreads: number; maxThreads: number } => {
  const processConcurrency = getProcessConcurrency();

  const minThreads = 1;

  // Limit max threads based on number of tasks
  const maxThreads = Math.max(minThreads, Math.min(processConcurrency, Math.ceil(numOfTasks / 100)));

  return {
    minThreads,
    maxThreads,
  };
};

export const initPiscina = (numOfTasks: number, workerPath: string): Piscina => {
  const { minThreads, maxThreads } = getWorkerThreadCount(numOfTasks);

  logger.trace(
    `Initializing worker pool with min=${minThreads}, max=${maxThreads} threads. Worker path: ${workerPath}`,
  );

  return new Piscina({
    filename: workerPath,
    minThreads,
    maxThreads,
    idleTimeout: 5000,
  });
};
