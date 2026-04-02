import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { buildCliConfig, runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import type { Spinner } from '../../../src/cli/cliSpinner.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as fileStdin from '../../../src/core/file/fileStdin.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import * as packager from '../../../src/core/packager.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/core/file/packageJsonParse');
vi.mock('../../../src/core/file/fileStdin');
vi.mock('../../../src/shared/logger');

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

vi.mock('../../../src/cli/cliSpinner', () => {
  const MockSpinner = class {
    start = mockSpinner.start;
    update = mockSpinner.update;
    succeed = mockSpinner.succeed;
    fail = mockSpinner.fail;
  };
  return { Spinner: MockSpinner };
});
vi.mock('../../../src/cli/cliReport');

describe('defaultAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset mockSpinner functions
    vi.clearAllMocks();

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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should run the default command successfully', async () => {
    const options: CliOptions = {
      output: 'custom-output.txt',
      verbose: true,
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(packager.pack).toHaveBeenCalled();
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it('should handle custom include patterns', async () => {
    const options: CliOptions = {
      include: '*.js,*.ts',
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(packager.pack).toHaveBeenCalled();
  });

  it('should handle stdin mode', async () => {
    const options: CliOptions = {
      stdin: true,
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(fileStdin.readFilePathsFromStdin).toHaveBeenCalledWith(process.cwd());
    expect(packager.pack).toHaveBeenCalledWith(
      [process.cwd()],
      expect.any(Object),
      expect.any(Function),
      {},
      ['test1.txt', 'test2.txt'],
      expect.any(Object),
    );
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(packager.pack).mockRejectedValue(new Error('Test error'));

    const options: CliOptions = {};

    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow('Test error');
    expect(mockSpinner.fail).toHaveBeenCalledWith('Error during packing');
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

    it('should handle --skill-generate with string name', () => {
      const options: CliOptions = {
        skillGenerate: 'my-skill',
      };
      const config = buildCliConfig(options);

      expect(config.skillGenerate).toBe('my-skill');
    });

    it('should handle --skill-generate without name (boolean true)', () => {
      const options: CliOptions = {
        skillGenerate: true,
      };
      const config = buildCliConfig(options);

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
