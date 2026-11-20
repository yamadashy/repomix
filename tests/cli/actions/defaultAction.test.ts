import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCliConfig, buildMergedConfig, runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import type { readFilePathsFromStdin } from '../../../src/core/file/fileStdin.js';
import type { pack } from '../../../src/core/packager.js';
import { logger } from '../../../src/shared/logger.js';
import { createMockSpinner } from '../../testing/cliDoubles.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig } from '../../testing/testUtils.js';

const createDeps = () => {
  const { spinner, Spinner } = createMockSpinner();
  const deps = {
    buildMergedConfig: vi.fn<typeof buildMergedConfig>(),
    readFilePathsFromStdin: vi.fn<typeof readFilePathsFromStdin>(),
    pack: vi.fn<typeof pack>(),
    reportResults: vi.fn(),
    Spinner,
  };
  const configDeps = {
    runMigrationAction: vi.fn(),
    loadFileConfig: vi.fn().mockResolvedValue({}),
    mergeConfigs: vi.fn().mockReturnValue(createMockConfig()),
  };
  return { deps, configDeps, mockSpinner: spinner };
};

describe('defaultAction', () => {
  let deps: ReturnType<typeof createDeps>['deps'];
  let configDeps: ReturnType<typeof createDeps>['configDeps'];
  let mockSpinner: ReturnType<typeof createDeps>['mockSpinner'];

  beforeEach(() => {
    ({ deps, configDeps, mockSpinner } = createDeps());
    silenceLogger();

    deps.buildMergedConfig.mockResolvedValue(
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
    deps.readFilePathsFromStdin.mockResolvedValue({
      filePaths: ['test1.txt', 'test2.txt'],
      emptyDirPaths: [],
    });
    deps.pack.mockResolvedValue({
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

  it('should run the default command successfully', async () => {
    const options: CliOptions = {
      output: 'custom-output.txt',
      verbose: true,
    };

    await runDefaultAction(['.'], process.cwd(), options, undefined, deps);

    expect(deps.pack).toHaveBeenCalled();
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it('should not migrate legacy files when local config is skipped', async () => {
    await buildMergedConfig('/tmp/remote-repository', { skipLocalConfig: true }, configDeps);

    expect(configDeps.runMigrationAction).not.toHaveBeenCalled();
    expect(configDeps.loadFileConfig).toHaveBeenCalledWith('/tmp/remote-repository', null, {
      skipLocalConfig: true,
    });
  });

  it('should migrate legacy files when local config is used', async () => {
    await buildMergedConfig('/tmp/local-repository', {}, configDeps);

    expect(configDeps.runMigrationAction).toHaveBeenCalledWith('/tmp/local-repository');
  });

  it('should not migrate a remote clone even when its config is trusted', async () => {
    // A trusted remote sets skipLocalConfig: false, so skipMigration is what keeps
    // migration from rewriting the clone's legacy repopack.config.json into a
    // repomix.config.* the trust prompt never displayed.
    await buildMergedConfig('/tmp/remote-repository', { skipLocalConfig: false, skipMigration: true }, configDeps);

    expect(configDeps.runMigrationAction).not.toHaveBeenCalled();
  });

  it('should handle custom include patterns', async () => {
    const options: CliOptions = {
      include: '*.js,*.ts',
    };

    await runDefaultAction(['.'], process.cwd(), options, undefined, deps);

    expect(deps.pack).toHaveBeenCalled();
  });

  it('should handle stdin mode', async () => {
    const options: CliOptions = {
      stdin: true,
    };

    await runDefaultAction(['.'], process.cwd(), options, undefined, deps);

    expect(deps.readFilePathsFromStdin).toHaveBeenCalledWith(process.cwd());
    expect(deps.pack).toHaveBeenCalledWith(
      [process.cwd()],
      expect.any(Object),
      expect.any(Function),
      {},
      ['test1.txt', 'test2.txt'],
      expect.any(Object),
    );
  });

  it.each([[['src']], [['.', 'lib']]])('should reject directory arguments %j in stdin mode', async (directories) => {
    await expect(runDefaultAction(directories, process.cwd(), { stdin: true }, undefined, deps)).rejects.toThrow(
      'When using --stdin, do not specify directory arguments.',
    );
    expect(deps.readFilePathsFromStdin).not.toHaveBeenCalled();
  });

  it('should forward the abort signal to pack', async () => {
    const { signal } = new AbortController();

    await runDefaultAction(['.'], process.cwd(), { signal }, undefined, deps);

    expect(deps.pack).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      expect.any(Function),
      {},
      undefined,
      expect.objectContaining({ signal }),
    );
  });

  it('should handle errors gracefully', async () => {
    deps.pack.mockRejectedValue(new Error('Test error'));

    const options: CliOptions = {};

    await expect(runDefaultAction(['.'], process.cwd(), options, undefined, deps)).rejects.toThrow('Test error');
    expect(mockSpinner.fail).toHaveBeenCalledWith('Error during packing');
  });

  describe('progressCallback', () => {
    it('should forward progress messages to the provided callback', async () => {
      // Configure pack mock to invoke its 3rd argument (progressCallback)
      deps.pack.mockImplementation(async (_paths, _config, progressCallback = () => {}) => {
        progressCallback('Searching for files...');
        progressCallback('Processing files...');
        return {
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
        };
      });

      const callback = vi.fn();
      await runDefaultAction(['.'], process.cwd(), {}, callback, deps);

      expect(callback).toHaveBeenCalledWith('Searching for files...');
      expect(callback).toHaveBeenCalledWith('Processing files...');
    });

    it('should isolate async callback errors without affecting pack flow', async () => {
      deps.pack.mockImplementation(async (_paths, _config, progressCallback = () => {}) => {
        progressCallback('test message');
        // Allow microtask to process the rejected promise
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
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
        };
      });

      const rejectingCallback = vi.fn().mockRejectedValue(new Error('callback error'));
      const result = await runDefaultAction(['.'], process.cwd(), {}, rejectingCallback, deps);

      expect(result.packResult.totalFiles).toBe(10);
      expect(logger.trace).toHaveBeenCalledWith('progressCallback error:', expect.any(Error));
    });

    it('should still update spinner even when callback throws synchronously', async () => {
      deps.pack.mockImplementation(async (_paths, _config, progressCallback = () => {}) => {
        progressCallback('test message');
        return {
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
        };
      });

      const throwingCallback = vi.fn().mockImplementation(() => {
        throw new Error('sync error');
      });
      await runDefaultAction(['.'], process.cwd(), {}, throwingCallback, deps);

      // Spinner should still be updated despite callback failure
      expect(mockSpinner.update).toHaveBeenCalledWith('test message');
    });
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

    it('should handle custom output file path style', () => {
      const options: CliOptions = {
        outputFilePathStyle: 'cwd-relative',
      };
      const config = buildCliConfig(options);

      expect(config.output?.filePathStyle).toBe('cwd-relative');
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
      deps.buildMergedConfig.mockResolvedValue(
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

      await expect(runDefaultAction(['.'], process.cwd(), options, undefined, deps)).rejects.toThrow(
        '--skill-generate cannot be used with --stdout',
      );
    });

    it('should throw error when --skill-generate is used with --copy', async () => {
      deps.buildMergedConfig.mockResolvedValue(
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

      await expect(runDefaultAction(['.'], process.cwd(), options, undefined, deps)).rejects.toThrow(
        '--skill-generate cannot be used with --copy',
      );
    });

    it('should throw error when --skill-project-name is used without --skill-generate', async () => {
      const options: CliOptions = {
        skillProjectName: 'Repomix',
      };

      await expect(runDefaultAction(['.'], process.cwd(), options, undefined, deps)).rejects.toThrow(
        '--skill-project-name can only be used with --skill-generate',
      );
    });

    it('should throw error when empty --skill-project-name is used without --skill-generate', async () => {
      const options: CliOptions = {
        skillProjectName: '',
      };

      await expect(runDefaultAction(['.'], process.cwd(), options, undefined, deps)).rejects.toThrow(
        '--skill-project-name can only be used with --skill-generate',
      );
    });

    it.each<[string, CliOptions]>([
      ['--skill-output', { skillOutput: 'out-skill' }],
      ['--force', { force: true }],
    ])('should throw error when %s is used without --skill-generate', async (flag, options) => {
      await expect(runDefaultAction(['.'], process.cwd(), options, undefined, deps)).rejects.toThrow(
        `${flag} can only be used with --skill-generate`,
      );
      expect(deps.pack).not.toHaveBeenCalled();
    });

    it('should throw error when --skill-output is whitespace only', async () => {
      deps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: process.cwd(), skillGenerate: true }));

      await expect(
        runDefaultAction(['.'], process.cwd(), { skillGenerate: true, skillOutput: '   ' }, undefined, deps),
      ).rejects.toThrow('--skill-output path cannot be empty');
    });

    describe('skill name and directory resolution', () => {
      let tempDir: string;

      beforeEach(async () => {
        tempDir = await createTempDir('repomix-default-action-skill-');
      });

      const getPackOptions = () => deps.pack.mock.calls[0][5];

      it('should use the --skill-generate name and resolve a relative --skill-output against cwd', async () => {
        deps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: tempDir, skillGenerate: 'my-skill' }));

        await runDefaultAction(
          ['.'],
          tempDir,
          { skillGenerate: 'my-skill', skillOutput: 'skills/out' },
          undefined,
          deps,
        );

        expect(getPackOptions()).toMatchObject({
          skillName: 'my-skill',
          skillDir: path.join(tempDir, 'skills', 'out'),
        });
      });

      it('should derive the skill name from the target directory when --skill-generate has no name', async () => {
        const projectDir = path.join(tempDir, 'My_Project');
        await fs.mkdir(projectDir);
        deps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: tempDir, skillGenerate: true }));

        await runDefaultAction(
          ['My_Project'],
          tempDir,
          { skillGenerate: true, skillOutput: path.join(tempDir, 'out') },
          undefined,
          deps,
        );

        expect(getPackOptions()).toMatchObject({
          skillName: 'repomix-reference-my-project',
          skillDir: path.join(tempDir, 'out'),
        });
      });

      it('should refuse an existing --skill-output directory without --force', async () => {
        await fs.mkdir(path.join(tempDir, 'existing'));
        deps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: tempDir, skillGenerate: 'my-skill' }));

        await expect(
          runDefaultAction(['.'], tempDir, { skillGenerate: 'my-skill', skillOutput: 'existing' }, undefined, deps),
        ).rejects.toThrow('Use --force to overwrite.');
        expect(deps.pack).not.toHaveBeenCalled();
      });

      it('should keep a pre-resolved skill name and directory (as passed by remoteAction)', async () => {
        deps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: tempDir, skillGenerate: true }));
        const skillDir = path.join(tempDir, 'pre-resolved');

        await runDefaultAction(
          ['.'],
          tempDir,
          { skillGenerate: true, skillName: 'from-remote', skillDir, skillOutput: 'ignored' },
          undefined,
          deps,
        );

        expect(getPackOptions()).toMatchObject({ skillName: 'from-remote', skillDir });
      });
    });

    it('should throw error when --skill-project-name is empty', async () => {
      deps.buildMergedConfig.mockResolvedValue(
        createMockConfig({
          cwd: process.cwd(),
          skillGenerate: true,
        }),
      );

      const options: CliOptions = {
        skillGenerate: true,
        skillProjectName: '   ',
      };

      await expect(runDefaultAction(['.'], process.cwd(), options, undefined, deps)).rejects.toThrow(
        '--skill-project-name cannot be empty',
      );
    });
  });
});
