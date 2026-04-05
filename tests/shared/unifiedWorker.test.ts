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
  default: vi.fn().mockResolvedValue([100]),
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

    it('should infer calculateMetrics from task with items containing encoding', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        items: [{ content: 'test content', encoding: 'cl100k_base' }],
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

  describe('onWorkerTermination', () => {
    it('should call cleanup on cached handlers', async () => {
      // First, load a handler to populate the cache
      const { default: handler, onWorkerTermination } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        items: [{ content: 'test content', encoding: 'cl100k_base' }],
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
      await handler({ items: [{ content: 'test', encoding: 'cl100k_base' }] });

      // Terminate
      await onWorkerTermination();

      // Load again - should call the module import again
      vi.clearAllMocks();
      await handler({ items: [{ content: 'test', encoding: 'cl100k_base' }] });

      const calculateMetricsWorker = await import('../../src/core/metrics/workers/calculateMetricsWorker.js');
      // The handler should be called again (cache was cleared)
      expect(calculateMetricsWorker.default).toHaveBeenCalled();
    });
  });
});
