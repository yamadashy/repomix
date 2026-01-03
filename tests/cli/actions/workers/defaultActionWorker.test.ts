import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import defaultActionWorker, {
  type DefaultActionTask,
  type DefaultActionWorkerResult,
  type PingResult,
  type PingTask,
} from '../../../../src/cli/actions/workers/defaultActionWorker.js';
import type { CliOptions } from '../../../../src/cli/types.js';
import type { RepomixConfigMerged } from '../../../../src/config/configSchema.js';
import { pack } from '../../../../src/core/packager.js';

// Mock dependencies
vi.mock('../../../../src/core/packager.js');
vi.mock('../../../../src/shared/logger.js', () => ({
  logger: {
    trace: vi.fn(),
  },
  setLogLevelByWorkerData: vi.fn(),
}));

// Use vi.hoisted to ensure mock is available in vi.mock factory
const { MockSpinner, getLastSpinnerInstance } = vi.hoisted(() => {
  let lastInstance: ReturnType<typeof createMockSpinnerInstance> | null = null;

  const createMockSpinnerInstance = () => ({
    start: vi.fn(),
    update: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  });

  // Create a class that can be used with 'new'
  class MockSpinner {
    start: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    succeed: ReturnType<typeof vi.fn>;
    fail: ReturnType<typeof vi.fn>;

    constructor() {
      const instance = createMockSpinnerInstance();
      this.start = instance.start;
      this.update = instance.update;
      this.succeed = instance.succeed;
      this.fail = instance.fail;
      lastInstance = instance;
    }
  }

  const getLastSpinnerInstance = () => lastInstance;

  return { MockSpinner, getLastSpinnerInstance };
});

vi.mock('../../../../src/cli/cliSpinner.js', () => ({
  Spinner: MockSpinner,
}));

const mockPack = vi.mocked(pack);

