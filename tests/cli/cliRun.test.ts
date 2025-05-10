import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as defaultAction from '../../src/cli/actions/defaultAction.js';
import * as initAction from '../../src/cli/actions/initAction.js';
import * as remoteAction from '../../src/cli/actions/remoteAction.js';
import * as versionAction from '../../src/cli/actions/versionAction.js';
import { run, runCli } from '../../src/cli/cliRun.js';
import type { CliOptions } from '../../src/cli/types.js';
import type { RepomixConfigMerged } from '../../src/config/configSchema.js';
import type { PackResult } from '../../src/core/packager.js';
import { type RepomixLogLevel, logger, repomixLogLevels } from '../../src/shared/logger.js';

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
  setLogLevelByEnv: vi.fn(),
}));

vi.mock('cleye', () => ({
  cli: vi.fn().mockImplementation((options) => {
    return {
      _: ['.'],
      flags: {},
    };
  }),
  command: vi.fn(),
}));

vi.mock('../../src/cli/actions/defaultAction');
vi.mock('../../src/cli/actions/initAction');
vi.mock('../../src/cli/actions/remoteAction');
vi.mock('../../src/cli/actions/versionAction');

describe('cliRun', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(defaultAction.runDefaultAction).mockResolvedValue({
      config: {
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
      } satisfies RepomixConfigMerged,
      packResult: {
        totalFiles: 0,
        totalCharacters: 0,
        totalTokens: 0,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
        gitDiffTokenCount: 0,
        suspiciousGitDiffResults: [],
      } satisfies PackResult,
    });
    vi.mocked(initAction.runInitAction).mockResolvedValue();
    vi.mocked(remoteAction.runRemoteAction).mockResolvedValue({
      config: {
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
      } satisfies RepomixConfigMerged,
      packResult: {
        totalFiles: 0,
        totalCharacters: 0,
        totalTokens: 0,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
        gitDiffTokenCount: 0,
        suspiciousGitDiffResults: [],
      } satisfies PackResult,
    });
    vi.mocked(versionAction.runVersionAction).mockResolvedValue();
  });

  test('should run without arguments', async () => {
    await expect(run()).resolves.not.toThrow();
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
