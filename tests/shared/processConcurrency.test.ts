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

// Use vi.hoisted for class mock that needs to work as constructor
const { MockTinypool } = vi.hoisted(() => {
  // Create a mock function wrapped class for spy functionality
  const MockTinypool = vi.fn().mockImplementation(function (this: unknown) {
    (this as Record<string, unknown>).run = vi.fn();
    (this as Record<string, unknown>).destroy = vi.fn();
    return this;
  });
  return { MockTinypool };
});

vi.mock('tinypool', () => ({
  Tinypool: MockTinypool,
}));

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

    it('should cap max threads when maxWorkerThreads is provided', () => {
      // CPU has 8 cores, 1000 tasks would normally give 8 threads
      const { maxThreads } = getWorkerThreadCount(1000, 3);

      expect(maxThreads).toBe(3);
    });

    it('should not exceed task-based limit even with higher maxWorkerThreads', () => {
      // 200 tasks → ceil(200/100) = 2 threads, maxWorkerThreads=6 should not increase it
      const { maxThreads } = getWorkerThreadCount(200, 6);

      expect(maxThreads).toBe(2);
    });

    it('should ignore maxWorkerThreads when undefined', () => {
      const { maxThreads } = getWorkerThreadCount(1000, undefined);

      expect(maxThreads).toBe(8);
    });
  });

  describe('initWorker', () => {
    beforeEach(() => {
      vi.mocked(os).availableParallelism = vi.fn().mockReturnValue(4);
      // Use regular function syntax for constructor mock
      vi.mocked(Tinypool).mockImplementation(function (this: unknown) {
        (this as Record<string, unknown>).run = vi.fn();
        (this as Record<string, unknown>).destroy = vi.fn();
        return this as Tinypool;
      });
    });

    it('should initialize Tinypool with correct configuration', async () => {
      const tinypool = await createWorkerPool({ numOfTasks: 500, workerType: 'fileProcess', runtime: 'child_process' });

      expect(Tinypool).toHaveBeenCalledWith({
        filename: expect.stringContaining('fileProcessWorker.js'),
        runtime: 'child_process',
        minThreads: 1,
        maxThreads: 4, // Math.min(4, 500/100) = 4
        idleTimeout: 5000,
        teardown: 'onWorkerTermination',
        workerData: {
          workerType: 'fileProcess',
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

    it('should initialize Tinypool with worker_threads runtime when specified', async () => {
      const tinypool = await createWorkerPool({
        numOfTasks: 500,
        workerType: 'securityCheck',
        runtime: 'worker_threads',
      });

      expect(Tinypool).toHaveBeenCalledWith({
        filename: expect.stringContaining('securityCheckWorker.js'),
        runtime: 'worker_threads',
        minThreads: 1,
        maxThreads: 4, // Math.min(4, 500/100) = 4
        idleTimeout: 5000,
        teardown: 'onWorkerTermination',
        workerData: {
          workerType: 'securityCheck',
          logLevel: 2,
        },
      });
      expect(tinypool).toBeDefined();
    });
  });

  describe('initTaskRunner', () => {
    beforeEach(() => {
      vi.mocked(os).availableParallelism = vi.fn().mockReturnValue(4);
      // Use regular function syntax for constructor mock
      vi.mocked(Tinypool).mockImplementation(function (this: unknown) {
        (this as Record<string, unknown>).run = vi.fn();
        (this as Record<string, unknown>).destroy = vi.fn();
        return this as Tinypool;
      });
    });

    it('should return a TaskRunner with run and cleanup methods', async () => {
      const taskRunner = await initTaskRunner({ numOfTasks: 100, workerType: 'fileProcess', runtime: 'child_process' });

      expect(taskRunner).toHaveProperty('run');
      expect(taskRunner).toHaveProperty('cleanup');
      expect(typeof taskRunner.run).toBe('function');
      expect(typeof taskRunner.cleanup).toBe('function');
    });

    it('should pass runtime parameter to createWorkerPool', async () => {
      const taskRunner = await initTaskRunner({
        numOfTasks: 100,
        workerType: 'calculateMetrics',
        runtime: 'worker_threads',
      });

      expect(Tinypool).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: 'worker_threads',
          workerData: expect.objectContaining({
            workerType: 'calculateMetrics',
          }),
        }),
      );
      expect(taskRunner).toHaveProperty('run');
      expect(taskRunner).toHaveProperty('cleanup');
    });
  });
});
