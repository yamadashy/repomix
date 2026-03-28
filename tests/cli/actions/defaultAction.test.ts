import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { buildCliConfig, runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import { Spinner } from '../../../src/cli/cliSpinner.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as fileStdin from '../../../src/core/file/fileStdin.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import * as packager from '../../../src/core/packager.js';

import * as processConcurrency from '../../../src/shared/processConcurrency.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/core/file/packageJsonParse');
vi.mock('../../../src/core/file/fileStdin');
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/shared/processConcurrency');

const { mockSpinnerFns, MockSpinnerClass } = vi.hoisted(() => {
  const mockSpinnerFns = {
    start: vi.fn(),
    update: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    stop: vi.fn(),
  };

  // biome-ignore lint/complexity/noStaticOnlyClass: Mock class for testing
  const MockSpinnerClass = class {
    start = mockSpinnerFns.start;
    update = mockSpinnerFns.update;
    succeed = mockSpinnerFns.succeed;
    fail = mockSpinnerFns.fail;
    stop = mockSpinnerFns.stop;
    private message = 'test';
    private currentFrame = 0;
    private interval = null;
    private isQuiet = false;
  };

  return { mockSpinnerFns, MockSpinnerClass };
});

vi.mock('../../../src/cli/cliSpinner', () => ({
  // biome-ignore lint/suspicious/noExplicitAny: Mock class for test constructor
  Spinner: vi.fn().mockImplementation(MockSpinnerClass as any),
}));
vi.mock('../../../src/cli/cliReport');

