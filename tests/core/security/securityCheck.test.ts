// src/core/security/securityCheck.test.ts

import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import type { SuspiciousFileResult } from '../../../src/core/security/secretLintRunner.js';
import { createSecretLintConfig, runSecretLint } from '../../../src/core/security/secretLintRunner.js';
import { runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import type { SecurityCheckTask } from '../../../src/core/security/workers/securityCheckWorker.js';
import { logger } from '../../../src/shared/logger.js';
import type { TaskRunner } from '../../../src/shared/processConcurrency.js';

vi.mock('../../../src/shared/logger');

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

/**
 * Create a mock initTaskRunner that runs secretlint directly on the main thread
 * (bypassing the worker thread) for test environments where .js worker files
 * are not available.
 */
const createRealSecretlintTaskRunner = () => {
  return vi.fn().mockImplementation(() => {
    const config = createSecretLintConfig();
    return {
      run: async (task: SecurityCheckTask): Promise<(SuspiciousFileResult | null)[]> => {
        const results: (SuspiciousFileResult | null)[] = [];
        for (const item of task.items) {
          results.push(await runSecretLint(item.filePath, item.content, item.type, config));
        }
        return results;
      },
      cleanup: vi.fn().mockResolvedValue(undefined),
    };
  });
};

const createMockInitTaskRunner = (runFn: (task: SecurityCheckTask) => Promise<(SuspiciousFileResult | null)[]>) => {
  return vi.fn().mockReturnValue({
    run: runFn,
    cleanup: vi.fn().mockResolvedValue(undefined),
  });
};

describe('runSecurityCheck', () => {
  it('should identify files with security issues', async () => {
    const result = await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(result[0].messages).toHaveLength(1);
  });

  it('should call progress callback', async () => {
    const progressCallback = vi.fn();

    await runSecurityCheck(mockFiles, progressCallback, undefined, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    // Worker-based approach reports start and end progress
    expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Running security check...'));
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Worker error');
    const mockInitTaskRunner = createMockInitTaskRunner(() => Promise.reject(mockError));

    await expect(
      runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
        initTaskRunner: mockInitTaskRunner,
      }),
    ).rejects.toThrow('Worker error');

    expect(logger.error).toHaveBeenCalledWith('Error during security check:', mockError);
  });

  it('should handle empty file list', async () => {
    const result = await runSecurityCheck([]);

    expect(result).toEqual([]);
  });

  it('should log performance metrics in trace mode', async () => {
    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Starting security check for'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Security check completed in'));
  });

  it('should complete within a reasonable time', async () => {
    const startTime = Date.now();

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Processing should complete within a reasonable time
    expect(duration).toBeLessThan(5000);
  });

  it('should not modify original files', async () => {
    const originalFiles = JSON.parse(JSON.stringify(mockFiles));

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    expect(mockFiles).toEqual(originalFiles);
  });

  it('should create task runner with correct options', async () => {
    const mockInitTaskRunner = vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue([null, null]),
      cleanup: vi.fn().mockResolvedValue(undefined),
    });

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(mockInitTaskRunner).toHaveBeenCalledWith({
      numOfTasks: 1,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });
  });

  it('should process Git log content when gitLogResult is provided', async () => {
    const mockRun = vi.fn().mockResolvedValue([null, null, null]);
    const mockInitTaskRunner = createMockInitTaskRunner(mockRun);

    await runSecurityCheck(
      mockFiles,
      () => {},
      undefined,
      { logContent: 'commit abc123\nAuthor: test\nsecret: password123', commits: [] },
      { initTaskRunner: mockInitTaskRunner },
    );

    expect(mockRun).toHaveBeenCalledWith({
      items: expect.arrayContaining([expect.objectContaining({ filePath: 'Git log history', type: 'gitLog' })]),
    });
  });

  it('should process Git diff content when gitDiffResult is provided', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'diff --git a/test.js b/test.js\n+const secret = "password123";',
      stagedDiffContent: 'diff --git a/config.js b/config.js\n+const apiKey = "sk-1234567890abcdef";',
    };

    const progressCallback = vi.fn();
    const result = await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    // Should find security issues in files (at least 1 from test1.js)
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(progressCallback).toHaveBeenCalled();
  });

  it('should process only workTreeDiffContent when stagedDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'diff --git a/test.js b/test.js\n+const secret = "password123";',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    expect(progressCallback).toHaveBeenCalled();
  });

  it('should process only stagedDiffContent when workTreeDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: 'diff --git a/config.js b/config.js\n+const apiKey = "sk-1234567890abcdef";',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    expect(progressCallback).toHaveBeenCalled();
  });

  it('should handle gitDiffResult with no diff content', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: createRealSecretlintTaskRunner(),
    });

    // Should process only 2 files, no git diff content because both are empty strings (falsy)
    expect(progressCallback).toHaveBeenCalled();
  });

  it('should send all items as a single batch to the worker', async () => {
    const mockRun = vi
      .fn()
      .mockResolvedValue([{ filePath: 'test1.js', messages: ['secret found'], type: 'file' }, null]);
    const mockInitTaskRunner = createMockInitTaskRunner(mockRun);

    const result = await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    // Should send a single batch with all items
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockRun).toHaveBeenCalledWith({
      items: expect.arrayContaining([
        expect.objectContaining({ filePath: 'test1.js', type: 'file' }),
        expect.objectContaining({ filePath: 'test2.js', type: 'file' }),
      ]),
    });

    // Should filter out null results
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
  });

  it('should cleanup task runner after completion', async () => {
    const mockCleanup = vi.fn().mockResolvedValue(undefined);
    const mockInitTaskRunner = vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue([null, null]),
      cleanup: mockCleanup,
    });

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it('should cleanup task runner even on error', async () => {
    const mockCleanup = vi.fn().mockResolvedValue(undefined);
    const mockInitTaskRunner = vi.fn().mockReturnValue({
      run: vi.fn().mockRejectedValue(new Error('fail')),
      cleanup: mockCleanup,
    });

    await expect(
      runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
        initTaskRunner: mockInitTaskRunner,
      }),
    ).rejects.toThrow('fail');

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });
});
