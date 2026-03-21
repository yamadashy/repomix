import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { GitLogResult } from '../../../src/core/git/gitLogHandle.js';
import { calculateGitLogMetrics } from '../../../src/core/metrics/calculateGitLogMetrics.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('calculateGitLogMetrics', () => {
  const mockConfig: RepomixConfigMerged = {
    input: {
      maxFileSize: 50 * 1024 * 1024,
    },
    output: {
      filePath: 'test-output.txt',
      style: 'xml',
      parsableStyle: false,
      headerText: '',
      instructionFilePath: '',
      fileSummary: true,
      directoryStructure: true,
      files: true,
      removeComments: false,
      removeEmptyLines: false,
      compress: false,
      topFilesLength: 10,
      showLineNumbers: false,
      truncateBase64: false,
      copyToClipboard: false,
      includeEmptyDirectories: false,
      includeFullDirectoryStructure: false,
      tokenCountTree: false,
      git: {
        sortByChanges: true,
        sortByChangesMaxCommits: 100,
        includeDiffs: false,
        includeLogs: true,
        includeLogsCount: 50,
      },
    },
    include: ['**/*'],
    ignore: {
      useGitignore: true,
      useDotIgnore: true,
      useDefaultPatterns: true,
      customPatterns: [],
    },
    security: {
      enableSecurityCheck: true,
    },
    tokenCount: {
      encoding: 'o200k_base' as const,
    },
    cwd: '/test/project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when git logs are disabled', () => {
    it('should return 0 when includeLogs is false', async () => {
      const configWithDisabledLogs = {
        ...mockConfig,
        output: {
          ...mockConfig.output,
          git: {
            ...mockConfig.output.git,
            includeLogs: false,
          },
        },
      };

      const gitLogResult: GitLogResult = {
        logContent: 'some log content',
        commits: [],
      };

      const result = await calculateGitLogMetrics(configWithDisabledLogs, gitLogResult);

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });

    it('should return 0 when git config is undefined', async () => {
      const configWithoutGit = {
        ...mockConfig,
        output: {
          ...mockConfig.output,
          git: undefined,
        },
      } as RepomixConfigMerged;

      const gitLogResult: GitLogResult = {
        logContent: 'some log content',
        commits: [],
      };

      const result = await calculateGitLogMetrics(configWithoutGit, gitLogResult);

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });
  });

  describe('when git log result is unavailable', () => {
    it('should return 0 when gitLogResult is undefined', async () => {
      const result = await calculateGitLogMetrics(mockConfig, undefined);

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });

    it('should return 0 when logContent is empty', async () => {
      const gitLogResult: GitLogResult = {
        logContent: '',
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });

    it('should return 0 when logContent is undefined', async () => {
      const gitLogResult = {
        logContent: undefined as unknown as string,
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });
  });

  describe('when processing git logs', () => {
    it('should calculate tokens for git log content', async () => {
      const gitLogResult: GitLogResult = {
        logContent: 'commit abc123\nAuthor: Test User\nDate: 2023-01-01\n\nTest commit message',
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result.gitLogTokenCount).toBeGreaterThan(0);
      expect(typeof result.gitLogTokenCount).toBe('number');
    });

    it('should handle large log content correctly', async () => {
      const largeLogContent = `${'commit '.repeat(1000)}large commit log`;
      const gitLogResult: GitLogResult = {
        logContent: largeLogContent,
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result.gitLogTokenCount).toBeGreaterThan(0);
      expect(typeof result.gitLogTokenCount).toBe('number');
    });

    it('should handle complex git log with multiple commits', async () => {
      const complexLogContent = `commit abc123def456
Author: John Doe <john@example.com>
Date: Mon Jan 1 12:00:00 2023 +0000

    Add new feature for user authentication

commit def456ghi789
Author: Jane Smith <jane@example.com>
Date: Sun Dec 31 18:30:00 2022 +0000

    Fix critical bug in payment processing`;

      const gitLogResult: GitLogResult = {
        logContent: complexLogContent,
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result.gitLogTokenCount).toBeGreaterThan(0);
      expect(typeof result.gitLogTokenCount).toBe('number');
    });
  });

  describe('logging', () => {
    it('should log trace messages for successful calculation', async () => {
      const gitLogResult: GitLogResult = {
        logContent: 'test log content',
        commits: [],
      };

      await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(logger.trace).toHaveBeenCalledWith('Starting git log token calculation on main thread');
      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringMatching(/Git log token calculation completed in \d+\.\d+ms/),
      );
    });
  });

  describe('return value structure', () => {
    it('should always return an object with gitLogTokenCount property', async () => {
      const gitLogResult: GitLogResult = {
        logContent: 'test content',
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result).toHaveProperty('gitLogTokenCount');
      expect(typeof result.gitLogTokenCount).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle very short log content', async () => {
      const gitLogResult: GitLogResult = {
        logContent: 'a',
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result.gitLogTokenCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle log content with special characters', async () => {
      const gitLogResult: GitLogResult = {
        logContent: 'commit test\n\nSpecial chars: ñáéíóú',
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result.gitLogTokenCount).toBeGreaterThan(0);
      expect(typeof result.gitLogTokenCount).toBe('number');
    });

    it('should handle log content with only whitespace', async () => {
      const gitLogResult: GitLogResult = {
        logContent: '   \n\t  \r\n   ',
        commits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult);

      expect(result.gitLogTokenCount).toBeGreaterThanOrEqual(0);
    });
  });
});