describe('defaultAction', () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset mockSpinner functions
    vi.clearAllMocks();

    // Default to non-TTY to avoid Spinner creation in most tests.
    // Individual tests can override this to test spinner behavior.
    originalIsTTY = process.stderr.isTTY;
    Object.defineProperty(process.stderr, 'isTTY', { value: false, writable: true, configurable: true });

    // Re-apply Spinner mock after resetAllMocks clears it
    // biome-ignore lint/suspicious/noExplicitAny: Mock class for test constructor
    vi.mocked(Spinner).mockImplementation(MockSpinnerClass as any);

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
      outputLineCount: 0,
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
          outputLineCount: 0,
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
    // Restore original isTTY value
    Object.defineProperty(process.stderr, 'isTTY', { value: originalIsTTY, writable: true, configurable: true });
  });

  it('should run the default command successfully via direct execution', async () => {
    const options: CliOptions = {
      output: 'custom-output.txt',
      verbose: true,
    };

    await runDefaultAction(['.'], process.cwd(), options);

    // TTY mode now uses direct execution (no child process) for non-quiet mode
    expect(processConcurrency.initTaskRunner).not.toHaveBeenCalled();
    expect(packager.pack).toHaveBeenCalled();
  });

  it('should show spinner on main thread in TTY mode', async () => {
    // Enable TTY for this test
    Object.defineProperty(process.stderr, 'isTTY', { value: true, writable: true, configurable: true });

    const options: CliOptions = {};

    await runDefaultAction(['.'], process.cwd(), options);

    // Direct execution with spinner (not child process)
    expect(processConcurrency.initTaskRunner).not.toHaveBeenCalled();
    expect(packager.pack).toHaveBeenCalled();
    // Spinner was created and used
    expect(Spinner).toHaveBeenCalledWith('Initializing...', options);
    expect(mockSpinnerFns.start).toHaveBeenCalled();
    expect(mockSpinnerFns.succeed).toHaveBeenCalledWith('Packing completed successfully!');
  });

  it('should use child process in quiet mode', async () => {
    const options: CliOptions = {
      quiet: true,
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(processConcurrency.initTaskRunner).toHaveBeenCalledWith({
      numOfTasks: 1,
      workerType: 'defaultAction',
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

    // Direct execution path: pack() is called directly with merged config
    expect(packager.pack).toHaveBeenCalled();
  });

  it('should handle stdin mode', async () => {
    const options: CliOptions = {
      stdin: true,
    };

    await runDefaultAction(['.'], process.cwd(), options);

    // Direct execution path: pack() receives explicit file paths from stdin
    // preStartedGitLsFilesPromise is undefined for stdin mode (no speculative pre-start)
    expect(packager.pack).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      expect.any(Function),
      expect.any(Object),
      expect.arrayContaining(['test1.txt', 'test2.txt']),
      expect.any(Object),
      undefined,
    );
  });

  it('should handle errors gracefully', async () => {
    // Mock pack() to reject
    vi.mocked(packager.pack).mockRejectedValue(new Error('Test error'));

    const options: CliOptions = {};

    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow('Test error');
  });

  it('should handle errors gracefully in child process mode', async () => {
    // Create a fresh mock task runner that will fail
    const failingTaskRunner = {
      run: vi.fn().mockRejectedValue(new Error('Test error')),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(processConcurrency.initTaskRunner).mockReturnValue(failingTaskRunner);

    const options: CliOptions = { quiet: true };

    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow('Test error');
    expect(failingTaskRunner.cleanup).toHaveBeenCalled();
  });

  describe('buildCliConfig', () => {
    it('should handle custom include patterns', async () => {
      const options = {
        include: '*.js,*.ts',
      };
      const config = await buildCliConfig(options);

      expect(config.include).toEqual(['*.js', '*.ts']);
    });

    it('should handle custom ignore patterns', async () => {
      const options = {
        ignore: 'node_modules,*.log',
      };
      const config = await buildCliConfig(options);

      expect(config.ignore?.customPatterns).toEqual(['node_modules', '*.log']);
    });

    it('should handle custom output style', async () => {
      const options: CliOptions = {
        style: 'xml' as const,
      };
      const config = await buildCliConfig(options);

      expect(config.output?.style).toBe('xml');
    });

    it('should properly trim whitespace from comma-separated patterns', async () => {
      const options = {
        include: 'src/**/*,  tests/**/*,   examples/**/*',
        ignore: 'node_modules/**,  dist/**,  coverage/**',
      };
      const config = await buildCliConfig(options);

      expect(config.include).toEqual(['src/**/*', 'tests/**/*', 'examples/**/*']);
      expect(config.ignore?.customPatterns).toEqual(['node_modules/**', 'dist/**', 'coverage/**']);
    });

    it('should handle --no-security-check flag', async () => {
      const options = {
        securityCheck: false,
      };
      const config = await buildCliConfig(options);

      expect(config.security?.enableSecurityCheck).toBe(false);
    });

    it('should handle --no-file-summary flag', async () => {
      const options = {
        fileSummary: false,
      };
      const config = await buildCliConfig(options);

      expect(config.output?.fileSummary).toBe(false);
    });

    it('should handle --remove-comments flag', async () => {
      const options = {
        removeComments: true,
      };
      const config = await buildCliConfig(options);

      expect(config.output?.removeComments).toBe(true);
    });

    it('should handle --no-gitignore flag', async () => {
      const options = {
        gitignore: false,
      };
      const config = await buildCliConfig(options);

      expect(config.ignore?.useGitignore).toBe(false);
    });

    it('should handle --no-dot-ignore flag', async () => {
      const options = {
        dotIgnore: false,
      };
      const config = await buildCliConfig(options);

      expect(config.ignore?.useDotIgnore).toBe(false);
    });

    it('should handle --no-default-patterns flag', async () => {
      const options = {
        defaultPatterns: false,
      };
      const config = await buildCliConfig(options);

      expect(config.ignore?.useDefaultPatterns).toBe(false);
    });

    it('should handle --skill-generate with string name', async () => {
      const options: CliOptions = {
        skillGenerate: 'my-skill',
      };
      const config = await buildCliConfig(options);

      expect(config.skillGenerate).toBe('my-skill');
    });

    it('should handle --skill-generate without name (boolean true)', async () => {
      const options: CliOptions = {
        skillGenerate: true,
      };
      const config = await buildCliConfig(options);

      expect(config.skillGenerate).toBe(true);
    });
  });

  describe('skill-generate validation', () => {
    it('should throw error when --skill-generate is used with --stdout', async () => {
      vi.mocked(configLoader.mergeConfigs).mockReturnValue(
        createMockConfig({
          cwd: process.cwd(),
          skillGenerate: 'my-skill',
          output: {
            stdout: true,
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
            files: true,
          },
        }),
      );

      const options: CliOptions = {
        skillGenerate: 'my-skill',
        stdout: true,
      };

      await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow(
        '--skill-generate cannot be used with --stdout',
      );
    });

    it('should throw error when --skill-generate is used with --copy', async () => {
      vi.mocked(configLoader.mergeConfigs).mockReturnValue(
        createMockConfig({
          cwd: process.cwd(),
          skillGenerate: 'my-skill',
          output: {
            copyToClipboard: true,
            stdout: false,
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
            files: true,
          },
        }),
      );

      const options: CliOptions = {
        skillGenerate: 'my-skill',
        copy: true,
      };

      await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow(
        '--skill-generate cannot be used with --copy',
      );
    });
  });
});
