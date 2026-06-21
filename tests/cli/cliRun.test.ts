import * as fs from 'node:fs/promises';
import { program } from 'commander';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as defaultAction from '../../src/cli/actions/defaultAction.js';
import * as initAction from '../../src/cli/actions/initAction.js';
import * as remoteAction from '../../src/cli/actions/remoteAction.js';
import * as versionAction from '../../src/cli/actions/versionAction.js';
import { run, runCli } from '../../src/cli/cliRun.js';
import type { CliOptions } from '../../src/cli/types.js';
import * as gitRemoteHandle from '../../src/core/git/gitRemoteHandle.js';
import type { PackResult } from '../../src/core/packager.js';
import { logger, type RepomixLogLevel, repomixLogLevels } from '../../src/shared/logger.js';
import { createMockConfig } from '../testing/testUtils.js';

let logLevel: RepomixLogLevel;

vi.mock('../../src/shared/logger', () => ({
  repomixLogLevels: {
    SILENT: -1,
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  },
  logger: {
    log: vi.fn(),
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    note: vi.fn(),
    setLogLevel: vi.fn((level: RepomixLogLevel) => {
      logLevel = level;
    }),
    getLogLevel: vi.fn(() => logLevel),
  },
  setLogLevelByWorkerData: vi.fn(),
}));

vi.mock('../../src/cli/actions/defaultAction');
vi.mock('../../src/cli/actions/initAction');
vi.mock('../../src/cli/actions/remoteAction');
vi.mock('../../src/core/git/gitRemoteHandle');
vi.mock('../../src/cli/actions/versionAction');

// Partial mock: `access` is spyable for shorthand-detection tests, everything else stays real.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    access: vi.fn(actual.access),
  };
});

const actualFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');

