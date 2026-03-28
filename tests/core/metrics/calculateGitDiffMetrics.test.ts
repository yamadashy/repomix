import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateGitDiffMetrics } from '../../../src/core/metrics/calculateGitDiffMetrics.js';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('calculateGitDiffMetrics', () => {
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
        includeDiffs: true,
        includeLogs: false,
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

  describe('when git diffs are disabled', () => {
    it('should return 0 when includeDiffs is false', async () => {
      const configWithDisabledDiffs = {
        ...mockConfig,
        output: { ...mockConfig.output, git: { ...mockConfig.output.git, includeDiffs: false } },
      };

      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'some diff content',
        stagedDiffContent: 'some staged content',
      };

      const result = await calculateGitDiffMetrics(configWithDisabledDiffs, gitDiffResult);
      expect(result).toBe(0);
    });

    it('should return 0 when git config is undefined', async () => {
      const configWithoutGit = {
        ...mockConfig,
        output: { ...mockConfig.output, git: undefined },
      } as RepomixConfigMerged;

      const result = await calculateGitDiffMetrics(configWithoutGit, {
        workTreeDiffContent: 'some diff content',
        stagedDiffContent: 'some staged content',
      });
      expect(result).toBe(0);
    });
  });

  describe('when git diff result is unavailable', () => {
    it('should return 0 when gitDiffResult is undefined', async () => {
      const result = await calculateGitDiffMetrics(mockConfig, undefined);
      expect(result).toBe(0);
    });

    it('should return 0 when both diff contents are empty', async () => {
      const result = await calculateGitDiffMetrics(mockConfig, {
        workTreeDiffContent: '',
        stagedDiffContent: '',
      });
      expect(result).toBe(0);
    });
  });

  describe('when processing git diffs', () => {
    it('should calculate tokens for both workTree and staged diffs', async () => {
      const result = await calculateGitDiffMetrics(
        mockConfig,
        {
          workTreeDiffContent: 'work tree changes',
          stagedDiffContent: 'staged changes',
        },
        { getTokenCounter: mockGetTokenCounter },
      );
      // 'work tree changes' = 3 tokens, 'staged changes' = 3 tokens
      expect(result).toBe(6);
    });

    it('should calculate tokens for workTree diff only', async () => {
      const result = await calculateGitDiffMetrics(
        mockConfig,
        {
          workTreeDiffContent: 'work tree changes only',
          stagedDiffContent: '',
        },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result).toBe(4);
    });

    it('should calculate tokens for staged diff only', async () => {
      const result = await calculateGitDiffMetrics(
        mockConfig,
        {
          workTreeDiffContent: '',
          stagedDiffContent: 'staged changes only',
        },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result).toBe(4);
    });

    it('should handle large diff content correctly', async () => {
      const largeDiffContent = 'a'.repeat(10000);
      const result = await calculateGitDiffMetrics(
        mockConfig,
        {
          workTreeDiffContent: largeDiffContent,
          stagedDiffContent: largeDiffContent,
        },
        { getTokenCounter: mockGetTokenCounter },
      );
      expect(result).toBe(2500);
    });
  });

  describe('error handling', () => {
    it('should throw error when getTokenCounter fails', async () => {
      const mockErrorGetTokenCounter = async () => {
        throw new Error('Token counter failed');
      };

      await expect(
        calculateGitDiffMetrics(
          mockConfig,
          { workTreeDiffContent: 'some content', stagedDiffContent: '' },
          { getTokenCounter: mockErrorGetTokenCounter },
        ),
      ).rejects.toThrow('Token counter failed');

      expect(logger.error).toHaveBeenCalledWith('Error during git diff token calculation:', expect.any(Error));
    });
  });

  describe('logging', () => {
    it('should log trace messages for successful calculation', async () => {
      await calculateGitDiffMetrics(
        mockConfig,
        { workTreeDiffContent: 'test content', stagedDiffContent: '' },
        { getTokenCounter: mockGetTokenCounter },
      );

      expect(logger.trace).toHaveBeenCalledWith('Starting git diff token calculation on main thread');
      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringMatching(/Git diff token calculation completed in \d+\.\d+ms/),
      );
    });
  });
});
