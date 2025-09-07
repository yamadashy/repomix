// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import type { SecurityCheckTask } from '../../../src/core/security/workers/securityCheckWorker.js';
import securityCheckWorker from '../../../src/core/security/workers/securityCheckWorker.js';
import { logger } from '../../../src/shared/logger.js';
import { repomixLogLevels } from '../../../src/shared/logger.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';

vi.mock('../../../src/shared/logger');
vi.mock('../../../src/shared/processConcurrency', () => ({
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

const mockFiles: Array<RawFile & { content: string }> = [
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
    });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(result[0].messages).toHaveLength(1);
  });

  it('should call progress callback with correct messages', async () => {
    const progressCallback = vi.fn();

    await runSecurityCheck(mockFiles, progressCallback, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (1/2) ${pc.dim('test1.js')}`),
    );
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
      }),
    ).rejects.toThrow('Worker error');

    expect(logger.error).toHaveBeenCalledWith('Error during security check:', mockError);
  });

  it('should handle empty file list', async () => {
    const result = await runSecurityCheck([], () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual([]);
  });

  it('should log performance metrics in trace mode', async () => {
    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Starting security check for'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Security check completed in'));
  });

  it('should process files in parallel', async () => {
    const startTime = Date.now();

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
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
    });

    // Should process 2 files + 2 git diff contents = 4 total tasks
    expect(progressCallback).toHaveBeenCalledTimes(4);

    // Check that Git diff tasks were processed
    expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Working tree changes'));
    expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Staged changes'));

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
    });

    // Should process 2 files + 1 git diff content = 3 total tasks
    expect(progressCallback).toHaveBeenCalledTimes(3);

    // Check that only working tree diff was processed
    expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Working tree changes'));
    // Staged changes should not be processed because content is empty string (falsy)
    expect(progressCallback).not.toHaveBeenCalledWith(expect.stringContaining('Staged changes'));
  });

  it('should process only stagedDiffContent when workTreeDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: 'diff --git a/config.js b/config.js\n+const apiKey = "sk-1234567890abcdef";',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    // Should process 2 files + 1 git diff content = 3 total tasks
    expect(progressCallback).toHaveBeenCalledTimes(3);

    // Check that only staged diff was processed
    expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Staged changes'));
    // Working tree changes should not be processed because content is empty string (falsy)
    expect(progressCallback).not.toHaveBeenCalledWith(expect.stringContaining('Working tree changes'));
  });

  it('should handle gitDiffResult with no diff content', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    // Should process only 2 files, no git diff content because both are empty strings (falsy)
    expect(progressCallback).toHaveBeenCalledTimes(2);

    // Check that no git diff tasks were processed
    expect(progressCallback).not.toHaveBeenCalledWith(expect.stringContaining('Working tree changes'));
    expect(progressCallback).not.toHaveBeenCalledWith(expect.stringContaining('Staged changes'));
  });
});
