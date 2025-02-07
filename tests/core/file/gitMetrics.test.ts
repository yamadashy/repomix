// tests/core/file/gitMetrics.test.ts (continued)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateGitMetrics, isGitInstalled, isGitRepository } from '../../../src/core/file/gitMetrics.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitMetrics', () => {
  // ... (previous test cases)

  describe('calculateGitMetrics', () => {
    const mockGitLogOutput = `
file1.ts
file2.ts
file1.ts
file3.ts
file2.ts
file1.ts
    `.trim();

    it('should calculate metrics correctly', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: mockGitLogOutput, stderr: '' }) // git log
        .mockResolvedValueOnce({ stdout: '6', stderr: '' }); // commit count

      const result = await calculateGitMetrics('/test/dir', 100, {
        execFileAsync: mockExecFileAsync,
        isGitInstalled: async () => true,
        isGitRepository: async () => true,
      });

      expect(result).toEqual({
        totalCommits: 6,
        mostChangedFiles: [
          { path: 'file1.ts', changes: 3 },
          { path: 'file2.ts', changes: 2 },
          { path: 'file3.ts', changes: 1 },
        ],
      });

      expect(mockExecFileAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'log',
        '--name-only',
        '--pretty=format:',
        '-n',
        '100',
      ]);
    });

    it('should return error when git is not installed', async () => {
      const result = await calculateGitMetrics('/test/dir', 100, {
        execFileAsync: vi.fn(),
        isGitInstalled: async () => false,
        isGitRepository: async () => true,
      });

      expect(result).toEqual({
        totalCommits: 0,
        mostChangedFiles: [],
        error: 'Git is not installed',
      });
    });

    it('should return error for non-git repository', async () => {
      const result = await calculateGitMetrics('/test/dir', 100, {
        execFileAsync: vi.fn(),
        isGitInstalled: async () => true,
        isGitRepository: async () => false,
      });

      expect(result).toEqual({
        totalCommits: 0,
        mostChangedFiles: [],
        error: 'Not a Git repository',
      });
    });

    it('should handle git command errors', async () => {
      const mockError = new Error('Git command failed');
      const mockExecFileAsync = vi.fn().mockRejectedValue(mockError);

      const result = await calculateGitMetrics('/test/dir', 100, {
        execFileAsync: mockExecFileAsync,
        isGitInstalled: async () => true,
        isGitRepository: async () => true,
      });

      expect(result).toEqual({
        totalCommits: 0,
        mostChangedFiles: [],
        error: 'Failed to calculate git metrics',
      });
      expect(logger.error).toHaveBeenCalledWith('Error calculating git metrics:', mockError);
    });

    it('should respect maxCommits parameter', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: mockGitLogOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: '3', stderr: '' });

      const result = await calculateGitMetrics('/test/dir', 3, {
        execFileAsync: mockExecFileAsync,
        isGitInstalled: async () => true,
        isGitRepository: async () => true,
      });

      expect(result.totalCommits).toBe(3);
      expect(mockExecFileAsync).toHaveBeenCalledWith('git', expect.arrayContaining(['-n', '3']));
    });

    it('should limit to top 5 most changed files', async () => {
      const mockLongOutput = `
file1.ts
file2.ts
file3.ts
file4.ts
file5.ts
file6.ts
file7.ts
file1.ts
file2.ts
file3.ts
file4.ts
file5.ts
file1.ts
      `.trim();

      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: mockLongOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: '13', stderr: '' });

      const result = await calculateGitMetrics('/test/dir', 100, {
        execFileAsync: mockExecFileAsync,
        isGitInstalled: async () => true,
        isGitRepository: async () => true,
      });

      expect(result.mostChangedFiles).toHaveLength(5);
      expect(result.mostChangedFiles[0].path).toBe('file1.ts');
      expect(result.mostChangedFiles[0].changes).toBe(3);
    });

    it('should handle empty git repository', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '0', stderr: '' });

      const result = await calculateGitMetrics('/test/dir', 100, {
        execFileAsync: mockExecFileAsync,
        isGitInstalled: async () => true,
        isGitRepository: async () => true,
      });

      expect(result).toEqual({
        totalCommits: 0,
        mostChangedFiles: [],
      });
    });

    it('should handle malformed git log output', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'malformed\noutput\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'invalid', stderr: '' });

      const result = await calculateGitMetrics('/test/dir', 100, {
        execFileAsync: mockExecFileAsync,
        isGitInstalled: async () => true,
        isGitRepository: async () => true,
      });

      expect(result).toEqual({
        totalCommits: 0,
        mostChangedFiles: [
          { path: 'malformed', changes: 1 },
          { path: 'output', changes: 1 },
        ],
        error: 'Failed to calculate git metrics',
      });
    });
  });
});
