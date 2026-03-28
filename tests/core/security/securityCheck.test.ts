// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { runSecurityCheck, SECRET_TRIGGER_PATTERN } from '../../../src/core/security/securityCheck.js';
import type { SecurityCheckTask } from '../../../src/core/security/workers/securityCheckWorker.js';
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
      return (await securityCheckWorker(task as SecurityCheckTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe('SECRET_TRIGGER_PATTERN', () => {
  it('should match AWS access key ID patterns', () => {
    expect(SECRET_TRIGGER_PATTERN.test('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('ASIAIOSFODNN7EXAMPLE')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('A3TEXAMPLE')).toBe(true);
  });

  it('should match AWS secret access key assignments', () => {
    expect(SECRET_TRIGGER_PATTERN.test('SECRET_ACCESS_KEY=AbCdEfGh')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('secret_access_key: "value"')).toBe(true);
  });

  it('should match private key headers', () => {
    expect(SECRET_TRIGGER_PATTERN.test('-----BEGIN RSA PRIVATE KEY-----')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('-----BEGIN PRIVATE KEY-----')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('-----BEGIN OPENSSH PRIVATE KEY-----')).toBe(true);
  });

  it('should match basic auth URLs including ftp', () => {
    // secretlint-disable
    expect(SECRET_TRIGGER_PATTERN.test('https://user:pass@example.com')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('ftp://user:pass@host')).toBe(true);
    // secretlint-enable
  });

  it('should match GitHub tokens including fine-grained PATs', () => {
    expect(SECRET_TRIGGER_PATTERN.test('ghp_ABCDEFabcdef1234567890')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('ghr_ABCDEFabcdef1234567890')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('github_pat_xxxxxxxxxx')).toBe(true);
  });

  it('should match OpenAI/Anthropic API keys', () => {
    expect(SECRET_TRIGGER_PATTERN.test('sk-ant-api03-xxxxxxxx')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
  });

  it('should match database connection strings', () => {
    // secretlint-disable
    expect(SECRET_TRIGGER_PATTERN.test('mongodb://user:pass@host:27017/db')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('postgres://user:pass@host:5432/db')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('mysqlx://user:pass@host/db')).toBe(true);
    // secretlint-enable
  });

  it('should not match normal source code', () => {
    expect(SECRET_TRIGGER_PATTERN.test('console.log("Hello World");')).toBe(false);
    expect(SECRET_TRIGGER_PATTERN.test('const x = 42;')).toBe(false);
    expect(SECRET_TRIGGER_PATTERN.test('import express from "express";')).toBe(false);
  });

  it('should match Slack tokens and webhooks', () => {
    // secretlint-disable
    expect(SECRET_TRIGGER_PATTERN.test('xoxb-1234567890-abcdefghij')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('xapp-1-XXXXXXXXX')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('hooks.slack.com/services/T00/B00/xxx')).toBe(true);
    // secretlint-enable
  });

  it('should match NPM tokens and auth', () => {
    // secretlint-disable
    expect(SECRET_TRIGGER_PATTERN.test('npm_abcdefghijklmnopqrstuvwxyz1234567890')).toBe(true);
    expect(SECRET_TRIGGER_PATTERN.test('_authToken=xxxx')).toBe(true);
    // secretlint-enable
  });
  it('should be updated when secretlint-rule-preset-recommend adds new rules', async () => {
    // If this test fails, a new rule was added to the secretlint preset.
    // Update SECRET_TRIGGER_PATTERN in securityCheck.ts to cover the new rule's patterns.
    const { creator } = await import('@secretlint/secretlint-rule-preset-recommend');
    expect(creator.rules.length).toBe(15);
  });
});

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

    // test2.js is skipped by the pre-filter (no trigger patterns), so only test1.js is checked
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (1/1) ${pc.dim('test1.js')}`),
    );
    expect(progressCallback).not.toHaveBeenCalledWith(expect.stringContaining('test2.js'));
  });

  it('should skip files without trigger patterns via pre-filter', async () => {
    const filesWithNoSecrets: RawFile[] = [
      { path: 'clean1.js', content: 'const x = 1;' },
      { path: 'clean2.js', content: 'function hello() { return "world"; }' },
    ];

    const result = await runSecurityCheck(filesWithNoSecrets, () => {}, undefined, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    // No files match trigger pattern, so none are sent to workers
    expect(result).toEqual([]);
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

    // Should process 1 file (test1.js passes pre-filter, test2.js skipped) + 2 git diff contents = 3 total tasks
    expect(progressCallback).toHaveBeenCalledTimes(3);

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

    // Should process 1 file (test1.js passes pre-filter) + 1 git diff content = 2 total tasks
    expect(progressCallback).toHaveBeenCalledTimes(2);

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

    // Should process 1 file (test1.js passes pre-filter) + 1 git diff content = 2 total tasks
    expect(progressCallback).toHaveBeenCalledTimes(2);

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

    // Should process only 1 file (test1.js passes pre-filter), no git diff content
    expect(progressCallback).toHaveBeenCalledTimes(1);

    // Check that no git diff tasks were processed
    expect(progressCallback).not.toHaveBeenCalledWith(expect.stringContaining('Working tree changes'));
    expect(progressCallback).not.toHaveBeenCalledWith(expect.stringContaining('Staged changes'));
  });
});
