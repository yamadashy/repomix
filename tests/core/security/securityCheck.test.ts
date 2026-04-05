// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { createSecretLintConfig } from '../../../src/core/security/secretLintRunner.js';
import { runSecurityCheck } from '../../../src/core/security/securityCheck.js';
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

describe('runSecurityCheck', () => {
  it('should identify files with security issues', async () => {
    const result = await runSecurityCheck(mockFiles);

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(result[0].messages).toHaveLength(1);
  });

  it('should call progress callback at the end when fewer than PROGRESS_INTERVAL items', async () => {
    const progressCallback = vi.fn();

    await runSecurityCheck(mockFiles, progressCallback);

    // With 2 files and PROGRESS_INTERVAL=50, progress is reported once at the end (item 2 = totalItems)
    expect(progressCallback).toHaveBeenCalledTimes(1);
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (2/2) ${pc.dim('test2.js')}`),
    );
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Worker error');
    const mockRunSecretLint = vi.fn().mockRejectedValue(mockError);

    await expect(
      runSecurityCheck(mockFiles, () => {}, undefined, undefined, {
        runSecretLint: mockRunSecretLint,
        createSecretLintConfig,
      }),
    ).rejects.toThrow('Worker error');

    expect(logger.error).toHaveBeenCalledWith('Error during security check:', mockError);
  });

  it('should handle empty file list', async () => {
    const result = await runSecurityCheck([]);

    expect(result).toEqual([]);
  });

  it('should log performance metrics in trace mode', async () => {
    await runSecurityCheck(mockFiles);

    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Starting security check for'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Security check completed in'));
  });

  it('should complete within a reasonable time', async () => {
    const startTime = Date.now();

    await runSecurityCheck(mockFiles);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Processing should complete within a reasonable time
    expect(duration).toBeLessThan(5000);
  });

  it('should not modify original files', async () => {
    const originalFiles = JSON.parse(JSON.stringify(mockFiles));

    await runSecurityCheck(mockFiles);

    expect(mockFiles).toEqual(originalFiles);
  });

  it('should use default deps when no deps provided', async () => {
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
    const result = await runSecurityCheck(mockFiles, progressCallback, gitDiffResult);

    // Should find security issues in files (at least 1 from test1.js)
    expect(result.length).toBeGreaterThanOrEqual(1);
    // With 4 items (2 files + 2 git diffs) and PROGRESS_INTERVAL=50, progress reported once at the end
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });

  it('should process only workTreeDiffContent when stagedDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'diff --git a/test.js b/test.js\n+const secret = "password123";',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult);

    // With 3 items (2 files + 1 git diff) and PROGRESS_INTERVAL=50, progress reported once at the end
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });

  it('should process only stagedDiffContent when workTreeDiffContent is not available', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: 'diff --git a/config.js b/config.js\n+const apiKey = "sk-1234567890abcdef";',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult);

    // With 3 items (2 files + 1 git diff) and PROGRESS_INTERVAL=50, progress reported once at the end
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle gitDiffResult with no diff content', async () => {
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: '',
      stagedDiffContent: '',
    };

    const progressCallback = vi.fn();
    await runSecurityCheck(mockFiles, progressCallback, gitDiffResult);

    // Should process only 2 files, no git diff content because both are empty strings (falsy)
    // With 2 items and PROGRESS_INTERVAL=50, progress reported once at the end
    expect(progressCallback).toHaveBeenCalledTimes(1);
  });
});
