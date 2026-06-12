// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { createSecurityCheckTaskRunner, runSecurityCheck } from '../../../src/core/security/securityCheck.js';
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

  it('should reuse a pre-created task runner without creating or cleaning up a pool', async () => {
    const run = vi.fn().mockImplementation(async (task: SecurityCheckTask) => securityCheckWorker(task));
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const initTaskRunnerSpy = vi.fn();

    const result = await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: initTaskRunnerSpy,
      getProcessConcurrency: mockGetProcessConcurrency,
      taskRunner: { run, cleanup },
    });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(run).toHaveBeenCalled();
    // The provided runner is owned by the caller: no pool creation, no cleanup here.
    expect(initTaskRunnerSpy).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });
});

describe('createSecurityCheckTaskRunner', () => {
  it('creates a runner and immediately warms up a single worker', async () => {
    const run = vi.fn().mockResolvedValue([]);
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const initTaskRunnerSpy = vi.fn().mockReturnValue({ run, cleanup });

    const { taskRunner, warmupPromise } = createSecurityCheckTaskRunner({
      initTaskRunner: initTaskRunnerSpy,
      getProcessConcurrency: mockGetProcessConcurrency,
    });

    expect(initTaskRunnerSpy).toHaveBeenCalledWith({
      // The file count is unknown before search; the pool is capped by worker count alone.
      numOfTasks: Number.MAX_SAFE_INTEGER,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: 2,
    });

    await warmupPromise;
    // Only the first-stage warm-up runs until the file count is known.
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith({ items: [] });
    expect(taskRunner.run).toBe(run);
  });

  it('completeWarmup posts the second warm-up task for large workloads', async () => {
    const run = vi.fn().mockResolvedValue([]);
    const initTaskRunnerSpy = vi.fn().mockReturnValue({ run, cleanup: vi.fn() });

    const runnerWithWarmup = createSecurityCheckTaskRunner({
      initTaskRunner: initTaskRunnerSpy,
      getProcessConcurrency: mockGetProcessConcurrency,
    });
    runnerWithWarmup.completeWarmup(1000);

    await runnerWithWarmup.warmupPromise;
    // 1000 tasks size the pool at 2 workers; one warm-up task per worker.
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('completeWarmup keeps a single worker for small workloads and is idempotent', async () => {
    const run = vi.fn().mockResolvedValue([]);
    const initTaskRunnerSpy = vi.fn().mockReturnValue({ run, cleanup: vi.fn() });

    const runnerWithWarmup = createSecurityCheckTaskRunner({
      initTaskRunner: initTaskRunnerSpy,
      getProcessConcurrency: mockGetProcessConcurrency,
    });
    // ceil(10/100) = 1 — the pool would only ever spawn one worker.
    runnerWithWarmup.completeWarmup(10);
    // A second call must not add warm-up tasks either.
    runnerWithWarmup.completeWarmup(1000);

    await runnerWithWarmup.warmupPromise;
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not reject the warmup promise when warm-up tasks fail', async () => {
    const run = vi.fn().mockRejectedValue(new Error('spawn failed'));
    const initTaskRunnerSpy = vi.fn().mockReturnValue({ run, cleanup: vi.fn() });

    const runnerWithWarmup = createSecurityCheckTaskRunner({
      initTaskRunner: initTaskRunnerSpy,
      getProcessConcurrency: mockGetProcessConcurrency,
    });
    runnerWithWarmup.completeWarmup(1000);

    // Each warm-up task swallows its own failure and resolves to [].
    await expect(runnerWithWarmup.warmupPromise).resolves.toEqual([[], []]);
  });
});
