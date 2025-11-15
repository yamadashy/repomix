import os from 'node:os';
import { Tinypool } from 'tinypool';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkerPool,
  getProcessConcurrency,
  getWorkerThreadCount,
  initTaskRunner,
} from '../../src/shared/processConcurrency.js';

vi.mock('node:os');
vi.mock('tinypool');

describe('processConcurrency', () => {
  describe('getProcessConcurrency', () => {
    it('should use os.availableParallelism when available', () => {
      const mockAvailableParallelism = vi.fn().mockReturnValue(4);
      vi.mocked(os).availableParallelism = mockAvailableParallelism;

      const result = getProcessConcurrency();

      expect(result).toBe(4);
      expect(mockAvailableParallelism).toHaveBeenCalled();
    });
  });

  describe('getWorkerThreadCount', () => {
    beforeEach(() => {
      vi.mocked(os).availableParallelism = vi.fn().mockReturnValue(8);
    });

    it('should return minimum 1 thread', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(1);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(1);
    });

    it('should limit max threads based on number of tasks', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(1000);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(8); // Limited by CPU count: Math.min(8, 1000/100) = 8
    });

    it('should scale max threads based on task count', () => {
      const { maxThreads: maxThreads1 } = getWorkerThreadCount(200);
      const { maxThreads: maxThreads2 } = getWorkerThreadCount(400);

      expect(maxThreads2).toBeGreaterThan(maxThreads1);
    });

    it('should handle large numbers of tasks', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(10000);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(8); // Limited by CPU count: Math.min(8, 10000/100) = 8
    });

    it('should handle zero tasks', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(0);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(1);
    });
  });

  describe('initWorker', () => {
    beforeEach(() => {
      vi.mocked(os).availableParallelism = vi.fn().mockReturnValue(4);
      // biome-ignore lint/complexity/useArrowFunction: Vitest v4 requires function constructors
      vi.mocked(Tinypool).mockImplementation(function () {
        return {} as Tinypool;
      });
    });

    it('should initialize Tinypool with correct configuration', () => {
      const workerPath = '/path/to/worker.js';
      const tinypool = createWorkerPool({ numOfTasks: 500, workerPath, runtime: 'child_process' });

      expect(Tinypool).toHaveBeenCalledWith({
        filename: workerPath,
        runtime: 'child_process',
        minThreads: 1,
        maxThreads: 4, // Math.min(4, 500/100) = 4
        idleTimeout: 5000,
        teardown: 'onWorkerTermination',
        workerData: {
          logLevel: 2,
        },
        env: expect.objectContaining({
          REPOMIX_LOG_LEVEL: '2',
          FORCE_COLOR: expect.any(String),
          TERM: expect.any(String),
        }),
      });
      expect(tinypool).toBeDefined();
    });

    it('should initialize Tinypool with worker_threads runtime when specified', () => {
      const workerPath = '/path/to/worker.js';
      const tinypool = createWorkerPool({ numOfTasks: 500, workerPath, runtime: 'worker_threads' });

      expect(Tinypool).toHaveBeenCalledWith({
        filename: workerPath,
        runtime: 'worker_threads',
        minThreads: 1,
        maxThreads: 4, // Math.min(4, 500/100) = 4
        idleTimeout: 5000,
        teardown: 'onWorkerTermination',
        workerData: {
          logLevel: 2,
        },
      });
      expect(tinypool).toBeDefined();
    });
  });

  describe('initTaskRunner', () => {
    beforeEach(() => {
      vi.mocked(os).availableParallelism = vi.fn().mockReturnValue(4);
      // biome-ignore lint/complexity/useArrowFunction: Vitest v4 requires function constructors
      vi.mocked(Tinypool).mockImplementation(function () {
        return {
          run: vi.fn(),
          destroy: vi.fn(),
        } as unknown as Tinypool;
      });
    });

    it('should return a TaskRunner with run and cleanup methods', () => {
      const workerPath = '/path/to/worker.js';
      const taskRunner = initTaskRunner({ numOfTasks: 100, workerPath, runtime: 'child_process' });

      expect(taskRunner).toHaveProperty('run');
      expect(taskRunner).toHaveProperty('cleanup');
      expect(typeof taskRunner.run).toBe('function');
      expect(typeof taskRunner.cleanup).toBe('function');
    });

    it('should pass runtime parameter to createWorkerPool', () => {
      const workerPath = '/path/to/worker.js';
      const taskRunner = initTaskRunner({ numOfTasks: 100, workerPath, runtime: 'worker_threads' });

      expect(Tinypool).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: 'worker_threads',
        }),
      );
      expect(taskRunner).toHaveProperty('run');
      expect(taskRunner).toHaveProperty('cleanup');
    });
  });
});
