// src/core/security/securityCheck.test.ts

import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { getSecurityCheckMaxWorkerThreads, runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import securityCheckWorker from '../../../src/core/security/workers/securityCheckWorker.js';
import { logger, repomixLogLevels } from '../../../src/shared/logger.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';
import { inlineInitTaskRunner } from '../../testing/taskRunnerDoubles.js';

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

const mockInitTaskRunner = inlineInitTaskRunner(securityCheckWorker);

describe('getSecurityCheckMaxWorkerThreads', () => {
  it('keeps two workers for repositories of up to 600 items', () => {
    expect(getSecurityCheckMaxWorkerThreads(1, 18, false)).toBe(2);
    expect(getSecurityCheckMaxWorkerThreads(600, 18, false)).toBe(2);
    expect(getSecurityCheckMaxWorkerThreads(601, 18, false)).toBe(3);
  });

  it('grows with the square root of the item count', () => {
    expect(getSecurityCheckMaxWorkerThreads(2_000, 18, false)).toBe(4);
    expect(getSecurityCheckMaxWorkerThreads(7_000, 18, false)).toBe(7);
    expect(getSecurityCheckMaxWorkerThreads(12_000, 18, false)).toBe(9);
  });

  it('stops at half the cores, rounded down', () => {
    expect(getSecurityCheckMaxWorkerThreads(100_000, 18, false)).toBe(9);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 9, false)).toBe(4);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 8, false)).toBe(4);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 6, false)).toBe(3);
  });

  it('keeps two workers on machines with five cores or fewer', () => {
    expect(getSecurityCheckMaxWorkerThreads(100_000, 5, false)).toBe(2);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 4, false)).toBe(2);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 2, false)).toBe(2);
  });

  it('never exceeds the available cores', () => {
    expect(getSecurityCheckMaxWorkerThreads(100_000, 1, false)).toBe(1);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 1, true)).toBe(1);
  });

  it('stays at two workers on Bun regardless of size and core count', () => {
    expect(getSecurityCheckMaxWorkerThreads(100, 18, true)).toBe(2);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 8, true)).toBe(2);
    expect(getSecurityCheckMaxWorkerThreads(100_000, 18, true)).toBe(2);
  });
});

describe('runSecurityCheck', () => {
  beforeEach(() => {
    silenceLogger();
  });

  it('should size the worker pool from the process concurrency', async () => {
    const inlineTaskRunner = inlineInitTaskRunner(securityCheckWorker);
    const initTaskRunnerSpy = vi.fn(inlineTaskRunner) as typeof inlineTaskRunner;

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: initTaskRunnerSpy,
      getProcessConcurrency: () => 8,
    });

    expect(initTaskRunnerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workerType: 'securityCheck',
        numOfTasks: mockFiles.length,
        maxWorkerThreads: 2,
      }),
    );
  });

  it('should size the worker pool from every item, including git diffs', async () => {
    // 600 files alone stay at 2 workers; the git diff is the 601st item and tips it to 3.
    // Sizing by batch count (13) would give 2 as well.
    const files: RawFile[] = Array.from({ length: 600 }, (_, index) => ({
      path: `file${index}.js`,
      content: 'console.log("Hello World");',
    }));
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'diff --git a/file0.js b/file0.js',
      stagedDiffContent: '',
    };
    const cleanTaskRunner = inlineInitTaskRunner(async (task: { items: unknown[] }) => task.items.map(() => null));
    const initTaskRunnerSpy = vi.fn(cleanTaskRunner) as typeof cleanTaskRunner;

    await runSecurityCheck(files, () => {}, gitDiffResult, undefined, {
      initTaskRunner: initTaskRunnerSpy,
      getProcessConcurrency: () => 18,
    });

    expect(initTaskRunnerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        numOfTasks: 601,
        maxWorkerThreads: 3,
      }),
    );
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
    // The default deps start a real Tinypool pool. The TypeScript worker cannot be spawned from the
    // source tree, so point the pool at a plain-JS stub through the bundled-worker override.
    vi.stubEnv(
      'REPOMIX_WORKER_PATH',
      fileURLToPath(new URL('../../fixtures/workers/securityCheckStubWorker.mjs', import.meta.url)),
    );
    // Pin logger.getLogLevel to a valid value
    vi.spyOn(logger, 'getLogLevel').mockReturnValue(repomixLogLevels.INFO);

    try {
      const result = await runSecurityCheck(mockFiles, () => {});

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe('test1.js');
      expect(result[0].messages).toHaveLength(1);
    } finally {
      vi.unstubAllEnvs();
    }
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
