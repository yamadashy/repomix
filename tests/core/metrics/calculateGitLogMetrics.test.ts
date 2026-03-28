import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { calculateGitLogMetrics } from '../../../src/core/metrics/calculateGitLogMetrics.js';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('calculateGitLogMetrics', () => {
  const mockGetTokenCounter = async () => {
    const counter = new TokenCounter('o200k_base');
    await counter.init();
    return counter;
  };

  const mockConfig: RepomixConfigMerged = {
    input: { maxFileSize: 50 * 1024 * 1024 },
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
    security: { enableSecurityCheck: true },
    tokenCount: { encoding: 'o200k_base' as const },
    cwd: '/test/project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when git logs are disabled', () => {
    it('should return 0 when includeLogs is false', async () => {
      const configWithDisabledLogs = {
        ...mockConfig,
        output: { ...mockConfig.output, git: { ...mockConfig.output.git, includeLogs: false } },
      };
      const result = await calculateGitLogMetrics(configWithDisabledLogs, {
        logContent: 'some log content',
        commits: [],
      });
      expect(result).toEqual({ gitLogTokenCount: 0 });
    });

    it('should return 0 when git config is undefined', async () => {
      const configWithoutGit = {
        ...mockConfig,
        output: { ...mockConfig.output, git: undefined },
      } as RepomixConfigMerged;
      const result = await calculateGitLogMetrics(configWithoutGit, {
        logContent: 'some log content',
        commits: [],
      });
      expect(result).toEqual({ gitLogTokenCount: 0 });
    });
  });

  describe('when git log result is unavailable', () => {
    it('should return 0 when gitLogResult is undefined', async () => {
      const result = await calculateGitLogMetrics(mockConfig, undefined);
      expect(result).toEqual({ gitLogTokenCount: 0 });
    });

    it('should return 0 when logContent is empty', async () => {
      const result = await calculateGitLogMetrics(mockConfig, { logContent: '', commits: [] });
      expect(result).toEqual({ gitLogTokenCount: 0 });
    });
  });

  describe('when processing git logs', () => {
    it('should calculate tokens for git log content', async () => {
      const result = await calculateGitLogMetrics(
        mockConfig,
        {
          logContent: 'commit abc123\nAuthor: Test User\nDate: 2023-01-01\n\nTest commit message',
          commits: [],
        },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result.gitLogTokenCount).toBe(22);
    });

    it('should handle large log content correctly', async () => {
      const result = await calculateGitLogMetrics(
        mockConfig,
        {
          logContent: `${'commit '.repeat(1000)}large commit log`,
          commits: [],
        },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result.gitLogTokenCount).toBe(1003);
    });
  });

  describe('error handling', () => {
    it('should return 0 when getTokenCounter fails', async () => {
      const mockErrorGetTokenCounter = async () => {
        throw new Error('Token counter failed');
      };

      const result = await calculateGitLogMetrics(
        mockConfig,
        { logContent: 'some log content', commits: [] },
        { getTokenCounter: mockErrorGetTokenCounter },
      );
      expect(result).toEqual({ gitLogTokenCount: 0 });
      expect(logger.error).toHaveBeenCalledWith('Failed to calculate git log metrics:', expect.any(Error));
    });
  });

  describe('logging', () => {
    it('should log trace messages for successful calculation', async () => {
      await calculateGitLogMetrics(
        mockConfig,
        { logContent: 'test log content', commits: [] },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(logger.trace).toHaveBeenCalledWith('Starting git log token calculation on main thread');
      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringMatching(/Git log token calculation completed in \d+\.\d+ms/),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very short log content', async () => {
      const result = await calculateGitLogMetrics(
        mockConfig,
        { logContent: 'a', commits: [] },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result.gitLogTokenCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle log content with special characters', async () => {
      const result = await calculateGitLogMetrics(
        mockConfig,
        {
          logContent: 'commit 🚀 emoji test\n\n日本語のコミットメッセージ\n\nSpecial chars: ñáéíóú',
          commits: [],
        },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result.gitLogTokenCount).toBeGreaterThan(0);
    });
  });

  describe('return value structure', () => {
    it('should always return an object with gitLogTokenCount property', async () => {
      const result = await calculateGitLogMetrics(
        mockConfig,
        { logContent: 'test content', commits: [] },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result).toHaveProperty('gitLogTokenCount');
      expect(typeof result.gitLogTokenCount).toBe('number');
    });
  });
});
