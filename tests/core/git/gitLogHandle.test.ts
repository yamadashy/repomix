import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { GitLogResult } from '../../../src/core/git/gitLogHandle.js';
import {
  GIT_LOG_FORMAT_SEPARATOR,
  GIT_LOG_RECORD_SEPARATOR,
  getGitLog,
  getGitLogs,
} from '../../../src/core/git/gitLogHandle.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitLogHandle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getGitLog', () => {
    test('should return git log content when directory is a git repository', async () => {
      const mockExecGitLog = vi.fn().mockResolvedValue('mock log content');
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);

      const result = await getGitLog('/test/dir', 10, {
        execGitLog: mockExecGitLog,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe('mock log content');
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitLog).toHaveBeenCalledWith('/test/dir', 10, GIT_LOG_FORMAT_SEPARATOR);
    });

    test('should return empty string when directory is not a git repository', async () => {
      const mockExecGitLog = vi.fn();
      const mockIsGitRepository = vi.fn().mockResolvedValue(false);

      const result = await getGitLog('/test/dir', 10, {
        execGitLog: mockExecGitLog,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe('');
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitLog).not.toHaveBeenCalled();
      expect(logger.trace).toHaveBeenCalledWith('Directory /test/dir is not a git repository');
    });

    test('should throw error when git log command fails', async () => {
      const mockError = new Error('git command failed');
      const mockExecGitLog = vi.fn().mockRejectedValue(mockError);
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);

      await expect(
        getGitLog('/test/dir', 10, {
          execGitLog: mockExecGitLog,
          isGitRepository: mockIsGitRepository,
        }),
      ).rejects.toThrow('git command failed');

      expect(logger.trace).toHaveBeenCalledWith('Failed to get git log:', 'git command failed');
    });
  });

  describe('getGitLogs', () => {
    test('should return git logs when includeLogs is enabled', async () => {
      const mockLogContent = `${GIT_LOG_RECORD_SEPARATOR}2024-01-01 10:00:00 +0900|Initial commit
file1.txt
file2.txt
${GIT_LOG_RECORD_SEPARATOR}2024-01-02 11:00:00 +0900|Add feature
src/feature.ts`;

      const mockGetGitLog = vi.fn().mockResolvedValue(mockLogContent);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
            includeLogsCount: 25,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project/src'], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      expect(result).toEqual({
        logCommits: [
          {
            date: '2024-01-01 10:00:00 +0900',
            message: 'Initial commit',
            files: ['file1.txt', 'file2.txt'],
          },
          {
            date: '2024-01-02 11:00:00 +0900',
            message: 'Add feature',
            files: ['src/feature.ts'],
          },
        ],
      });
      expect(mockGetGitLog).toHaveBeenCalledWith('/project/src', 25);
    });

    test('should return undefined when includeLogs is disabled', async () => {
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: false,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project/src'], config);

      expect(result).toBeUndefined();
    });

    test('should use default commit count when includeLogsCount is not specified', async () => {
      const mockGetGitLog = vi.fn().mockResolvedValue(`${GIT_LOG_RECORD_SEPARATOR}2024-01-01 10:00:00 +0900|Test commit
test.txt`);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs(['/project/src'], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      expect(mockGetGitLog).toHaveBeenCalledWith('/project/src', 50);
    });

    test('should use first directory as git root', async () => {
      const mockGetGitLog = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/fallback',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs(['/first/dir', '/second/dir'], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      expect(mockGetGitLog).toHaveBeenCalledWith('/first/dir', 50);
    });

    test('should fallback to config.cwd when no directories provided', async () => {
      const mockGetGitLog = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/fallback',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs([], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      expect(mockGetGitLog).toHaveBeenCalledWith('/fallback', 50);
    });

    test('should throw RepomixError when getGitLog fails', async () => {
      const mockError = new Error('git failed');
      const mockGetGitLog = vi.fn().mockRejectedValue(mockError);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await expect(
        getGitLogs(['/project'], config, {
          getGitLog: mockGetGitLog,
          isGitRepository: vi.fn().mockResolvedValue(true),
          getCommitGraph: vi.fn(),
          getCommitPatch: vi.fn(),
        }),
      ).rejects.toThrow(RepomixError);
      await expect(
        getGitLogs(['/project'], config, {
          getGitLog: mockGetGitLog,
          isGitRepository: vi.fn().mockResolvedValue(true),
          getCommitGraph: vi.fn(),
          getCommitPatch: vi.fn(),
        }),
      ).rejects.toThrow('Failed to get git logs: git failed');
    });

    test('should handle empty git log output', async () => {
      const mockGetGitLog = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      expect(result).toEqual({
        logCommits: [],
      });
    });

    test('should parse git log correctly with malformed separator content', async () => {
      // Test behavior when log content doesn't match expected separator
      const malformedLogContent = 'random content without separator';

      const mockGetGitLog = vi.fn().mockResolvedValue(malformedLogContent);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      // Should return empty logCommits array when content cannot be parsed properly
      expect(result?.logCommits).toEqual([]);
    });

    test('should handle Windows line endings (CRLF) correctly', async () => {
      // Test with Windows-style line endings (\r\n)
      const mockLogContent = `${GIT_LOG_RECORD_SEPARATOR}2024-01-01 10:00:00 +0900|Windows commit\r\nfile1.txt\r\nfile2.txt`;

      const mockGetGitLog = vi.fn().mockResolvedValue(mockLogContent);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      expect(result?.logCommits).toEqual([
        {
          date: '2024-01-01 10:00:00 +0900',
          message: 'Windows commit',
          files: ['file1.txt', 'file2.txt'],
        },
      ]);
    });

    test('should handle mixed line endings correctly', async () => {
      // Test with mixed Unix (\n) and Windows (\r\n) line endings
      const mockLogContent = `${GIT_LOG_RECORD_SEPARATOR}2024-01-01 10:00:00 +0900|Mixed line endings\nfile1.txt\r\nfile2.txt`;

      const mockGetGitLog = vi.fn().mockResolvedValue(mockLogContent);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        getGitLog: mockGetGitLog,
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      });

      expect(result?.logCommits).toEqual([
        {
          date: '2024-01-01 10:00:00 +0900',
          message: 'Mixed line endings',
          files: ['file1.txt', 'file2.txt'],
        },
      ]);
    });
  });
});
