import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { GitLogResult } from '../../../src/core/git/gitLogHandle.js';
import { calculateGitLogMetrics } from '../../../src/core/metrics/calculateGitLogMetrics.js';
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
        commitRange: 'HEAD~50..HEAD',
        commitPatchDetail: 'stat' as const,
        includeCommitGraph: true,
        includeSummary: false,
        includeGitTags: true,
        includeCommitPatches: true,
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

  const mockTaskRunner = mockInitTaskRunner({ numOfTasks: 1, workerPath: '', runtime: 'worker_threads' });

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
        logCommits: [{ date: '2025-11-20', message: 'test', files: ['file.ts'] }],
      };

      const result = await calculateGitLogMetrics(configWithDisabledLogs, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

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
        logCommits: [{ date: '2025-11-20', message: 'test', files: ['file.ts'] }],
      };

      const result = await calculateGitLogMetrics(configWithoutGit, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });
  });

  describe('when git log result is unavailable', () => {
    it('should return 0 when gitLogResult is undefined', async () => {
      const result = await calculateGitLogMetrics(mockConfig, undefined, {
        taskRunner: mockTaskRunner,
      });

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });

    it('should return 0 when logContent is empty', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });

    it('should return 0 when logContent is undefined', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result).toEqual({ gitLogTokenCount: 0 });
    });
  });

  describe('when processing git logs', () => {
    it('should calculate tokens for git log content', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: '2023-01-01',
            message: 'Test commit message',
            files: ['file.ts'],
          },
        ],
      };

      const mockTaskRunnerSpy = vi.fn().mockResolvedValueOnce(15);

      const customTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: mockTaskRunnerSpy,
        cleanup: async () => {},
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: customTaskRunner,
      });

      expect(mockTaskRunnerSpy).toHaveBeenCalledTimes(1);
      expect(mockTaskRunnerSpy).toHaveBeenCalledWith({
        content: JSON.stringify(gitLogResult.logCommits),
        encoding: 'o200k_base',
      });
      expect(result).toEqual({ gitLogTokenCount: 15 });
    });

    it('should handle large log content correctly', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: Array.from({ length: 1000 }, (_, i) => ({
          date: '2023-01-01',
          message: `Commit ${i}`,
          files: ['file.ts'],
        })),
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result.gitLogTokenCount).toBeGreaterThan(0);
      expect(typeof result.gitLogTokenCount).toBe('number');
    });

    it('should handle complex git log with multiple commits', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: 'Mon Jan 1 12:00:00 2023 +0000',
            message: 'Add new feature for user authentication',
            files: ['src/auth.ts', 'src/oauth.ts'],
            author: { name: 'John Doe', email: 'john@example.com', date: '2023-01-01' },
            body: '- Implemented OAuth2 integration\n- Added user session management\n- Updated security middleware',
          },
          {
            date: 'Sun Dec 31 18:30:00 2022 +0000',
            message: 'Fix critical bug in payment processing',
            files: ['src/payment.ts'],
            author: { name: 'Jane Smith', email: 'jane@example.com', date: '2022-12-31' },
            body: '- Resolved transaction timeout issue\n- Added proper error handling\n- Improved logging for debugging',
          },
        ],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result.gitLogTokenCount).toBeGreaterThan(0);
      expect(typeof result.gitLogTokenCount).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should return 0 when task runner fails', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [{ date: '2023-01-01', message: 'test', files: ['file.ts'] }],
      };

      const errorTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: vi.fn().mockRejectedValue(new Error('Task runner failed')),
        cleanup: async () => {},
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: errorTaskRunner,
      });

      expect(result).toEqual({ gitLogTokenCount: 0 });
      expect(logger.error).toHaveBeenCalledWith('Failed to calculate git log metrics:', expect.any(Error));
    });

    it('should handle network timeout errors gracefully', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [{ date: '2023-01-01', message: 'test', files: ['file.ts'] }],
      };

      const timeoutError = new Error('Request timeout');
      const errorTaskRunner = {
        run: vi.fn().mockRejectedValue(timeoutError),
        cleanup: async () => {},
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: errorTaskRunner,
      });

      expect(result).toEqual({ gitLogTokenCount: 0 });
      expect(logger.error).toHaveBeenCalledWith('Failed to calculate git log metrics:', timeoutError);
    });
  });

  describe('logging', () => {
    it('should log trace messages for successful calculation', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [{ date: '2023-01-01', message: 'test', files: ['file.ts'] }],
      };

      await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(logger.trace).toHaveBeenCalledWith('Starting git log token calculation using worker');
      expect(logger.trace).toHaveBeenCalledWith(
        expect.stringMatching(/Git log token calculation completed in \d+\.\d+ms/),
      );
    });

    it('should not log completion message on error', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [{ date: '2023-01-01', message: 'test', files: ['file.ts'] }],
      };

      const errorTaskRunner = {
        run: vi.fn().mockRejectedValue(new Error('Test error')),
        cleanup: async () => {},
      };

      await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: errorTaskRunner,
      });

      expect(logger.trace).toHaveBeenCalledWith('Starting git log token calculation using worker');
      expect(logger.trace).not.toHaveBeenCalledWith(expect.stringMatching(/Git log token calculation completed/));
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

      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: '2023-01-01',
            message: 'test log content',
            files: ['test.ts'],
          },
        ],
      };

      const mockTaskRunnerSpy = vi.fn().mockResolvedValueOnce(10);

      const customTaskRunner: TaskRunner<TokenCountTask, number> = {
        run: mockTaskRunnerSpy,
        cleanup: async () => {},
      };

      await calculateGitLogMetrics(configWithDifferentEncoding, gitLogResult, {
        taskRunner: customTaskRunner,
      });

      expect(mockTaskRunnerSpy).toHaveBeenCalledWith({
        content: JSON.stringify(gitLogResult.logCommits),
        encoding: 'cl100k_base',
      });
    });
  });

  describe('return value structure', () => {
    it('should always return an object with gitLogTokenCount property', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: '2023-01-01',
            message: 'test content',
            files: ['test.ts'],
          },
        ],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result).toHaveProperty('gitLogTokenCount');
      expect(typeof result.gitLogTokenCount).toBe('number');
    });

    it('should return consistent structure on error', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: '2023-01-01',
            message: 'test content',
            files: ['test.ts'],
          },
        ],
      };

      const errorTaskRunner = {
        run: vi.fn().mockRejectedValue(new Error('Test error')),
        cleanup: async () => {},
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: errorTaskRunner,
      });

      expect(result).toEqual({ gitLogTokenCount: 0 });
      expect(Object.keys(result)).toEqual(['gitLogTokenCount']);
    });
  });

  describe('edge cases', () => {
    it('should handle very short log content', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: '2023-01-01',
            message: 'a',
            files: [],
          },
        ],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result.gitLogTokenCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle log content with special characters', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: '2023-01-01',
            message: 'commit 🚀 emoji test\n\n日本語のコミットメッセージ\n\nSpecial chars: ñáéíóú',
            files: [],
          },
        ],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result.gitLogTokenCount).toBeGreaterThan(0);
      expect(typeof result.gitLogTokenCount).toBe('number');
    });

    it('should handle log content with only whitespace', async () => {
      const gitLogResult: GitLogResult = {
        logCommits: [
          {
            date: '2023-01-01',
            message: '   \n\t  \r\n   ',
            files: [],
          },
        ],
      };

      const result = await calculateGitLogMetrics(mockConfig, gitLogResult, {
        taskRunner: mockTaskRunner,
      });

      expect(result.gitLogTokenCount).toBeGreaterThanOrEqual(0);
    });
  });
});
