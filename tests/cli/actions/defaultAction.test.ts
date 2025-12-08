import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { buildCliConfig, runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import { Spinner } from '../../../src/cli/cliSpinner.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as fileStdin from '../../../src/core/file/fileStdin.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import * as packager from '../../../src/core/packager.js';

import { logger } from '../../../src/shared/logger.js';
import * as processConcurrency from '../../../src/shared/processConcurrency.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/core/file/packageJsonParse');
vi.mock('../../../src/core/file/fileStdin');
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/shared/processConcurrency');

const mockSpinner = {
  start: vi.fn() as MockedFunction<() => void>,
  update: vi.fn() as MockedFunction<(message: string) => void>,
  succeed: vi.fn() as MockedFunction<(message: string) => void>,
  fail: vi.fn() as MockedFunction<(message: string) => void>,
  stop: vi.fn() as MockedFunction<() => void>,
  message: 'test',
  currentFrame: 0,
  interval: null,
  isQuiet: false,
} as unknown as Spinner;

vi.mock('../../../src/cli/cliSpinner', () => ({
  Spinner: vi.fn().mockImplementation(() => mockSpinner),
}));
vi.mock('../../../src/cli/cliReport');

describe('defaultAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset mockSpinner functions
    vi.clearAllMocks();

    // Ensure Spinner constructor returns mockSpinner
    vi.mocked(Spinner).mockImplementation(() => mockSpinner);

    vi.mocked(packageJsonParser.getVersion).mockResolvedValue('1.0.0');
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({});
    vi.mocked(configLoader.mergeConfigs).mockReturnValue(
      createMockConfig({
        cwd: process.cwd(),
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: 'output.txt',
          style: 'plain',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          topFilesLength: 5,
          showLineNumbers: false,
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          copyToClipboard: false,
          stdout: false,
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
          },
          files: true,
        },
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        include: [],
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      }),
    );
    vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue({
      filePaths: ['test1.txt', 'test2.txt'],
      emptyDirPaths: [],
    });
    vi.mocked(packager.pack).mockResolvedValue({
      totalFiles: 10,
      totalCharacters: 1000,
      totalTokens: 200,
      fileCharCounts: {},
      fileTokenCounts: {},
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
      suspiciousGitLogResults: [],
      processedFiles: [],
      safeFilePaths: [],
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
      skippedFiles: [],
    });

    // Mock initTaskRunner to return a simple task runner
    const mockTaskRunner = {
      run: vi.fn().mockResolvedValue({
        packResult: {
          totalFiles: 10,
          totalCharacters: 1000,
          totalTokens: 200,
          fileCharCounts: {},
          fileTokenCounts: {},
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles: [],
          safeFilePaths: [],
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          skippedFiles: [],
        },
        config: createMockConfig({
          cwd: process.cwd(),
        }),
      }),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(processConcurrency.initTaskRunner).mockReturnValue(mockTaskRunner);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should log a warning when showBlame is true and incompatible options are enabled', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');

    vi.mocked(configLoader.mergeConfigs).mockReturnValue(
      createMockConfig({
        cwd: process.cwd(),
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: 'output.txt',
          style: 'plain',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          topFilesLength: 5,
          showLineNumbers: false,
          removeComments: true, // Incompatible option
          removeEmptyLines: true, // Incompatible option
          compress: true, // Incompatible option
          copyToClipboard: false,
          stdout: false,
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
            showBlame: true, // Enabled blame
          },
          files: true,
        },
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        include: [],
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      }),
    );

    await runDefaultAction(['.'], process.cwd(), {});

    expect(warnSpy).toHaveBeenCalledWith(
      'Git blame is enabled. The following options will be ignored for files with blame info: compress, removeComments, removeEmptyLines.',
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'This is because git blame modifies the file content structure, making it incompatible with these processing steps.',
    );
  });

  it('should run the default command successfully', async () => {
    const options: CliOptions = {
      output: 'custom-output.txt',
      verbose: true,
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(processConcurrency.initTaskRunner).toHaveBeenCalledWith({
      numOfTasks: 1,
      workerPath: expect.stringContaining('defaultActionWorker.js'),
      runtime: 'child_process',
    });

    const taskRunner = vi.mocked(processConcurrency.initTaskRunner).mock.results[0].value;
    expect(taskRunner.run).toHaveBeenCalled();
    expect(taskRunner.cleanup).toHaveBeenCalled();
  });

  it('should handle custom include patterns', async () => {
    const options: CliOptions = {
      include: '*.js,*.ts',
    };

    await runDefaultAction(['.'], process.cwd(), options);

    const taskRunner = vi.mocked(processConcurrency.initTaskRunner).mock.results[0].value;
    const task = taskRunner.run.mock.calls[0][0];

    expect(task).toMatchObject({
      directories: ['.'],
      cwd: process.cwd(),
      cliOptions: expect.objectContaining({
        include: '*.js,*.ts',
      }),
    });
  });

  it('should handle stdin mode', async () => {
    const options: CliOptions = {
      stdin: true,
    };

    await runDefaultAction(['.'], process.cwd(), options);

    const taskRunner = vi.mocked(processConcurrency.initTaskRunner).mock.results[0].value;
    const task = taskRunner.run.mock.calls[0][0];

    expect(task).toMatchObject({
      directories: ['.'],
      cwd: process.cwd(),
      cliOptions: expect.objectContaining({
        stdin: true,
      }),
      stdinFilePaths: expect.any(Array),
    });
  });

  it('should handle errors gracefully', async () => {
    // Create a fresh mock task runner that will fail
    const failingTaskRunner = {
      run: vi.fn().mockRejectedValue(new Error('Test error')),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(processConcurrency.initTaskRunner).mockReturnValue(failingTaskRunner);

    const options: CliOptions = {};

    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow('Test error');
    expect(failingTaskRunner.cleanup).toHaveBeenCalled();
  });

  describe('buildCliConfig', () => {
    it('should handle custom include patterns', () => {
      const options = {
        include: '*.js,*.ts',
      };
      const config = buildCliConfig(options);

      expect(config.include).toEqual(['*.js', '*.ts']);
    });

    it('should handle custom ignore patterns', () => {
      const options = {
        ignore: 'node_modules,*.log',
      };
      const config = buildCliConfig(options);

      expect(config.ignore?.customPatterns).toEqual(['node_modules', '*.log']);
    });

    it('should handle custom output style', () => {
      const options: CliOptions = {
        style: 'xml' as const,
      };
      const config = buildCliConfig(options);

      expect(config.output?.style).toBe('xml');
    });

    it('should properly trim whitespace from comma-separated patterns', () => {
      const options = {
        include: 'src/**/*,  tests/**/*,   examples/**/*',
        ignore: 'node_modules/**,  dist/**,  coverage/**',
      };
      const config = buildCliConfig(options);

      expect(config.include).toEqual(['src/**/*', 'tests/**/*', 'examples/**/*']);
      expect(config.ignore?.customPatterns).toEqual(['node_modules/**', 'dist/**', 'coverage/**']);
    });

    it('should handle --no-security-check flag', () => {
      const options = {
        securityCheck: false,
      };
      const config = buildCliConfig(options);

      expect(config.security?.enableSecurityCheck).toBe(false);
    });

    it('should handle --no-file-summary flag', () => {
      const options = {
        fileSummary: false,
      };
      const config = buildCliConfig(options);

      expect(config.output?.fileSummary).toBe(false);
    });

    it('should handle --remove-comments flag', () => {
      const options = {
        removeComments: true,
      };
      const config = buildCliConfig(options);

      expect(config.output?.removeComments).toBe(true);
    });

    it('should handle --no-gitignore flag', () => {
      const options = {
        gitignore: false,
      };
      const config = buildCliConfig(options);

      expect(config.ignore?.useGitignore).toBe(false);
    });

    it('should handle --no-dot-ignore flag', () => {
      const options = {
        dotIgnore: false,
      };
      const config = buildCliConfig(options);

      expect(config.ignore?.useDotIgnore).toBe(false);
    });

    it('should handle --no-default-patterns flag', () => {
      const options = {
        defaultPatterns: false,
      };
      const config = buildCliConfig(options);

      expect(config.ignore?.useDefaultPatterns).toBe(false);
    });

    it('should set showBlame to true when outputShowGitBlame option is provided', () => {
      const options = {
        outputShowGitBlame: true,
      };
      const config = buildCliConfig(options);
      expect(config.output?.git?.showBlame).toBe(true);
    });
  });
});
