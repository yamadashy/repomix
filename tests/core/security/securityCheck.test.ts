// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { contentMayContainSecrets, runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import type {
  SecurityCheckBatchTask,
  SecurityCheckTask,
} from '../../../src/core/security/workers/securityCheckWorker.js';
import securityCheckWorker from '../../../src/core/security/workers/securityCheckWorker.js';
import { logger, repomixLogLevels } from '../../../src/shared/logger.js';
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
    unref: vi.fn(),
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

const mockInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await securityCheckWorker(task as SecurityCheckTask | SecurityCheckBatchTask)) as R;
    },
    cleanup: async () => {},
    unref: () => {
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

    // With the pre-filter, only test1.js passes (contains "://" + "@" trigger).
    // test2.js is skipped because its content has no trigger substrings.
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
        cleanup: async () => {},
        unref: () => {
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

    // With batching, all 4 tasks (2 files + 2 git diffs) fit in one batch
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
    });

    // With batching, all 3 tasks fit in one batch
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
    });

    // With batching, all 3 tasks fit in one batch
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
    });

    // With batching, 2 tasks fit in one batch
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });
});

describe('contentMayContainSecrets', () => {
  it('should return false for plain code without secret patterns', () => {
    expect(contentMayContainSecrets('console.log("Hello World");')).toBe(false);
    expect(contentMayContainSecrets('const x = 42;')).toBe(false);
    expect(contentMayContainSecrets('function foo() { return bar; }')).toBe(false);
  });

  it('should return true for content with private key markers', () => {
    expect(contentMayContainSecrets('-----BEGIN RSA PRIVATE KEY-----')).toBe(true);
    expect(contentMayContainSecrets('has a PRIVATE KEY in it')).toBe(true);
  });

  it('should return true for content with API key patterns', () => {
    expect(contentMayContainSecrets('token: ghp_abc123')).toBe(true);
    expect(contentMayContainSecrets('key = "sk-ant-api01-xyz"')).toBe(true);
    expect(contentMayContainSecrets('AKIA1234567890ABCDEF')).toBe(true);
  });

  it('should return true for content with database URLs', () => {
    expect(contentMayContainSecrets('mysql://root:pass@localhost/db')).toBe(true);
    expect(contentMayContainSecrets('postgres://user:pw@host/db')).toBe(true);
    expect(contentMayContainSecrets('mongodb://admin:secret@cluster.example.com')).toBe(true);
  });

  it('should return true for URL-embedded credentials (BasicAuth)', () => {
    // secretlint-disable
    expect(contentMayContainSecrets('https://user:pass@example.com')).toBe(true);
    expect(contentMayContainSecrets('ftp://admin:secret@fileserver.local')).toBe(true);
    // secretlint-enable
  });

  it('should return false when :// and @ are far apart', () => {
    const padding = 'a'.repeat(600);
    expect(contentMayContainSecrets(`https://${padding}@example.com`)).toBe(false);
  });

  it('should return true for npm tokens', () => {
    expect(contentMayContainSecrets('npm_abcdefg1234567890')).toBe(true);
    expect(contentMayContainSecrets('_authToken=xyz')).toBe(true);
  });

  it('should return true for Slack tokens', () => {
    // secretlint-disable
    expect(contentMayContainSecrets('xoxb-123-456-abc')).toBe(true);
    // secretlint-enable
    expect(contentMayContainSecrets('hooks.slack.com/services/T00/B00/xxx')).toBe(true);
  });
});
