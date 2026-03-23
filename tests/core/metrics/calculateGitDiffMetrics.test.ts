import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateGitDiffMetrics } from '../../../src/core/metrics/calculateGitDiffMetrics.js';
import type { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

const createMockTokenCounter = (countFn?: (...args: unknown[]) => number): TokenCounter => {
  return {
    countTokens: countFn ?? vi.fn().mockReturnValue(10),
    free: vi.fn(),
  } as unknown as TokenCounter;
};

describe('calculateGitDiffMetrics', () => {
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
    security: {
      enableSecurityCheck: true,
    },
    tokenCount: {
      encoding: 'o200k_base' as const,
    },
    cwd: '/test/project',
  };

  const mockTokenCounter = createMockTokenCounter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when git diffs are disabled', () => {
    it('should return 0 when includeDiffs is false', async () => {
      const configWithDisabledDiffs = {
        ...mockConfig,
        output: {
          ...mockConfig.output,
          git: {
            ...mockConfig.output.git,
            includeDiffs: false,
          },
        },
      };

      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'some diff content',
        stagedDiffContent: 'some staged content',
      };

      const result = await calculateGitDiffMetrics(configWithDisabledDiffs, gitDiffResult, {
        tokenCounter: mockTokenCounter,
      });

      expect(result).toBe(0);
    });

    it('should return 0 when git config is undefined', async () => {
      const configWithoutGit = {
        ...mockConfig,
        output: {
          ...mockConfig.output,
          git: undefined,
        },
      } as RepomixConfigMerged;

      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'some diff content',
        stagedDiffContent: 'some staged content',
      };

      const result = await calculateGitDiffMetrics(configWithoutGit, gitDiffResult, {
        tokenCounter: mockTokenCounter,
      });

      expect(result).toBe(0);
    });
  });

  describe('when git diff result is unavailable', () => {
    it('should return 0 when gitDiffResult is undefined', async () => {
      const result = await calculateGitDiffMetrics(mockConfig, undefined, {
        tokenCounter: mockTokenCounter,
      });

      expect(result).toBe(0);
    });

    it('should return 0 when both diff contents are empty', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: '',
        stagedDiffContent: '',
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        tokenCounter: mockTokenCounter,
      });

      expect(result).toBe(0);
    });

    it('should return 0 when both diff contents are undefined', async () => {
      const gitDiffResult = {
        workTreeDiffContent: undefined as unknown as string,
        stagedDiffContent: undefined as unknown as string,
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        tokenCounter: mockTokenCounter,
      });

      expect(result).toBe(0);
    });
  });

  describe('when processing git diffs', () => {
    it('should calculate tokens for both workTree and staged diffs', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'work tree changes',
        stagedDiffContent: 'staged changes',
      };

      const countTokensSpy = vi
        .fn()
        .mockReturnValueOnce(5) // workTree tokens
        .mockReturnValueOnce(3); // staged tokens

      const customTokenCounter = createMockTokenCounter(countTokensSpy);

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        tokenCounter: customTokenCounter,
      });

      expect(countTokensSpy).toHaveBeenCalledTimes(2);
      expect(countTokensSpy).toHaveBeenCalledWith('work tree changes');
      expect(countTokensSpy).toHaveBeenCalledWith('staged changes');
      expect(result).toBe(8); // 5 + 3
    });

    it('should calculate tokens for workTree diff only', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'work tree changes only',
        stagedDiffContent: '',
      };

      const countTokensSpy = vi.fn().mockReturnValueOnce(7);
      const customTokenCounter = createMockTokenCounter(countTokensSpy);

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        tokenCounter: customTokenCounter,
      });

      expect(countTokensSpy).toHaveBeenCalledTimes(1);
      expect(countTokensSpy).toHaveBeenCalledWith('work tree changes only');
      expect(result).toBe(7);
    });

    it('should calculate tokens for staged diff only', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: '',
        stagedDiffContent: 'staged changes only',
      };

      const countTokensSpy = vi.fn().mockReturnValueOnce(4);
      const customTokenCounter = createMockTokenCounter(countTokensSpy);

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        tokenCounter: customTokenCounter,
      });

      expect(countTokensSpy).toHaveBeenCalledTimes(1);
      expect(countTokensSpy).toHaveBeenCalledWith('staged changes only');
      expect(result).toBe(4);
    });

    it('should handle large diff content correctly', async () => {
      const largeDiffContent = 'a'.repeat(10000);
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: largeDiffContent,
        stagedDiffContent: largeDiffContent,
      };

      const countTokensSpy = vi.fn().mockReturnValue(500);
      const customTokenCounter = createMockTokenCounter(countTokensSpy);

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        tokenCounter: customTokenCounter,
      });

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should throw error when task runner fails', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'some content',
        stagedDiffContent: 'some staged content',
      };

      const errorTokenCounter = createMockTokenCounter(() => {
        throw new Error('Task runner failed');
      });

      await expect(
        calculateGitDiffMetrics(mockConfig, gitDiffResult, {
          tokenCounter: errorTokenCounter,
        }),
      ).rejects.toThrow('Task runner failed');

      expect(logger.error).toHaveBeenCalledWith('Error during git diff token calculation:', expect.any(Error));
    });

    it('should handle partial task runner failures', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'work tree content',
        stagedDiffContent: 'staged content',
      };

      let callCount = 0;
      const errorTokenCounter = createMockTokenCounter(() => {
        callCount++;
        if (callCount === 1) return 5;
        throw new Error('Second call fails');
      });

      await expect(
        calculateGitDiffMetrics(mockConfig, gitDiffResult, {
          tokenCounter: errorTokenCounter,
        }),
      ).rejects.toThrow('Second call fails');

      expect(logger.error).toHaveBeenCalledWith('Error during git diff token calculation:', expect.any(Error));
    });
  });

  describe('logging', () => {
    it('should log trace messages for successful calculation', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'test content',
        stagedDiffContent: 'staged content',
      };

      const countTokensSpy = vi.fn().mockReturnValue(10);
      const customTokenCounter = createMockTokenCounter(countTokensSpy);

      await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        tokenCounter: customTokenCounter,
      });

      expect(logger.trace).toHaveBeenCalledWith('Starting git diff token calculation on main thread');
      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringMatching(/Git diff token calculation completed in \d+\.\d+ms/),
      );
    });
  });

  describe('encoding configuration', () => {
    it('should use correct encoding from config', async () => {
      const configWithDifferentEncoding = {
        ...mockConfig,
        tokenCount: {
          encoding: 'cl100k_base' as const,
        },
      };

      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'test content',
        stagedDiffContent: '',
      };

      const countTokensSpy = vi.fn().mockReturnValueOnce(10);
      const customTokenCounter = createMockTokenCounter(countTokensSpy);

      await calculateGitDiffMetrics(configWithDifferentEncoding, gitDiffResult, {
        tokenCounter: customTokenCounter,
      });

      // The tokenCounter.countTokens is called with just the content (encoding is baked into the counter)
      expect(countTokensSpy).toHaveBeenCalledWith('test content');
    });
  });
});
