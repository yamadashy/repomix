import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { onWorkerTermination } from '../../src/shared/unifiedWorker.js';

// Worker module doubles injected through deps, so the real workers (and their load-time
// side effects) are never imported.
const createWorkerModules = () => ({
  fileProcess: { default: vi.fn().mockResolvedValue({ processed: true }), onWorkerTermination: vi.fn() },
  securityCheck: { default: vi.fn().mockResolvedValue(null), onWorkerTermination: vi.fn() },
  calculateMetrics: { default: vi.fn().mockResolvedValue(100), onWorkerTermination: vi.fn() },
});

const createDeps = (workerData: unknown = undefined, env: NodeJS.ProcessEnv = {}) => {
  const modules = createWorkerModules();
  const workerModuleLoaders = {
    fileProcess: vi.fn(async () => modules.fileProcess),
    securityCheck: vi.fn(async () => modules.securityCheck),
    calculateMetrics: vi.fn(async () => modules.calculateMetrics),
  };
  return { modules, deps: { workerData, workerModuleLoaders, env } };
};

describe('unifiedWorker', () => {
  afterEach(async () => {
    // The handler cache is module-level; clear it so each test loads through its own doubles.
    await onWorkerTermination();
  });

  describe('inferWorkerTypeFromTask', () => {
    it('should infer fileProcess from task with rawFile and config', async () => {
      const { modules, deps } = createDeps();
      const task = {
        rawFile: { path: 'test.ts', content: 'code' },
        config: {},
      };

      await handler(task, deps);

      expect(modules.fileProcess.default).toHaveBeenCalledWith(task);
    });

    it('should infer calculateMetrics from task with content and encoding', async () => {
      const { modules, deps } = createDeps();
      const task = {
        content: 'test content',
        encoding: 'cl100k_base',
      };

      await handler(task, deps);

      expect(modules.calculateMetrics.default).toHaveBeenCalledWith(task);
    });

    it('should infer securityCheck from task with items (without encoding)', async () => {
      const { modules, deps } = createDeps();
      const task = {
        items: [{ filePath: 'test.ts', content: 'test content', type: 'file' }],
      };

      await handler(task, deps);

      expect(modules.securityCheck.default).toHaveBeenCalledWith(task);
    });

    it('should throw error for unrecognizable task structure', async () => {
      const { deps } = createDeps();
      const task = { unknownField: 'value' };

      await expect(handler(task, deps)).rejects.toThrow('Cannot determine worker type');
    });

    it('should throw error for null task', async () => {
      const { deps } = createDeps();

      await expect(handler(null, deps)).rejects.toThrow('Cannot determine worker type');
    });

    it('should throw error for non-object task', async () => {
      const { deps } = createDeps();

      await expect(handler('string', deps)).rejects.toThrow('Cannot determine worker type');
    });
  });

  describe('repeated calls', () => {
    it('routes every call through the worker handler and loads the module once', async () => {
      const { modules, deps } = createDeps();

      await handler({ rawFile: { path: 'a.ts', content: '' }, config: {} }, deps);
      await handler({ rawFile: { path: 'b.ts', content: '' }, config: {} }, deps);

      expect(modules.fileProcess.default).toHaveBeenCalledTimes(2);
      expect(deps.workerModuleLoaders.fileProcess).toHaveBeenCalledTimes(1);
    });
  });

  describe('task-based inference overrides workerData', () => {
    it('lets a task that matches another workerType override the configured one (bundled-env reuse)', async () => {
      // Tinypool may reuse a child process configured for one worker type to run
      // tasks for another in bundled environments. inferWorkerTypeFromTask must
      // win over getWorkerTypeFromWorkerData so the right handler is dispatched.
      const { modules, deps } = createDeps(['x', { workerType: 'securityCheck' }]);

      // Task structure infers fileProcess even though workerData says securityCheck.
      await handler({ rawFile: { path: 'a.ts', content: '' }, config: {} }, deps);

      expect(modules.fileProcess.default).toHaveBeenCalled();
      expect(modules.securityCheck.default).not.toHaveBeenCalled();
    });

    it('falls back to workerData when task structure is unrecognizable (no inference)', async () => {
      // Mirror of the override case: same workerData (securityCheck), but with an
      // ambiguous task that produces no inferred type. Together with the override
      // test above, this distinguishes "inference always wins" from "inference
      // wins only when it yields a value".
      const { modules, deps } = createDeps(['x', { workerType: 'securityCheck' }]);

      await handler({ ambiguous: true }, deps);

      expect(modules.securityCheck.default).toHaveBeenCalled();
      expect(modules.fileProcess.default).not.toHaveBeenCalled();
    });
  });

  describe('workerData detection', () => {
    it('uses workerType from array-shaped workerData (Tinypool child_process)', async () => {
      const { modules, deps } = createDeps(['something', { workerType: 'fileProcess' }]);

      // Task that is not auto-inferable so workerData is the only signal.
      await handler({ ambiguous: true }, deps);

      expect(modules.fileProcess.default).toHaveBeenCalled();
    });

    it('uses workerType from object-shaped workerData (worker_threads)', async () => {
      const { modules, deps } = createDeps({ workerType: 'securityCheck' });

      await handler({ ambiguous: true }, deps);

      expect(modules.securityCheck.default).toHaveBeenCalled();
    });

    it('falls back to REPOMIX_WORKER_TYPE env var', async () => {
      const { modules, deps } = createDeps(undefined, { REPOMIX_WORKER_TYPE: 'calculateMetrics' });

      await handler({ ambiguous: true }, deps);

      expect(modules.calculateMetrics.default).toHaveBeenCalled();
    });
  });

  describe('onWorkerTermination', () => {
    it('should call cleanup on cached handlers', async () => {
      const { modules, deps } = createDeps();
      const task = {
        content: 'test content',
        encoding: 'cl100k_base',
      };

      // First, load a handler to populate the cache
      await handler(task, deps);

      // Now call termination
      await onWorkerTermination();

      expect(modules.calculateMetrics.onWorkerTermination).toHaveBeenCalled();
    });

    it('should clear handler cache after cleanup', async () => {
      const { modules, deps } = createDeps();

      // Load handler
      await handler({ content: 'test', encoding: 'cl100k_base' }, deps);

      // Terminate
      await onWorkerTermination();

      // Load again - the module must be loaded again because the cache was cleared
      await handler({ content: 'test', encoding: 'cl100k_base' }, deps);

      expect(modules.calculateMetrics.default).toHaveBeenCalledTimes(2);
      expect(deps.workerModuleLoaders.calculateMetrics).toHaveBeenCalledTimes(2);
    });
  });
});
