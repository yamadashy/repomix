// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import { createSecretLintConfig, runSecretLint } from '../../../src/core/security/workers/securityCheckWorker.js';
import { logger } from '../../../src/shared/logger.js';

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

const mockLoadEngine = async () => ({
  runSecretLint,
  createSecretLintConfig,
});

describe('runSecurityCheck', () => {
  it('should identify files with security issues', async () => {
    const result = await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(result[0].messages).toHaveLength(1);
  });

  it('should call progress callback once per security check', async () => {
    const progressCallback = vi.fn();

    await runSecurityCheck(mockFiles, progressCallback, undefined, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    // Progress callback is called once per runSecurityCheck call, with the last item.
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (2/2) ${pc.dim('test2.js')}`),
    );
  });

  it('should propagate errors from the secretlint engine loader', async () => {
    const mockError = new Error('engine load error');
    const mockErrorLoader = async () => {
      throw mockError;
    };

    await expect(
      runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
        loadSecretLintEngine: mockErrorLoader,
      }),
    ).rejects.toThrow('engine load error');

    expect(logger.error).toHaveBeenCalledWith('Error loading secretlint engine:', mockError);
  });

  it('should handle empty file list', async () => {
    const result = await runSecurityCheck([], () => {}, undefined, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    expect(result).toEqual([]);
  });

  it('should log performance metrics in trace mode', async () => {
    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Starting security check for'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Security check completed in'));
  });

  it('should skip the secretlint engine entirely when no items match the pre-screen', async () => {
    const cleanFiles: RawFile[] = [
      { path: 'a.js', content: 'console.log("hello world")' },
      { path: 'b.js', content: 'export const sum = (a, b) => a + b;' },
    ];

    const loader = vi.fn(mockLoadEngine);
    const result = await runSecurityCheck(cleanFiles, () => {}, undefined, undefined, {
      loadSecretLintEngine: loader,
    });

    expect(result).toEqual([]);
    expect(loader).not.toHaveBeenCalled();
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('pre-screen rejected all 2 items'));
  });

  it('should not modify original files', async () => {
    const originalFiles = JSON.parse(JSON.stringify(mockFiles));

    await runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    expect(mockFiles).toEqual(originalFiles);
  });

  it('should use default secretlint engine loader when no deps provided', async () => {
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
      loadSecretLintEngine: mockLoadEngine,
    });

    expect(progressCallback).toHaveBeenCalledTimes(1);

    // Should find at least one security issue from test1.js (URL with embedded credentials).
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('should process only workTreeDiffContent when stagedDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'diff --git a/test.js b/test.js\n+const secret = "password123";',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    expect(progressCallback).toHaveBeenCalledTimes(1);
  });

  it('should process only stagedDiffContent when workTreeDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: 'diff --git a/config.js b/config.js\n+const apiKey = "sk-1234567890abcdef";',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    expect(progressCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle gitDiffResult with no diff content', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult, undefined, {
      loadSecretLintEngine: mockLoadEngine,
    });

    // Empty string diff content is falsy, so only the 2 files are checked.
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });
});
