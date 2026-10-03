import os from 'node:os';
import { Tinypool } from 'tinypool';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupWorkerPool,
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

    it('should initialize Tinypool with correct configuration', () => {
      const tinypool = createWorkerPool({ numOfTasks: 500, workerType: 'fileProcess', runtime: 'child_process' });

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

    it('should initialize Tinypool with worker_threads runtime when specified', () => {
      const tinypool = createWorkerPool({ numOfTasks: 500, workerType: 'securityCheck', runtime: 'worker_threads' });

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

    it('should return a TaskRunner with run and cleanup methods', () => {
      const taskRunner = initTaskRunner({ numOfTasks: 100, workerType: 'fileProcess', runtime: 'child_process' });

      expect(taskRunner).toHaveProperty('run');
      expect(taskRunner).toHaveProperty('cleanup');
      expect(typeof taskRunner.run).toBe('function');
      expect(typeof taskRunner.cleanup).toBe('function');
    });

    it('should pass runtime parameter to createWorkerPool', () => {
      const taskRunner = initTaskRunner({ numOfTasks: 100, workerType: 'calculateMetrics', runtime: 'worker_threads' });

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

    it('delegates run and cleanup to the underlying pool', async () => {
      const runMock = vi.fn().mockResolvedValue('result');
      const destroyMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(Tinypool).mockImplementation(function (this: unknown) {
        (this as Record<string, unknown>).run = runMock;
        (this as Record<string, unknown>).destroy = destroyMock;
        return this as Tinypool;
      });

      const taskRunner = initTaskRunner<{ payload: string }, string>({
        numOfTasks: 10,
        workerType: 'fileProcess',
        runtime: 'worker_threads',
      });

      await expect(taskRunner.run({ payload: 'x' })).resolves.toBe('result');
      expect(runMock).toHaveBeenCalledWith({ payload: 'x' });

      await taskRunner.cleanup();
      expect(destroyMock).toHaveBeenCalled();
    });

    it('runs INLINE under the kernel sandbox (REPOMIX_SANDBOXED) — never constructs a worker pool', async () => {
      // Under --sandbox-strict a fresh V8 worker isolate needs broad reads the mac/Windows
      // kernel sandboxes deny, so tasks run inline on the confined main thread. Assert the
      // gate selects the inline runner and no Tinypool is created.
      const prev = process.env.REPOMIX_SANDBOXED;
      process.env.REPOMIX_SANDBOXED = '1';
      vi.mocked(Tinypool).mockClear(); // before the call under test, or the assertion below is vacuous
      const taskRunner = initTaskRunner({ numOfTasks: 100, workerType: 'fileProcess', runtime: 'worker_threads' });
      try {
        expect(Tinypool).not.toHaveBeenCalled();
        expect(typeof taskRunner.run).toBe('function');
        expect(typeof taskRunner.cleanup).toBe('function');
      } finally {
        await taskRunner.cleanup(); // a no-op inline — called to prove it doesn't throw
        if (prev === undefined) {
          delete process.env.REPOMIX_SANDBOXED;
        } else {
          process.env.REPOMIX_SANDBOXED = prev;
        }
      }
    });
  });

  // Behavioral coverage of the sandboxed inline runner (createInlineTaskRunner):
  // task execution, cross-runner FIFO serialization on the shared queue, and the
  // module-stays-warm contract (cleanup never disposes — the worker module lives for
  // the process lifetime; see the rationale in processConcurrency.ts). Drives the
  // real runner with REPOMIX_WORKER_PATH pointing at a fixture module (getWorkerPath
  // honors it), so no internal seam is needed.
  describe('initTaskRunner inline runner (REPOMIX_SANDBOXED)', () => {
    const fixtureUrl = new URL('./fixtures/inlineWorkerFixture.ts', import.meta.url).href;
    let prevSandboxed: string | undefined;
    let prevWorkerPath: string | undefined;
    // biome-ignore lint/suspicious/noExplicitAny: fixture module shape is test-local
    let fixture: any;

    beforeEach(async () => {
      prevSandboxed = process.env.REPOMIX_SANDBOXED;
      prevWorkerPath = process.env.REPOMIX_WORKER_PATH;
      process.env.REPOMIX_SANDBOXED = '1';
      process.env.REPOMIX_WORKER_PATH = fixtureUrl;
      fixture = await import(fixtureUrl);
      fixture.reset();
    });

    const restore = (prev: string | undefined, key: string): void => {
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    };
    const restoreEnv = (): void => {
      restore(prevSandboxed, 'REPOMIX_SANDBOXED');
      restore(prevWorkerPath, 'REPOMIX_WORKER_PATH');
    };

    it('runs each task through the worker module default export', async () => {
      const runner = initTaskRunner<{ id: number }, string>({
        numOfTasks: 1,
        workerType: 'fileProcess',
        runtime: 'worker_threads',
      });
      try {
        await expect(runner.run({ id: 7 })).resolves.toBe('done:7');
        expect(fixture.calls).toEqual([{ id: 7 }]);
      } finally {
        await runner.cleanup();
        restoreEnv();
      }
    });

    it('serializes tasks across concurrent runners of the same type via the shared queue', async () => {
      const a = initTaskRunner<{ id: number }, string>({
        numOfTasks: 1,
        workerType: 'fileProcess',
        runtime: 'worker_threads',
      });
      const b = initTaskRunner<{ id: number }, string>({
        numOfTasks: 1,
        workerType: 'fileProcess',
        runtime: 'worker_threads',
      });
      try {
        // Issue interleaved across both runners; the shared queue must run them FIFO.
        await Promise.all([a.run({ id: 1 }), b.run({ id: 2 }), a.run({ id: 3 })]);
        expect(fixture.calls.map((t: { id: number }) => t.id)).toEqual([1, 2, 3]);
      } finally {
        await a.cleanup();
        await b.cleanup();
        restoreEnv();
      }
    });

    it('keeps the worker module warm across packs — cleanup never disposes it', async () => {
      // The no-dispose contract: a later pack (runner b, created after runner a already
      // cleaned up) reuses the same live module, and onWorkerTermination is never called.
      // This is what makes a dispose-under-a-concurrent-pack race impossible.
      const a = initTaskRunner({ numOfTasks: 1, workerType: 'fileProcess', runtime: 'worker_threads' });
      try {
        await a.run({ id: 1 } as never);
        await a.cleanup();
        const b = initTaskRunner({ numOfTasks: 1, workerType: 'fileProcess', runtime: 'worker_threads' });
        await expect(b.run({ id: 2 } as never)).resolves.toBe('done:2');
        await b.cleanup();
        expect(fixture.calls.map((t: { id: number }) => t.id)).toEqual([1, 2]); // same module instance served both packs
        expect(fixture.terminationCount()).toBe(0); // never disposed
      } finally {
        restoreEnv();
      }
    });
  });

  describe('cleanupWorkerPool', () => {
    it('calls destroy on standard Node runtime', async () => {
      const destroy = vi.fn().mockResolvedValue(undefined);
      const pool = { destroy } as unknown as Tinypool;

      await cleanupWorkerPool(pool);

      expect(destroy).toHaveBeenCalled();
    });

    it('skips destroy under Bun runtime', async () => {
      const destroy = vi.fn();
      const pool = { destroy } as unknown as Tinypool;
      // Bun exposes process.versions.bun. Stub it for this test.
      // Track whether the property originally existed so we can fully remove
      // it on restore — assigning back `undefined` would leave the key
      // defined-but-undefined and mutate process.versions for the rest of
      // the suite.
      const hadBun = Object.hasOwn(process.versions, 'bun');
      const original = process.versions.bun;
      Object.defineProperty(process.versions, 'bun', { value: '1.0.0', configurable: true });

      try {
        await cleanupWorkerPool(pool);
        expect(destroy).not.toHaveBeenCalled();
      } finally {
        if (hadBun) {
          Object.defineProperty(process.versions, 'bun', { value: original, configurable: true });
        } else {
          delete (process.versions as Record<string, unknown>).bun;
        }
      }
    });

    it('swallows destroy errors so shutdown never throws', async () => {
      const pool = {
        destroy: vi.fn().mockRejectedValue(new Error('teardown failed')),
      } as unknown as Tinypool;

      await expect(cleanupWorkerPool(pool)).resolves.toBeUndefined();
    });
  });
});