describe('cliRun', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // resetAllMocks clears the default implementation — restore real fs.access behavior.
    vi.mocked(fs.access).mockImplementation(actualFs.access);

    vi.mocked(defaultAction.runDefaultAction).mockResolvedValue({
      config: createMockConfig({
        cwd: process.cwd(),
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: 'repomix-output.txt',
          style: 'plain',
          stdout: false,
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
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
          },
        },
        include: [],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      }),
      packResult: {
        totalFiles: 0,
        totalCharacters: 0,
        totalTokens: 0,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        skippedFiles: [],
      } satisfies PackResult,
    });
    vi.mocked(initAction.runInitAction).mockResolvedValue();
    vi.mocked(remoteAction.runRemoteAction).mockResolvedValue({
      config: createMockConfig({
        cwd: process.cwd(),
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: 'repomix-output.txt',
          stdout: false,
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
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
          },
        },
        include: [],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      }),
      packResult: {
        totalFiles: 0,
        totalCharacters: 0,
        totalTokens: 0,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        skippedFiles: [],
      } satisfies PackResult,
    });
    vi.mocked(versionAction.runVersionAction).mockResolvedValue();
  });

  test('should call process.exit(1) on error', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementationOnce(() => undefined as never);
    const parseSpy = vi.spyOn(program, 'description').mockImplementationOnce(() => {
      throw Error();
    });
    const handleErrorSpy = vi.spyOn(logger, 'error');
    await expect(run()).resolves.not.toThrow();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(handleErrorSpy).toHaveBeenCalled();
    exitSpy.mockReset();
    parseSpy.mockReset();
    handleErrorSpy.mockReset();
  });

  describe('executeAction', () => {
    test('should execute default action when no special options provided', async () => {
      await runCli(['.'], process.cwd(), {});

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(['.'], process.cwd(), expect.any(Object));
    });

    test('should enable verbose logging when verbose option is true', async () => {
      await runCli(['.'], process.cwd(), { verbose: true });

      expect(logger.setLogLevel).toHaveBeenCalledWith(repomixLogLevels.DEBUG);
    });

    test('should execute version action when version option is true', async () => {
      await runCli(['.'], process.cwd(), { version: true });

      expect(versionAction.runVersionAction).toHaveBeenCalled();
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should execute init action when init option is true', async () => {
      await runCli(['.'], process.cwd(), { init: true });

      expect(initAction.runInitAction).toHaveBeenCalledWith(process.cwd(), false);
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should execute remote action when remote option is provided', async () => {
      await runCli(['.'], process.cwd(), {
        remote: 'yamadashy/repomix',
      });

      expect(remoteAction.runRemoteAction).toHaveBeenCalledWith('yamadashy/repomix', expect.any(Object));
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect HTTPS URL and execute remote action', async () => {
      await runCli(['https://github.com/user/repo'], process.cwd(), {});

      expect(remoteAction.runRemoteAction).toHaveBeenCalledWith('https://github.com/user/repo', expect.any(Object));
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect git@ SSH URL and execute remote action', async () => {
      await runCli(['git@github.com:user/repo.git'], process.cwd(), {});

      expect(remoteAction.runRemoteAction).toHaveBeenCalledWith('git@github.com:user/repo.git', expect.any(Object));
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect ssh:// URL and execute remote action', async () => {
      await runCli(['ssh://git@github.com/user/repo.git'], process.cwd(), {});

      expect(remoteAction.runRemoteAction).toHaveBeenCalledWith(
        'ssh://git@github.com/user/repo.git',
        expect.any(Object),
      );
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect git:// URL and execute remote action', async () => {
      await runCli(['git://github.com/user/repo.git'], process.cwd(), {});

      expect(remoteAction.runRemoteAction).toHaveBeenCalledWith('git://github.com/user/repo.git', expect.any(Object));
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect shorthand when no local path exists and the repository is reachable', async () => {
      vi.mocked(gitRemoteHandle.checkRemoteRepoExists).mockResolvedValue(true);

      await runCli(['user/repo'], process.cwd(), {});

      expect(gitRemoteHandle.checkRemoteRepoExists).toHaveBeenCalledWith('https://github.com/user/repo.git');
      expect(remoteAction.runRemoteAction).toHaveBeenCalledWith('user/repo', expect.any(Object));
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should fall back to local handling when shorthand is not a reachable repository', async () => {
      vi.mocked(gitRemoteHandle.checkRemoteRepoExists).mockResolvedValue(false);

      await runCli(['user/repo'], process.cwd(), {});

      expect(gitRemoteHandle.checkRemoteRepoExists).toHaveBeenCalledWith('https://github.com/user/repo.git');
      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object));
      expect(remoteAction.runRemoteAction).not.toHaveBeenCalled();
    });

    test('should prefer existing local path over shorthand auto-detection', async () => {
      // Simulate an existing local path that also matches the owner/repo pattern.
      // Mocking fs.access keeps the test independent of the repository's own directory layout.
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await runCli(['user/repo'], process.cwd(), {});

      expect(gitRemoteHandle.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object));
      expect(remoteAction.runRemoteAction).not.toHaveBeenCalled();
    });

    test('should treat permission-denied local path as existing and skip the remote probe', async () => {
      const accessError = Object.assign(new Error('permission denied'), { code: 'EACCES' });
      vi.mocked(fs.access).mockRejectedValue(accessError);

      await runCli(['user/repo'], process.cwd(), {});

      expect(gitRemoteHandle.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(remoteAction.runRemoteAction).not.toHaveBeenCalled();
      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object));
    });

    test('should not treat Windows-style absolute path as shorthand', async () => {
      // `C:` contains a colon, which the owner/repo pattern rejects — no probe even when missing locally.
      await runCli(['C:/project'], process.cwd(), {});

      expect(gitRemoteHandle.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(remoteAction.runRemoteAction).not.toHaveBeenCalled();
      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(['C:/project'], process.cwd(), expect.any(Object));
    });

    test('should not probe shorthand in stdin mode', async () => {
      await runCli(['user/repo'], process.cwd(), { stdin: true });

      expect(gitRemoteHandle.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(remoteAction.runRemoteAction).not.toHaveBeenCalled();
      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object));
    });

    test('should prioritize explicit --remote flag over auto-detected URL', async () => {
      await runCli(['https://github.com/other/repo'], process.cwd(), {
        remote: 'yamadashy/repomix',
      });

      expect(remoteAction.runRemoteAction).toHaveBeenCalledWith('yamadashy/repomix', expect.any(Object));
    });
  });

  describe('parsable style flag', () => {
    test('should disable parsable style by default', async () => {
      await runCli(['.'], process.cwd(), {});

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.not.objectContaining({
          parsableStyle: false,
        }),
      );
    });

    test('should handle --parsable-style flag', async () => {
      await runCli(['.'], process.cwd(), { parsableStyle: true });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          parsableStyle: true,
        }),
      );
    });
  });

  describe('skill generation options', () => {
    test('should pass --skill-project-name to default action', async () => {
      await runCli(['.'], process.cwd(), {
        skillGenerate: true,
        skillProjectName: 'Repomix',
      });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          skillGenerate: true,
          skillProjectName: 'Repomix',
        }),
      );
    });
  });

  describe('security check flag', () => {
    test('should enable security check by default', async () => {
      await runCli(['.'], process.cwd(), {});

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.not.objectContaining({
          securityCheck: false,
        }),
      );
    });

    test('should handle --no-security-check flag', async () => {
      await runCli(['.'], process.cwd(), { securityCheck: false });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          securityCheck: false,
        }),
      );
    });

    test('should handle explicit --security-check flag', async () => {
      await runCli(['.'], process.cwd(), { securityCheck: true });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          securityCheck: true,
        }),
      );
    });

    test('should handle explicit --no-gitignore flag', async () => {
      await runCli(['.'], process.cwd(), { gitignore: false });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          gitignore: false,
        }),
      );
    });

    test('should handle explicit --no-default-patterns flag', async () => {
      await runCli(['.'], process.cwd(), { defaultPatterns: false });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          defaultPatterns: false,
        }),
      );
    });

    test('should handle explicit --header-text flag', async () => {
      await runCli(['.'], process.cwd(), {
        headerText: 'I am a good header text',
      });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          headerText: 'I am a good header text',
        }),
      );
    });

    test('should handle --instruction-file-path flag', async () => {
      await runCli(['.'], process.cwd(), {
        instructionFilePath: 'path/to/instruction.txt',
      });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          instructionFilePath: 'path/to/instruction.txt',
        }),
      );
    });

    test('should handle --output-file-path-style flag', async () => {
      await runCli(['.'], process.cwd(), {
        outputFilePathStyle: 'cwd-relative',
      });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          outputFilePathStyle: 'cwd-relative',
        }),
      );
    });

    test('should handle --include-empty-directories flag', async () => {
      await runCli(['.'], process.cwd(), {
        includeEmptyDirectories: true,
      });

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          includeEmptyDirectories: true,
        }),
      );
    });
  });

  describe('quiet mode', () => {
    test('should set log level to SILENT when quiet option is true', async () => {
      const options: CliOptions = {
        quiet: true,
      };

      await runCli(['.'], process.cwd(), options);

      expect(logger.getLogLevel()).toBe(repomixLogLevels.SILENT);
    });

    test('should set log level to DEBUG when verbose option is true', async () => {
      const options: CliOptions = {
        verbose: true,
      };

      await runCli(['.'], process.cwd(), options);

      expect(logger.getLogLevel()).toBe(repomixLogLevels.DEBUG);
    });

    test('should set log level to INFO by default', async () => {
      const options: CliOptions = {};

      await runCli(['.'], process.cwd(), options);

      expect(logger.getLogLevel()).toBe(repomixLogLevels.INFO);
    });
  });

  describe('stdout mode', () => {
    const originalIsTTY = process.stdout.isTTY;

    afterEach(() => {
      process.stdout.isTTY = originalIsTTY;
    });

    test('should handle --stdout flag', async () => {
      const options: CliOptions = {
        stdout: true,
      };

      await runCli(['.'], process.cwd(), options);

      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          stdout: true,
        }),
      );
    });

    test('should not enable stdout mode when explicitly setting output', async () => {
      // Mock pipe detection
      process.stdout.isTTY = false;
      const options: CliOptions = {
        output: 'custom-output.txt',
      };

      await runCli(['.'], process.cwd(), options);

      // stdout should not be set
      expect(defaultAction.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          output: 'custom-output.txt',
        }),
      );
      expect(defaultAction.runDefaultAction).not.toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          stdout: true,
        }),
      );
    });
  });
});
