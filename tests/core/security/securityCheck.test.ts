// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import {
  cleanupWarmupSecurityWorkerPool,
  runSecurityCheck,
  warmupSecurityWorkerPool,
} from '../../../src/core/security/securityCheck.js';
import type { SecurityCheckTask } from '../../../src/core/security/workers/securityCheckWorker.js';
import securityCheckWorker from '../../../src/core/security/workers/securityCheckWorker.js';
import { logger, repomixLogLevels } from '../../../src/shared/logger.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';

vi.mock('../../../src/shared/logger');
vi.mock('../../../src/shared/processConcurrency', () => ({
  getProcessConcurrency: vi.fn(() => 4),
  initWorker: vi.fn(() => ({
    run: vi.fn().mockImplementation(async (task: SecurityCheckTask) => {
      return await securityCheckWorker(task);
    }),
  })),
  cleanupWorkerPool: vi.fn(),
  initTaskRunner: vi.fn(() => ({
    run: vi.fn().mockImplementation(async (task: SecurityCheckTask) => {
      return await securityCheckWorker(task);
    }),
    cleanup: vi.fn(),
  })),
}));

const mockFiles: RawFile[] = [
  {
    path: 'test1.js',
    // secretlint-disable
    content: 'URL: https://user:pass@example.com', // Clear security issue
    // secretlint-enable
  },
  {
    path: 'test2.js',
    content: 'console.log("Hello World");', // No secrets
  },
];

const mockGetProcessConcurrency = () => 4;

const mockInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await securityCheckWorker(task as SecurityCheckTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe('runSecurityCheck', () => {
  // Ensure module-level warmup slot doesn't leak between tests.
  afterEach(async () => {
    await cleanupWarmupSecurityWorkerPool();
  });

  it('should identify files with security issues', async () => {
    const result = await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(result[0].messages).toHaveLength(1);
  });

  it('should call progress callback for each batch', async () => {
    const progressCallback = vi.fn();

    await runSecurityCheck(mockFiles, progressCallback, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    // With 2 files and batch size 50, all files are in a single batch
    // Progress callback is called once per batch with the last file in the batch
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (2/2) ${pc.dim('test2.js')}`),
    );
  });

  it('should handle worker errors gracefully', async () => {
    const mockError = new Error('Worker error');
    const mockErrorTaskRunner = (_options?: WorkerOptions) => {
      return {
        run: async () => {
          throw mockError;
        },
        cleanup: async () => {
          // Mock cleanup - no-op for tests
        },
      };
    };

    await expect(
      runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
        initTaskRunner: mockErrorTaskRunner,
        getProcessConcurrency: mockGetProcessConcurrency,
      }),
    ).rejects.toThrow('Worker error');

    expect(logger.error).toHaveBeenCalledWith('Error during security check:', mockError);
  });

  it('should handle empty file list', async () => {
    const result = await runSecurityCheck([], () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    expect(result).toEqual([]);
  });

  it('should log performance metrics in trace mode', async () => {
    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Starting security check for'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Security check completed in'));
  });

  it('should process files in parallel', async () => {
    const startTime = Date.now();

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Parallel processing should be faster than sequential
    expect(duration).toBeLessThan(1000); // Adjust threshold as needed
  });

  it('should not modify original files', async () => {
    const originalFiles = JSON.parse(JSON.stringify(mockFiles));

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    expect(mockFiles).toEqual(originalFiles);
  });

  it('should use default initTaskRunner when no deps provided', async () => {
    // Test the default initTaskRunner function (lines 16-18)
    // Mock logger.getLogLevel to return a valid value
    vi.mocked(logger.getLogLevel).mockReturnValue(repomixLogLevels.INFO);

    const result = await runSecurityCheck(mockFiles, () => {});

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(result[0].messages).toHaveLength(1);
  });

  it('should process Git diff content when gitDiffResult is provided', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'diff --git a/test.js b/test.js\n+const secret = "password123";',
      stagedDiffContent: 'diff --git a/config.js b/config.js\n+const apiKey = "sk-1234567890abcdef";',
    };

    const progressCallback = vi.fn();
    const result = await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    // With batch size 50 and 4 items (2 files + 2 git diffs), all in a single batch
    expect(progressCallback).toHaveBeenCalledTimes(1);

    // Should find security issues in files (at least 1 from test1.js)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should process only workTreeDiffContent when stagedDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'diff --git a/test.js b/test.js\n+const secret = "password123";',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    // With batch size 50 and 3 items (2 files + 1 git diff), all in a single batch
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });

  it('should process only stagedDiffContent when workTreeDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: 'diff --git a/config.js b/config.js\n+const apiKey = "sk-1234567890abcdef";',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    // With batch size 50 and 3 items (2 files + 1 git diff), all in a single batch
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });

  it('should reuse the pre-warmed task runner exactly once', async () => {
    const cleanup = vi.fn();
    const run = vi.fn().mockImplementation(async (task: SecurityCheckTask) => {
      return await securityCheckWorker(task);
    });
    const initSpy = vi.fn(() => ({ run, cleanup }));

    warmupSecurityWorkerPool({
      initTaskRunner: initSpy as unknown as typeof mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });
    expect(initSpy).toHaveBeenCalledTimes(1);

    const fallbackInit = vi.fn(mockInitTaskRunner);
    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: fallbackInit as unknown as typeof mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    // Warmed runner consumed; fallback initTaskRunner not invoked
    expect(fallbackInit).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);

    // Second call falls through to the provided init since warmup slot was consumed
    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: fallbackInit as unknown as typeof mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });
    expect(fallbackInit).toHaveBeenCalledTimes(1);
  });

  it('should not overwrite an existing warmed runner', async () => {
    const initSpy = vi.fn(mockInitTaskRunner);

    warmupSecurityWorkerPool({
      initTaskRunner: initSpy as unknown as typeof mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });
    warmupSecurityWorkerPool({
      initTaskRunner: initSpy as unknown as typeof mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    expect(initSpy).toHaveBeenCalledTimes(1);
    await cleanupWarmupSecurityWorkerPool();
  });

  it('should clean up warmed runner on empty input early return', async () => {
    const cleanup = vi.fn();
    const initSpy = vi.fn(() => ({ run: vi.fn(), cleanup }));

    warmupSecurityWorkerPool({
      initTaskRunner: initSpy as unknown as typeof mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    const result = await runSecurityCheck([], () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    expect(result).toEqual([]);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('cleanupWarmupSecurityWorkerPool drains a warmed runner and is a no-op otherwise', async () => {
    const cleanup = vi.fn();
    const initSpy = vi.fn(() => ({ run: vi.fn(), cleanup }));

    warmupSecurityWorkerPool({
      initTaskRunner: initSpy as unknown as typeof mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    await cleanupWarmupSecurityWorkerPool();
    expect(cleanup).toHaveBeenCalledTimes(1);

    // Calling again with nothing warmed must not throw.
    await expect(cleanupWarmupSecurityWorkerPool()).resolves.toBeUndefined();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should handle gitDiffResult with no diff content', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: mockInitTaskRunner,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    // Should process only 2 files, no git diff content because both are empty strings (falsy)
    // With batch size 50, all in a single batch
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });
});