describe('defaultActionWorker', () => {
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

  const mockCliOptions: CliOptions = {
    verbose: false,
    output: 'test-output.txt',
    include: undefined,
    ignore: undefined,
    'ignore-file': undefined,
    config: undefined,
    style: 'xml',
    'output-show-line-numbers': false,
    'remove-comments': false,
    'remove-empty-lines': false,
    'copy-to-clipboard': false,
    'include-empty-directories': false,
    'git-log-output': false,
    'git-log-author': undefined,
    'git-log-after': undefined,
    'git-log-before': undefined,
    'git-log-max-count': undefined,
    'git-diff': false,
    stdin: false,
    'top-files-length': 10,
    version: false,
    init: false,
    remote: undefined,
    'process-concurrency': 8,
    'token-count-tree': false,
    'no-progress': false,
  };

  const mockPackResult = {
    totalFiles: 1,
    totalCharacters: 12,
    totalTokens: 3,
    fileCharCounts: { 'test.txt': 12 },
    fileTokenCounts: { 'test.txt': 3 },
    gitDiffTokenCount: 0,
    gitLogTokenCount: 0,
    suspiciousFilesResults: [],
    suspiciousGitDiffResults: [],
    suspiciousGitLogResults: [],
    processedFiles: [{ path: 'test.txt', content: 'test content' }],
    safeFilePaths: ['test.txt'],
    skippedFiles: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ping functionality', () => {
    it('should handle ping requests correctly', async () => {
      const pingTask: PingTask = {
        ping: true,
      };

      const result = (await defaultActionWorker(pingTask)) as PingResult;

      expect(result).toEqual({
        ping: true,
      });
    });
  });

  describe('directory processing', () => {
    it('should process directories successfully', async () => {
      const task: DefaultActionTask = {
        directories: ['src', 'tests'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      mockPack.mockResolvedValueOnce(mockPackResult);

      const result = (await defaultActionWorker(task)) as DefaultActionWorkerResult;

      expect(mockPack).toHaveBeenCalledWith(
        [path.resolve('/test/project', 'src'), path.resolve('/test/project', 'tests')],
        mockConfig,
        expect.any(Function),
        {},
        undefined,
        {},
      );
      expect(result).toEqual({
        packResult: mockPackResult,
        config: mockConfig,
      });
    });

    it('should handle single directory', async () => {
      const task: DefaultActionTask = {
        directories: ['.'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      mockPack.mockResolvedValueOnce(mockPackResult);

      const result = (await defaultActionWorker(task)) as DefaultActionWorkerResult;

      expect(mockPack).toHaveBeenCalledWith(
        [path.resolve('/test/project', '.')],
        mockConfig,
        expect.any(Function),
        {},
        undefined,
        {},
      );
      expect(result).toEqual({
        packResult: mockPackResult,
        config: mockConfig,
      });
    });

    it('should handle empty directories array', async () => {
      const task: DefaultActionTask = {
        directories: [],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      mockPack.mockResolvedValueOnce(mockPackResult);

      await defaultActionWorker(task);

      expect(mockPack).toHaveBeenCalledWith([], mockConfig, expect.any(Function), {}, undefined, {});
    });
  });

  describe('stdin processing', () => {
    it('should process stdin successfully with file paths from main process', async () => {
      const task: DefaultActionTask = {
        directories: ['.'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
        stdinFilePaths: ['file1.txt', 'file2.txt'],
      };

      mockPack.mockResolvedValueOnce(mockPackResult);

      const result = (await defaultActionWorker(task)) as DefaultActionWorkerResult;

      expect(mockPack).toHaveBeenCalledWith(
        ['/test/project'],
        mockConfig,
        expect.any(Function),
        {},
        ['file1.txt', 'file2.txt'],
        {},
      );
      expect(result).toEqual({
        packResult: mockPackResult,
        config: mockConfig,
      });
    });

    it('should handle empty directories for stdin', async () => {
      const task: DefaultActionTask = {
        directories: [],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
        stdinFilePaths: ['file1.txt'],
      };

      mockPack.mockResolvedValueOnce(mockPackResult);

      await defaultActionWorker(task);

      expect(mockPack).toHaveBeenCalledWith(['/test/project'], mockConfig, expect.any(Function), {}, ['file1.txt'], {});
    });
  });

  describe('error handling', () => {
    it('should handle pack errors for directory processing', async () => {
      const task: DefaultActionTask = {
        directories: ['src'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      const packError = new Error('Pack failed');
      mockPack.mockRejectedValueOnce(packError);

      await expect(defaultActionWorker(task)).rejects.toThrow('Pack failed');
    });

    it('should handle pack errors during stdin processing', async () => {
      const task: DefaultActionTask = {
        directories: ['.'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
        stdinFilePaths: ['file1.txt'],
      };

      const packError = new Error('Pack failed during stdin');
      mockPack.mockRejectedValueOnce(packError);

      await expect(defaultActionWorker(task)).rejects.toThrow('Pack failed during stdin');
    });
  });

  describe('spinner integration', () => {
    it('should update spinner with progress messages', async () => {
      const task: DefaultActionTask = {
        directories: ['src'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      mockPack.mockImplementationOnce(async (_paths, _config, progressCallback) => {
        if (progressCallback) {
          progressCallback('Processing files...');
          progressCallback('Calculating metrics...');
        }
        return mockPackResult;
      });

      await defaultActionWorker(task);

      // Get the last spinner instance that was created
      const mockSpinner = getLastSpinnerInstance();

      expect(mockSpinner?.start).toHaveBeenCalled();
      expect(mockSpinner?.update).toHaveBeenCalledWith('Processing files...');
      expect(mockSpinner?.update).toHaveBeenCalledWith('Calculating metrics...');
      expect(mockSpinner?.succeed).toHaveBeenCalledWith('Packing completed successfully!');
    });

    it('should fail spinner on error', async () => {
      const task: DefaultActionTask = {
        directories: ['src'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      mockPack.mockRejectedValueOnce(new Error('Pack failed'));

      await expect(defaultActionWorker(task)).rejects.toThrow('Pack failed');

      // Get the last spinner instance that was created
      const mockSpinner = getLastSpinnerInstance();

      expect(mockSpinner?.fail).toHaveBeenCalledWith('Error during packing');
    });
  });

  describe('path resolution', () => {
    it('should resolve relative paths correctly', async () => {
      const task: DefaultActionTask = {
        directories: ['../parent', './current', 'child'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      mockPack.mockResolvedValueOnce(mockPackResult);

      await defaultActionWorker(task);

      expect(mockPack).toHaveBeenCalledWith(
        [
          path.resolve('/test/project', '../parent'),
          path.resolve('/test/project', './current'),
          path.resolve('/test/project', 'child'),
        ],
        mockConfig,
        expect.any(Function),
        {},
        undefined,
        {},
      );
    });

    it('should handle absolute paths', async () => {
      const task: DefaultActionTask = {
        directories: ['/absolute/path1', '/absolute/path2'],
        cwd: '/test/project',
        config: mockConfig,
        cliOptions: mockCliOptions,
      };

      mockPack.mockResolvedValueOnce(mockPackResult);

      await defaultActionWorker(task);

      expect(mockPack).toHaveBeenCalledWith(
        [path.resolve('/test/project', '/absolute/path1'), path.resolve('/test/project', '/absolute/path2')],
        mockConfig,
        expect.any(Function),
        {},
        undefined,
        {},
      );
    });
  });
});
