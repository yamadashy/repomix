import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCliConfig, runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import * as packager from '../../../src/core/packager.js';

vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/core/file/packageJsonParse');
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/cli/cliSpinner');

describe('defaultAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(packageJsonParser.getVersion).mockResolvedValue('1.0.0');
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({});
    vi.mocked(configLoader.mergeConfigs).mockReturnValue({
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
      forceInclude: [],
      security: {
        enableSecurityCheck: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });
    vi.mocked(packager.pack).mockResolvedValue({
      totalFiles: 10,
      totalCharacters: 1000,
      totalTokens: 200,
      fileCharCounts: {},
      fileTokenCounts: {},
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
      processedFiles: [],
      safeFilePaths: [],
      gitDiffTokenCount: 0,
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
});
