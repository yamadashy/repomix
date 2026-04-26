import { beforeEach, describe, expect, it, vi } from 'vitest';

// We need to test the internal functions, so we'll test through the module behavior
// Mock all worker modules
vi.mock('../../src/core/file/workers/fileProcessWorker.js', () => ({
  default: vi.fn().mockResolvedValue({ processed: true }),
  onWorkerTermination: vi.fn(),
}));
vi.mock('../../src/core/security/workers/securityCheckWorker.js', () => ({
  default: vi.fn().mockResolvedValue(null),
  onWorkerTermination: vi.fn(),
}));
vi.mock('../../src/core/metrics/workers/calculateMetricsWorker.js', () => ({
  default: vi.fn().mockResolvedValue(100),
  onWorkerTermination: vi.fn(),
}));
// Mock worker_threads
vi.mock('node:worker_threads', () => ({
  workerData: undefined,
}));

describe('unifiedWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to clear handler cache
    vi.resetModules();
  });

  describe('inferWorkerTypeFromTask', () => {
    it('should infer fileProcess from task with rawFile and config', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        rawFile: { path: 'test.ts', content: 'code' },
        config: {},
      };

      await handler(task);

      const fileProcessWorker = await import('../../src/core/file/workers/fileProcessWorker.js');
      expect(fileProcessWorker.default).toHaveBeenCalledWith(task);
    });

    it('should infer calculateMetrics from task with content and encoding', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        content: 'test content',
        encoding: 'cl100k_base',
      };

      await handler(task);

      const calculateMetricsWorker = await import('../../src/core/metrics/workers/calculateMetricsWorker.js');
      expect(calculateMetricsWorker.default).toHaveBeenCalledWith(task);
    });

    it('should infer securityCheck from task with items (without encoding)', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        items: [{ filePath: 'test.ts', content: 'test content', type: 'file' }],
      };

      await handler(task);

      const securityCheckWorker = await import('../../src/core/security/workers/securityCheckWorker.js');
      expect(securityCheckWorker.default).toHaveBeenCalledWith(task);
    });

    it('should throw error for unrecognizable task structure', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = { unknownField: 'value' };

      await expect(handler(task)).rejects.toThrow('Cannot determine worker type');
    });

    it('should throw error for null task', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');

      await expect(handler(null)).rejects.toThrow('Cannot determine worker type');
    });

    it('should throw error for non-object task', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');

      await expect(handler('string')).rejects.toThrow('Cannot determine worker type');
    });
  });

  describe('repeated calls', () => {
    it('routes every call through the worker handler without throwing', async () => {
      // Note: this is a smoke test for repeated invocations, not a cache verifier.
      // Whether handlerCache short-circuits in loadWorkerHandler can't be observed
      // from outside — both paths still call Map.set(workerType, ...) once per type,
      // and Node's own module cache makes the dynamic import effectively free on
      // repeat. Verifying the cache behavior would require either exposing the
      // cache or measuring import timing, neither of which is worth it for a
      // micro-optimization.
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const fileProcessWorker = await import('../../src/core/file/workers/fileProcessWorker.js');

      await handler({ rawFile: { path: 'a.ts', content: '' }, config: {} });
      await handler({ rawFile: { path: 'b.ts', content: '' }, config: {} });

      expect(fileProcessWorker.default).toHaveBeenCalledTimes(2);
    });
  });

  describe('task-based inference overrides workerData', () => {
    it('lets a task that matches another workerType override the configured one (bundled-env reuse)', async () => {
      // Tinypool may reuse a child process configured for one worker type to run
      // tasks for another in bundled environments. inferWorkerTypeFromTask must
      // win over getWorkerTypeFromWorkerData so the right handler is dispatched.
      vi.resetModules();
      vi.doMock('node:worker_threads', () => ({
        workerData: ['x', { workerType: 'securityCheck' }],
      }));
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const fileProcessWorker = await import('../../src/core/file/workers/fileProcessWorker.js');
      const securityCheckWorker = await import('../../src/core/security/workers/securityCheckWorker.js');

      // Task structure infers fileProcess even though workerData says securityCheck.
      await handler({ rawFile: { path: 'a.ts', content: '' }, config: {} });

      expect(fileProcessWorker.default).toHaveBeenCalled();
      expect(securityCheckWorker.default).not.toHaveBeenCalled();
      vi.doUnmock('node:worker_threads');
    });

    it('falls back to workerData when task structure is unrecognizable (no inference)', async () => {
      // Mirror of the override case: same workerData (securityCheck), but with an
      // ambiguous task that produces no inferred type. Together with the override
      // test above, this distinguishes "inference always wins" from "inference
      // wins only when it yields a value" — the production behavior at unifiedWorker.ts:140-142.
      vi.resetModules();
      vi.doMock('node:worker_threads', () => ({
        workerData: ['x', { workerType: 'securityCheck' }],
      }));
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const fileProcessWorker = await import('../../src/core/file/workers/fileProcessWorker.js');
      const securityCheckWorker = await import('../../src/core/security/workers/securityCheckWorker.js');

      await handler({ ambiguous: true });

      expect(securityCheckWorker.default).toHaveBeenCalled();
      expect(fileProcessWorker.default).not.toHaveBeenCalled();
      vi.doUnmock('node:worker_threads');
    });
  });

  describe('workerData detection', () => {
    it('uses workerType from array-shaped workerData (Tinypool child_process)', async () => {
      vi.resetModules();
      vi.doMock('node:worker_threads', () => ({
        workerData: ['something', { workerType: 'fileProcess' }],
      }));
      // Task that is not auto-inferable so workerData is the only signal.
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const fileProcessWorker = await import('../../src/core/file/workers/fileProcessWorker.js');

      await handler({ ambiguous: true });

      expect(fileProcessWorker.default).toHaveBeenCalled();
      vi.doUnmock('node:worker_threads');
    });

    it('uses workerType from object-shaped workerData (worker_threads)', async () => {
      vi.resetModules();
      vi.doMock('node:worker_threads', () => ({
        workerData: { workerType: 'securityCheck' },
      }));
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const securityCheckWorker = await import('../../src/core/security/workers/securityCheckWorker.js');

      await handler({ ambiguous: true });

      expect(securityCheckWorker.default).toHaveBeenCalled();
      vi.doUnmock('node:worker_threads');
    });

    it('falls back to REPOMIX_WORKER_TYPE env var', async () => {
      vi.resetModules();
      vi.doMock('node:worker_threads', () => ({ workerData: undefined }));
      const original = process.env.REPOMIX_WORKER_TYPE;
      process.env.REPOMIX_WORKER_TYPE = 'calculateMetrics';

      try {
        const { default: handler } = await import('../../src/shared/unifiedWorker.js');
        const calculateMetricsWorker = await import('../../src/core/metrics/workers/calculateMetricsWorker.js');

        await handler({ ambiguous: true });

        expect(calculateMetricsWorker.default).toHaveBeenCalled();
      } finally {
        if (original === undefined) {
          delete process.env.REPOMIX_WORKER_TYPE;
        } else {
          process.env.REPOMIX_WORKER_TYPE = original;
        }
        vi.doUnmock('node:worker_threads');
      }
    });
  });

  describe('onWorkerTermination', () => {
    it('should call cleanup on cached handlers', async () => {
      // First, load a handler to populate the cache
      const { default: handler, onWorkerTermination } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        content: 'test content',
        encoding: 'cl100k_base',
      };

      await handler(task);

      // Now call termination
      await onWorkerTermination();

      const calculateMetricsWorker = await import('../../src/core/metrics/workers/calculateMetricsWorker.js');
      expect(calculateMetricsWorker.onWorkerTermination).toHaveBeenCalled();
    });

    it('should clear handler cache after cleanup', async () => {
      const { default: handler, onWorkerTermination } = await import('../../src/shared/unifiedWorker.js');

      // Load handler
      await handler({ content: 'test', encoding: 'cl100k_base' });

      // Terminate
      await onWorkerTermination();

      // Load again - should call the module import again
      vi.clearAllMocks();
      await handler({ content: 'test', encoding: 'cl100k_base' });

      const calculateMetricsWorker = await import('../../src/core/metrics/workers/calculateMetricsWorker.js');
      // The handler should be called again (cache was cleared)
      expect(calculateMetricsWorker.default).toHaveBeenCalled();
    });
  });
});
