// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { createSecurityCheckTaskRunner, runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import {
  __resetSecurityResultCacheForTests,
  securityResultCacheKey,
  setCachedClean as setCachedSecurityClean,
} from '../../../src/core/security/securityResultCache.js';
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

    // test2.js contains no secret indicator, so the main-thread pre-filter drops
    // it before dispatch (the worker would have returned `null` for it anyway).
    // Only test1.js is dispatched, so the single batch reports one item.
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (1/1) ${pc.dim('test1.js')}`),
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

  it('reuses a pre-warmed external task runner without tearing it down', async () => {
    const run = vi.fn().mockImplementation(async (task: SecurityCheckTask) => securityCheckWorker(task));
    const cleanup = vi.fn();
    const externalTaskRunner = { run, cleanup };

    // initTaskRunner must NOT be used when an external runner is supplied
    const initTaskRunner = vi.fn();

    const result = await runSecurityCheck(
      mockFiles,
      () => {},
      undefined,
      undefined,
      { initTaskRunner, getProcessConcurrency: mockGetProcessConcurrency },
      externalTaskRunner,
    );

    expect(result).toHaveLength(1);
    expect(run).toHaveBeenCalled();
    expect(initTaskRunner).not.toHaveBeenCalled();
    // Caller owns the pre-warmed pool, so runSecurityCheck must not clean it up
    expect(cleanup).not.toHaveBeenCalled();
  });
});

describe('createSecurityCheckTaskRunner', () => {
  it('creates a runner and warms one empty batch per worker (capped at 2)', async () => {
    const run = vi.fn().mockResolvedValue([]);
    const cleanup = vi.fn();
    let capturedOptions: WorkerOptions | undefined;
    const initTaskRunner = vi.fn((options: WorkerOptions) => {
      capturedOptions = options;
      return { run, cleanup };
    });

    const { taskRunner, warmupPromise } = createSecurityCheckTaskRunner(1000, {
      initTaskRunner,
      // 4 cores available, but security workers are capped at 2
      getProcessConcurrency: () => 4,
    });

    await warmupPromise;

    expect(taskRunner.run).toBe(run);
    expect(capturedOptions?.workerType).toBe('securityCheck');
    expect(capturedOptions?.maxWorkerThreads).toBe(2);
    expect(capturedOptions?.numOfTasks).toBe(1000);

    // One empty-batch warm-up dispatch per worker the pool may use (2)
    expect(run).toHaveBeenCalledTimes(2);
    for (const call of run.mock.calls) {
      expect(call[0]).toEqual({ items: [] });
    }
  });

  it('warms at most as many workers as available cores', async () => {
    const run = vi.fn().mockResolvedValue([]);
    let capturedOptions: WorkerOptions | undefined;
    const initTaskRunner = vi.fn((options: WorkerOptions) => {
      capturedOptions = options;
      return { run, cleanup: vi.fn() };
    });

    const { warmupPromise } = createSecurityCheckTaskRunner(1000, {
      initTaskRunner,
      getProcessConcurrency: () => 1,
    });

    await warmupPromise;

    expect(capturedOptions?.maxWorkerThreads).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('swallows warm-up dispatch errors', async () => {
    const run = vi.fn().mockRejectedValue(new Error('warmup boom'));
    const initTaskRunner = vi.fn(() => ({ run, cleanup: vi.fn() }));

    const { warmupPromise } = createSecurityCheckTaskRunner(1000, {
      initTaskRunner,
      getProcessConcurrency: () => 2,
    });

    // Must resolve despite the worker dispatch rejecting
    await expect(warmupPromise).resolves.toBeDefined();
  });
});

describe('runSecurityCheck pre-filter and result cache', () => {
  // Capture exactly which items reach the worker so we can assert the main-thread
  // pre-filter / cache prevented dispatch.
  const makeCapturingRunner = () => {
    const dispatched: string[] = [];
    const initTaskRunner = (<T, R>(_options: WorkerOptions) => ({
      run: async (task: T) => {
        const items = (task as SecurityCheckTask).items;
        for (const item of items) dispatched.push(item.filePath);
        return (await securityCheckWorker(task as SecurityCheckTask)) as R;
      },
      cleanup: async () => {},
    })) as typeof import('../../../src/shared/processConcurrency.js').initTaskRunner;
    return { dispatched, initTaskRunner };
  };

  const originalDisableEnv = process.env.REPOMIX_SECURITY_CACHE;

  afterEach(() => {
    if (originalDisableEnv === undefined) {
      delete process.env.REPOMIX_SECURITY_CACHE;
    } else {
      process.env.REPOMIX_SECURITY_CACHE = originalDisableEnv;
    }
    __resetSecurityResultCacheForTests();
  });

  it('never dispatches files that lack any secret indicator (pre-filter)', async () => {
    const { dispatched, initTaskRunner } = makeCapturingRunner();
    const files: RawFile[] = [
      { path: 'clean.js', content: 'export const greet = (n) => "hi " + n;' },
      // secretlint-disable
      { path: 'leak.env', content: 'AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETSKEY' },
      // secretlint-enable
    ];

    const result = await runSecurityCheck(files, () => {}, undefined, undefined, {
      initTaskRunner,
      getProcessConcurrency: () => 1,
    });

    // Only the credential-bearing file reaches the worker.
    expect(dispatched).toEqual(['leak.env']);
    expect(result.map((r) => r.filePath)).toEqual(['leak.env']);
  });

  it('skips dispatch when the content is cached clean', async () => {
    // Enable the cache for this test (the suite disables it globally).
    delete process.env.REPOMIX_SECURITY_CACHE;
    __resetSecurityResultCacheForTests();

    // A file that passes the pre-filter ("secret" indicator) but is benign.
    const benign = 'const note = "remember the secret handshake";';
    const files: RawFile[] = [{ path: 'note.js', content: benign }];

    // A previous run verified this exact content at this path clean.
    setCachedSecurityClean(securityResultCacheKey(benign, 'note.js'));

    const { dispatched, initTaskRunner } = makeCapturingRunner();
    const result = await runSecurityCheck(files, () => {}, undefined, undefined, {
      initTaskRunner,
      getProcessConcurrency: () => 1,
    });

    // The worker is never invoked; the file is treated as clean.
    expect(dispatched).toEqual([]);
    expect(result).toEqual([]);
  });

  it('does not replay a config.json clean verdict for a byte-identical package.json', async () => {
    // Regression guard: the npm preset rule only runs its xOAuth-token check for
    // package.json / package-lock.json / .npmrc, so a clean verdict for the same
    // content at a different path must NOT be replayed (the cache key includes the
    // full path, not just the extension).
    delete process.env.REPOMIX_SECURITY_CACHE;
    __resetSecurityResultCacheForTests();

    // Passes the pre-filter via the `x-oauth-basic` indicator.
    // secretlint-disable
    const content = 'registry=https://token:x-oauth-basic@example.com/';
    // secretlint-enable
    // A previous run verified this content clean *as config.json*.
    setCachedSecurityClean(securityResultCacheKey(content, 'config.json'));

    const { dispatched, initTaskRunner } = makeCapturingRunner();
    await runSecurityCheck([{ path: 'package.json', content }], () => {}, undefined, undefined, {
      initTaskRunner,
      getProcessConcurrency: () => 1,
    });

    // package.json is a cache miss (different key) → still dispatched and re-scanned.
    expect(dispatched).toEqual(['package.json']);
  });

  it('re-scans (dispatches) a credential-bearing file even though only clean verdicts are cached', async () => {
    delete process.env.REPOMIX_SECURITY_CACHE;
    __resetSecurityResultCacheForTests();

    // secretlint-disable
    const leaky = 'AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETSKEY';
    // secretlint-enable
    const files: RawFile[] = [{ path: 'leak.env', content: leaky }];

    const { dispatched, initTaskRunner } = makeCapturingRunner();
    const result = await runSecurityCheck(files, () => {}, undefined, undefined, {
      initTaskRunner,
      getProcessConcurrency: () => 1,
    });

    // It is dispatched (suspicious verdicts are never cached) and flagged.
    expect(dispatched).toEqual(['leak.env']);
    expect(result.map((r) => r.filePath)).toEqual(['leak.env']);
  });
});
