import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateGitDiffMetrics } from '../../../src/core/metrics/calculateGitDiffMetrics.js';
import { countTokens, type TokenCountTask } from '../../../src/core/metrics/workers/calculateMetricsWorker.js';
import { logger } from '../../../src/shared/logger.js';
import type { TaskRunner, WorkerOptions } from '../../../src/shared/processConcurrency.js';

vi.mock('../../../src/shared/logger');

const mockInitTaskRunner = (_options: WorkerOptions): TaskRunner<TokenCountTask, number> => {
  return {
    run: async (task: TokenCountTask) => {
      return await countTokens(task);
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
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

  const mockTaskRunner = mockInitTaskRunner({
    numOfTasks: 1,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
  });

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
        taskRunner: mockTaskRunner,
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
        taskRunner: mockTaskRunner,
      });

      expect(result).toBe(0);
    });
  });

  describe('when git diff result is unavailable', () => {
    it('should return 0 when gitDiffResult is undefined', async () => {
      const result = await calculateGitDiffMetrics(mockConfig, undefined, {
        taskRunner: mockTaskRunner,
      });

      expect(result).toBe(0);
    });

    it('should return 0 when both diff contents are empty', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: '',
        stagedDiffContent: '',
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result).toBe(0);
    });

    it('should return 0 when both diff contents are undefined', async () => {
      const gitDiffResult = {
        workTreeDiffContent: undefined as unknown as string,
        stagedDiffContent: undefined as unknown as string,
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        taskRunner: mockTaskRunner,
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

      const mockTaskRunnerSpy = vi
        .fn()
        .mockResolvedValueOnce(5) // workTree tokens
        .mockResolvedValueOnce(3); // staged tokens

      const customTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: mockTaskRunnerSpy,
        cleanup: async () => {},
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        taskRunner: customTaskRunner,
      });

      expect(mockTaskRunnerSpy).toHaveBeenCalledTimes(2);
      expect(mockTaskRunnerSpy).toHaveBeenCalledWith({
        content: 'work tree changes',
        encoding: 'o200k_base',
      });
      expect(mockTaskRunnerSpy).toHaveBeenCalledWith({
        content: 'staged changes',
        encoding: 'o200k_base',
      });
      expect(result).toBe(8); // 5 + 3
    });

    it('should calculate tokens for workTree diff only', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'work tree changes only',
        stagedDiffContent: '',
      };

      const mockTaskRunnerSpy = vi.fn().mockResolvedValueOnce(7);

      const customTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: mockTaskRunnerSpy,
        cleanup: async () => {},
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        taskRunner: customTaskRunner,
      });

      expect(mockTaskRunnerSpy).toHaveBeenCalledTimes(1);
      expect(mockTaskRunnerSpy).toHaveBeenCalledWith({
        content: 'work tree changes only',
        encoding: 'o200k_base',
      });
      expect(result).toBe(7);
    });

    it('should calculate tokens for staged diff only', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: '',
        stagedDiffContent: 'staged changes only',
      };

      const mockTaskRunnerSpy = vi.fn().mockResolvedValueOnce(4);

      const customTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: mockTaskRunnerSpy,
        cleanup: async () => {},
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        taskRunner: customTaskRunner,
      });

      expect(mockTaskRunnerSpy).toHaveBeenCalledTimes(1);
      expect(mockTaskRunnerSpy).toHaveBeenCalledWith({
        content: 'staged changes only',
        encoding: 'o200k_base',
      });
      expect(result).toBe(4);
    });

    it('should handle large diff content correctly', async () => {
      const largeDiffContent = 'a'.repeat(10000);
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: largeDiffContent,
        stagedDiffContent: largeDiffContent,
      };

      const result = await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        taskRunner: mockTaskRunner,
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

      const errorTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: vi.fn().mockRejectedValue(new Error('Task runner failed')),
        cleanup: async () => {},
      };

      await expect(
        calculateGitDiffMetrics(mockConfig, gitDiffResult, {
          taskRunner: errorTaskRunner,
        }),
      ).rejects.toThrow('Task runner failed');

      expect(logger.error).toHaveBeenCalledWith('Error during git diff token calculation:', expect.any(Error));
    });

    it('should handle partial task runner failures', async () => {
      const gitDiffResult: GitDiffResult = {
        workTreeDiffContent: 'work tree content',
        stagedDiffContent: 'staged content',
      };

      const errorTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: vi
          .fn()
          .mockResolvedValueOnce(5) // First call succeeds
          .mockRejectedValueOnce(new Error('Second call fails')), // Second call fails
        cleanup: async () => {},
      };

      await expect(
        calculateGitDiffMetrics(mockConfig, gitDiffResult, {
          taskRunner: errorTaskRunner,
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

      await calculateGitDiffMetrics(mockConfig, gitDiffResult, {
        taskRunner: mockTaskRunner,
      });

      expect(logger.trace).toHaveBeenCalledWith('Starting git diff token calculation using worker');
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

      const mockTaskRunnerSpy = vi.fn().mockResolvedValueOnce(10);

      const customTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: mockTaskRunnerSpy,
        cleanup: async () => {},
      };

      await calculateGitDiffMetrics(configWithDifferentEncoding, gitDiffResult, {
        taskRunner: customTaskRunner,
      });

      expect(mockTaskRunnerSpy).toHaveBeenCalledWith({
        content: 'test content',
        encoding: 'cl100k_base',
      });
    });
  });
});
