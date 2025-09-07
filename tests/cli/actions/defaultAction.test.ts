import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';
import { type MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCliConfig,
  handleDirectoryProcessing,
  handleStdinProcessing,
  runDefaultAction,
} from '../../../src/cli/actions/defaultAction.js';
import { Spinner } from '../../../src/cli/cliSpinner.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as fileStdin from '../../../src/core/file/fileStdin.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import * as packager from '../../../src/core/packager.js';
import type { PackResult } from '../../../src/core/packager.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('globby');
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
    // Default globby mock
    vi.mocked(globby).mockResolvedValue([]);
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

    expect(configLoader.loadFileConfig).toHaveBeenCalled();
    expect(configLoader.mergeConfigs).toHaveBeenCalled();
    expect(packager.pack).toHaveBeenCalled();
  });

  it('should handle custom include patterns', async () => {
    const options: CliOptions = {
      include: '*.js,*.ts',
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
      process.cwd(),
      expect.anything(),
      expect.objectContaining({
        include: ['*.js', '*.ts'],
      }),
    );
  });

  it('should handle custom ignore patterns', async () => {
    const options: CliOptions = {
      ignore: 'node_modules,*.log',
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
      process.cwd(),
      expect.anything(),
      expect.objectContaining({
        ignore: {
          customPatterns: ['node_modules', '*.log'],
        },
      }),
    );
  });

  it('should handle ignore-content patterns', async () => {
    const options: CliOptions = {
      ignoreContent: 'components/**,!components/slider/**',
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
      process.cwd(),
      expect.anything(),
      expect.objectContaining({
        ignoreContent: ['components/**', '!components/slider/**'],
      }),
    );
  });

  it('should handle custom output style', async () => {
    const options: CliOptions = {
      style: 'xml',
    };

    await runDefaultAction(['.'], process.cwd(), options);

    expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
      process.cwd(),
      expect.anything(),
      expect.objectContaining({
        output: expect.objectContaining({
          style: 'xml',
        }),
      }),
    );
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(packager.pack).mockRejectedValue(new Error('Test error'));

    const options: CliOptions = {};

    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow('Test error');
  });

  describe('parsableStyle flag', () => {
    it('should handle --parsable-style flag', async () => {
      const options: CliOptions = {
        parsableStyle: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            parsableStyle: true,
          },
        }),
      );
    });

    it('should handle explicit --no-parsable-style flag', async () => {
      const options: CliOptions = {
        parsableStyle: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            parsableStyle: false,
          },
        }),
      );
    });
  });

  describe('stdout flag', () => {
    it('should set stdout to true when --stdout flag is set', async () => {
      const options: CliOptions = {
        stdout: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: expect.objectContaining({
            stdout: true,
          }),
        }),
      );
    });

    it('should handle both --stdout and custom style', async () => {
      const options: CliOptions = {
        stdout: true,
        style: 'markdown',
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: expect.objectContaining({
            stdout: true,
            style: 'markdown',
          }),
        }),
      );
    });
  });

  describe('security check flag', () => {
    it('should handle --no-security-check flag', async () => {
      const options: CliOptions = {
        securityCheck: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          security: {
            enableSecurityCheck: false,
          },
        }),
      );
    });

    it('should handle explicit --security-check flag', async () => {
      const options: CliOptions = {
        securityCheck: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({}),
      );
    });
  });

  describe('gitignore flag', () => {
    it('should handle explicit --no-gitignore flag', async () => {
      const options: CliOptions = {
        gitignore: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          ignore: {
            useGitignore: false,
          },
        }),
      );
    });

    it('should handle explicit --no-gitignore flag', async () => {
      const options: CliOptions = {
        gitignore: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({}),
      );
    });
  });

  describe('defaultPatterns flag', () => {
    it('should handle explicit --no-default-patterns flag', async () => {
      const options: CliOptions = {
        defaultPatterns: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          ignore: {
            useDefaultPatterns: false,
          },
        }),
      );
    });

    it('should handle explicit --no-default-patterns flag', async () => {
      const options: CliOptions = {
        defaultPatterns: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({}),
      );
    });
  });

  describe('fileSummary flag', () => {
    it('should handle --no-file-summary flag', async () => {
      const options: CliOptions = {
        fileSummary: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            fileSummary: false,
          },
        }),
      );
    });

    it('should handle explicit --file-summary flag', async () => {
      const options: CliOptions = {
        fileSummary: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({}),
      );
    });
  });

  describe('directoryStructure flag', () => {
    it('should handle --no-directory-structure flag', async () => {
      const options: CliOptions = {
        directoryStructure: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            directoryStructure: false,
          },
        }),
      );
    });

    it('should handle explicit --directory-structure flag', async () => {
      const options: CliOptions = {
        directoryStructure: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({}),
      );
    });
  });

  describe('removeComments flag', () => {
    it('should handle --remove-comments flag', async () => {
      const options: CliOptions = {
        removeComments: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            removeComments: true,
          },
        }),
      );
    });

    it('should handle explicit --no-remove-comments flag', async () => {
      const options: CliOptions = {
        removeComments: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            removeComments: false,
          },
        }),
      );
    });
  });

  describe('removeEmptyLines flag', () => {
    it('should handle --remove-empty-lines flag', async () => {
      const options: CliOptions = {
        removeEmptyLines: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            removeEmptyLines: true,
          },
        }),
      );
    });

    it('should handle explicit --no-remove-empty-lines flag', async () => {
      const options: CliOptions = {
        removeEmptyLines: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            removeEmptyLines: false,
          },
        }),
      );
    });
  });

  describe('headerText flag', () => {
    it('should handle --header-text flag', async () => {
      const options: CliOptions = {
        headerText: 'Another header text',
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            headerText: 'Another header text',
          },
        }),
      );
    });
  });

  describe('instructionFilePath flag', () => {
    it('should handle --instruction-file-path flag', async () => {
      const options: CliOptions = {
        instructionFilePath: 'path/to/instruction.txt',
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            instructionFilePath: 'path/to/instruction.txt',
          },
        }),
      );
    });
  });

  describe('includeEmptyDirectories flag', () => {
    it('should handle --include-empty-directories flag', async () => {
      const options: CliOptions = {
        includeEmptyDirectories: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            includeEmptyDirectories: true,
          },
        }),
      );
    });
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

  describe('files flag', () => {
    it('should handle --no-files flag', async () => {
      const options: CliOptions = {
        files: false,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({
          output: {
            files: false,
          },
        }),
      );
    });

    it('should handle explicit --files flag', async () => {
      const options: CliOptions = {
        files: true,
      };

      await runDefaultAction(['.'], process.cwd(), options);

      expect(configLoader.mergeConfigs).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
        expect.objectContaining({}),
      );
    });
  });

  describe('handleStdinProcessing', () => {
    const testCwd = path.resolve('/test/cwd');
    const mockConfig = createMockConfig({
      cwd: testCwd,
      input: { maxFileSize: 50 * 1024 * 1024 },
      output: {
        filePath: 'output.txt',
        style: 'plain' as const,
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
        git: { sortByChanges: true, sortByChangesMaxCommits: 100, includeDiffs: false },
        files: true,
      },
      ignore: { useGitignore: true, useDefaultPatterns: true, customPatterns: [] },
      include: [],
      security: { enableSecurityCheck: true },
      tokenCount: { encoding: 'cl100k_base' as const },
    });

    beforeEach(() => {
      vi.mocked(packager.pack).mockResolvedValue({
        totalTokens: 1000,
        totalFiles: 3,
        totalChars: 2500,
        totalCharacters: 2500,
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        processedFiles: [],
        safeFilePaths: [],
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        fileCharCounts: {},
        fileTokenCounts: {},
        outputFilePath: 'output.txt',
        skippedFiles: [],
      } as PackResult);
    });

    it('should validate directory arguments and throw error for multiple directories', async () => {
      await expect(handleStdinProcessing(['dir1', 'dir2'], testCwd, mockConfig, mockSpinner)).rejects.toThrow(
        'When using --stdin, do not specify directory arguments',
      );
    });

    it('should validate directory arguments and throw error for non-default directory', async () => {
      await expect(handleStdinProcessing(['src'], testCwd, mockConfig, mockSpinner)).rejects.toThrow(
        'When using --stdin, do not specify directory arguments',
      );
    });

    it('should accept default directory argument', async () => {
      vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue({
        filePaths: [path.resolve(testCwd, 'file1.txt')],
        emptyDirPaths: [],
      });

      const result = await handleStdinProcessing(['.'], testCwd, mockConfig, mockSpinner);

      expect(result).toEqual({
        packResult: expect.any(Object),
        config: mockConfig,
      });
      expect(fileStdin.readFilePathsFromStdin).toHaveBeenCalledWith(testCwd);
    });

    it('should handle empty directories array', async () => {
      vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue({
        filePaths: [path.resolve(testCwd, 'file1.txt')],
        emptyDirPaths: [],
      });

      const result = await handleStdinProcessing([], testCwd, mockConfig, mockSpinner);

      expect(result).toEqual({
        packResult: expect.any(Object),
        config: mockConfig,
      });
    });

    it('should call pack with correct arguments from stdin result', async () => {
      const stdinResult = {
        filePaths: [path.resolve(testCwd, 'file1.txt'), path.resolve(testCwd, 'subdir/file2.txt')],
        emptyDirPaths: [path.resolve(testCwd, 'emptydir')],
      };

      vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue(stdinResult);

      // Mock globby to return the expected filtered files (sorted by sortPaths)
      vi.mocked(globby).mockResolvedValue([path.join('subdir', 'file2.txt'), 'file1.txt']);

      await handleStdinProcessing(['.'], testCwd, mockConfig, mockSpinner);

      expect(packager.pack).toHaveBeenCalledWith([testCwd], mockConfig, expect.any(Function), {}, [
        path.join(testCwd, 'file1.txt'),
        path.join(testCwd, 'subdir', 'file2.txt'),
      ]);
    });

    it('should propagate errors from readFilePathsFromStdin', async () => {
      const error = new Error('stdin read error');
      vi.mocked(fileStdin.readFilePathsFromStdin).mockRejectedValue(error);

      await expect(handleStdinProcessing(['.'], testCwd, mockConfig, mockSpinner)).rejects.toThrow('stdin read error');
    });

    it('should propagate errors from pack operation', async () => {
      vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue({
        filePaths: [path.resolve(testCwd, 'file1.txt')],
        emptyDirPaths: [],
      });

      const error = new Error('pack error');
      vi.mocked(packager.pack).mockRejectedValue(error);

      await expect(handleStdinProcessing(['.'], testCwd, mockConfig, mockSpinner)).rejects.toThrow('pack error');
    });
  });

  describe('handleDirectoryProcessing', () => {
    const testCwd = path.resolve('/test/cwd');
    const mockConfig = createMockConfig({
      cwd: testCwd,
      input: { maxFileSize: 50 * 1024 * 1024 },
      output: {
        filePath: 'output.txt',
        style: 'plain' as const,
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
        git: { sortByChanges: true, sortByChangesMaxCommits: 100, includeDiffs: false },
        files: true,
      },
      ignore: { useGitignore: true, useDefaultPatterns: true, customPatterns: [] },
      include: [],
      security: { enableSecurityCheck: true },
      tokenCount: { encoding: 'cl100k_base' as const },
    });

    beforeEach(() => {
      vi.mocked(packager.pack).mockResolvedValue({
        totalTokens: 1000,
        totalFiles: 3,
        totalChars: 2500,
        totalCharacters: 2500,
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        processedFiles: [],
        safeFilePaths: [],
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        fileCharCounts: {},
        fileTokenCounts: {},
        outputFilePath: 'output.txt',
        skippedFiles: [],
      } as PackResult);
    });

    it('should resolve directory paths and call pack with absolute paths', async () => {
      const directories = ['src', 'lib', './docs'];

      const result = await handleDirectoryProcessing(directories, testCwd, mockConfig, mockSpinner);

      expect(packager.pack).toHaveBeenCalledWith(
        [path.resolve(testCwd, 'src'), path.resolve(testCwd, 'lib'), path.resolve(testCwd, 'docs')],
        mockConfig,
        expect.any(Function),
      );

      expect(result).toEqual({
        packResult: expect.any(Object),
        config: mockConfig,
      });
    });

    it('should handle single directory', async () => {
      const directories = ['.'];

      await handleDirectoryProcessing(directories, testCwd, mockConfig, mockSpinner);

      expect(packager.pack).toHaveBeenCalledWith([testCwd], mockConfig, expect.any(Function));
    });

    it('should handle absolute directory paths', async () => {
      const absolutePath1 = path.resolve('/absolute/path');
      const absolutePath2 = path.resolve('/another/absolute');
      const directories = [absolutePath1, absolutePath2];

      await handleDirectoryProcessing(directories, testCwd, mockConfig, mockSpinner);

      expect(packager.pack).toHaveBeenCalledWith([absolutePath1, absolutePath2], mockConfig, expect.any(Function));
    });

    it('should propagate errors from pack operation', async () => {
      const error = new Error('pack error');
      vi.mocked(packager.pack).mockRejectedValue(error);

      await expect(handleDirectoryProcessing(['.'], testCwd, mockConfig, mockSpinner)).rejects.toThrow('pack error');
    });

    it('should call progress callback during packing', async () => {
      let progressCallback: ((message: string) => void) | undefined;

      vi.mocked(packager.pack).mockImplementation(async (paths, config, callback) => {
        progressCallback = callback;
        // Simulate progress callback
        if (callback) {
          callback('Processing files...');
        }
        return {
          totalTokens: 1000,
          totalFiles: 3,
          totalChars: 2500,
          totalCharacters: 2500,
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          processedFiles: [],
          safeFilePaths: [],
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          fileCharCounts: {},
          fileTokenCounts: {},
          outputFilePath: 'output.txt',
          skippedFiles: [],
        } as PackResult;
      });

      await handleDirectoryProcessing(['.'], testCwd, mockConfig, mockSpinner);

      expect(progressCallback).toBeDefined();
      expect(packager.pack).toHaveBeenCalledWith(expect.any(Array), expect.any(Object), expect.any(Function));
    });
  });
});
