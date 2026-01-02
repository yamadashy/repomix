import { beforeEach, describe, expect, it, vi } from 'vitest';

// We need to test the internal functions, so we'll test through the module behavior
// Mock all worker modules
vi.mock('../../src/core/file/workers/fileCollectWorker.js', () => ({
  default: vi.fn().mockResolvedValue({ collected: true }),
  onWorkerTermination: vi.fn(),
}));
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
vi.mock('../../src/cli/actions/workers/defaultActionWorker.js', () => ({
  default: vi.fn().mockResolvedValue({ packResult: {}, config: {} }),
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
    it('should infer defaultAction from task with directories, cwd, config', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        directories: ['.'],
        cwd: '/test',
        config: {},
        cliOptions: {},
      };

      await handler(task);

      const defaultActionWorker = await import('../../src/cli/actions/workers/defaultActionWorker.js');
      expect(defaultActionWorker.default).toHaveBeenCalledWith(task);
    });

    it('should infer defaultAction from ping task', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = { ping: true };

      await handler(task);

      const defaultActionWorker = await import('../../src/cli/actions/workers/defaultActionWorker.js');
      expect(defaultActionWorker.default).toHaveBeenCalledWith(task);
    });

    it('should infer fileCollect from task with filePath, rootDir, maxFileSize', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        filePath: 'test.ts',
        rootDir: '/root',
        maxFileSize: 1000,
      };

      await handler(task);

      const fileCollectWorker = await import('../../src/core/file/workers/fileCollectWorker.js');
      expect(fileCollectWorker.default).toHaveBeenCalledWith(task);
    });

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

    it('should infer securityCheck from task with filePath, content, type', async () => {
      const { default: handler } = await import('../../src/shared/unifiedWorker.js');
      const task = {
        filePath: 'test.ts',
        content: 'test content',
        type: 'file',
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
      const task = { ping: true };

      await handler(task);

      // Now call termination
      await onWorkerTermination();

      const defaultActionWorker = await import('../../src/cli/actions/workers/defaultActionWorker.js');
      expect(defaultActionWorker.onWorkerTermination).toHaveBeenCalled();
    });

    it('should clear handler cache after cleanup', async () => {
      const { default: handler, onWorkerTermination } = await import('../../src/shared/unifiedWorker.js');

      // Load handler
      await handler({ ping: true });

      // Terminate
      await onWorkerTermination();

      // Load again - should call the module import again
      vi.clearAllMocks();
      await handler({ ping: true });

      const defaultActionWorker = await import('../../src/cli/actions/workers/defaultActionWorker.js');
      // The handler should be called again (cache was cleared)
      expect(defaultActionWorker.default).toHaveBeenCalled();
    });
  });
});
