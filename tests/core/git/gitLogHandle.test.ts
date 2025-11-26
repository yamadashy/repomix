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
      // Mock output from execGitLogComplete with record/field separators
      const RECORD_SEP = '\x1E';
      const FIELD_SEP = '\x1F';
      const NULL_BYTE = '\x00';

      const mockCompleteOutput = `${RECORD_SEP}abc123${FIELD_SEP}abc12${FIELD_SEP}${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Initial commit${FIELD_SEP}${NULL_BYTE}file1.txt
file2.txt${RECORD_SEP}def456${FIELD_SEP}def45${FIELD_SEP}abc123${FIELD_SEP}Author Two${FIELD_SEP}author2@example.com${FIELD_SEP}2024-01-02T11:00:00+09:00${FIELD_SEP}Author Two${FIELD_SEP}author2@example.com${FIELD_SEP}2024-01-02T11:00:00+09:00${FIELD_SEP}Add feature${FIELD_SEP}${NULL_BYTE}src/feature.ts`;

      const mockExecGitLogComplete = vi.fn().mockResolvedValue(mockCompleteOutput);
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
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(result).toEqual({
        logCommits: [
          {
            date: '2024-01-01T10:00:00+09:00',
            message: 'Initial commit',
            files: ['file1.txt', 'file2.txt'],
          },
          {
            date: '2024-01-02T11:00:00+09:00',
            message: 'Add feature',
            files: ['src/feature.ts'],
          },
        ],
        graph: undefined,
        summary: undefined,
      });
      expect(mockExecGitLogComplete).toHaveBeenCalledWith({
        directory: '/project/src',
        range: undefined,
        maxCommits: 25,
        includeGraph: false,
        patchDetail: undefined,
      });
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
      const RECORD_SEP = '\x1E';
      const FIELD_SEP = '\x1F';
      const NULL_BYTE = '\x00';

      const mockCompleteOutput = `${RECORD_SEP}abc123${FIELD_SEP}abc12${FIELD_SEP}${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Test commit${FIELD_SEP}${NULL_BYTE}test.txt`;

      const mockExecGitLogComplete = vi.fn().mockResolvedValue(mockCompleteOutput);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs(['/project/src'], config, {
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitLogComplete).toHaveBeenCalledWith({
        directory: '/project/src',
        range: undefined,
        maxCommits: 50,
        includeGraph: false,
        patchDetail: undefined,
      });
    });

    test('should use first directory as git root', async () => {
      const mockExecGitLogComplete = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/fallback',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs(['/first/dir', '/second/dir'], config, {
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitLogComplete).toHaveBeenCalledWith({
        directory: '/first/dir',
        range: undefined,
        maxCommits: 50,
        includeGraph: false,
        patchDetail: undefined,
      });
    });

    test('should fallback to config.cwd when no directories provided', async () => {
      const mockExecGitLogComplete = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/fallback',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs([], config, {
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitLogComplete).toHaveBeenCalledWith({
        directory: '/fallback',
        range: undefined,
        maxCommits: 50,
        includeGraph: false,
        patchDetail: undefined,
      });
    });

    test('should throw RepomixError when execGitLogComplete fails', async () => {
      const mockError = new Error('git failed');
      const mockExecGitLogComplete = vi.fn().mockRejectedValue(mockError);
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
          execGitLogComplete: mockExecGitLogComplete,
          getTags: vi.fn().mockResolvedValue({}),
          isGitRepository: vi.fn().mockResolvedValue(true),
        }),
      ).rejects.toThrow(RepomixError);
      await expect(
        getGitLogs(['/project'], config, {
          execGitLogComplete: mockExecGitLogComplete,
          getTags: vi.fn().mockResolvedValue({}),
          isGitRepository: vi.fn().mockResolvedValue(true),
        }),
      ).rejects.toThrow('Failed to get git logs: git failed');
    });

    test('should handle empty git log output', async () => {
      const mockExecGitLogComplete = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(result).toEqual({
        logCommits: [],
      });
    });

    test('should parse git log correctly with malformed separator content', async () => {
      // Test behavior when log content doesn't match expected separator format
      const malformedLogContent = 'random content without proper RECORD_SEP or FIELD_SEP';

      const mockExecGitLogComplete = vi.fn().mockResolvedValue(malformedLogContent);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      // Should return empty logCommits array when content cannot be parsed properly
      expect(result?.logCommits).toEqual([]);
    });

    test('should handle Windows line endings (CRLF) correctly', async () => {
      // Test with Windows-style line endings (\r\n) in execGitLogComplete output format
      const RECORD_SEP = '\x1E';
      const FIELD_SEP = '\x1F';
      const NULL_BYTE = '\x00';

      const mockCompleteOutput = `${RECORD_SEP}abc123${FIELD_SEP}abc12${FIELD_SEP}${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Windows commit${FIELD_SEP}${NULL_BYTE}file1.txt\r\nfile2.txt`;

      const mockExecGitLogComplete = vi.fn().mockResolvedValue(mockCompleteOutput);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(result?.logCommits).toEqual([
        {
          date: '2024-01-01T10:00:00+09:00',
          message: 'Windows commit',
          files: ['file1.txt', 'file2.txt'],
        },
      ]);
    });

    test('should handle mixed line endings correctly', async () => {
      // Test with mixed Unix (\n) and Windows (\r\n) line endings in execGitLogComplete output format
      const RECORD_SEP = '\x1E';
      const FIELD_SEP = '\x1F';
      const NULL_BYTE = '\x00';

      const mockCompleteOutput = `${RECORD_SEP}abc123${FIELD_SEP}abc12${FIELD_SEP}${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Author One${FIELD_SEP}author1@example.com${FIELD_SEP}2024-01-01T10:00:00+09:00${FIELD_SEP}Mixed line endings${FIELD_SEP}${NULL_BYTE}file1.txt\nfile2.txt\r\nfile3.txt`;

      const mockExecGitLogComplete = vi.fn().mockResolvedValue(mockCompleteOutput);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogComplete: mockExecGitLogComplete,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(result?.logCommits).toEqual([
        {
          date: '2024-01-01T10:00:00+09:00',
          message: 'Mixed line endings',
          files: ['file1.txt', 'file2.txt', 'file3.txt'],
        },
      ]);
    });
  });
});
