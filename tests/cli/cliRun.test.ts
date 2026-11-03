import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { Command, program } from 'commander';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  canonicalizeSandboxRoot,
  commanderActionEndpoint,
  createOutputErrorHandler,
  run,
  runCli,
} from '../../src/cli/cliRun.js';
import type { CliOptions } from '../../src/cli/types.js';
import { getVersion } from '../../src/core/file/packageJsonParse.js';
import type { PackResult } from '../../src/core/packager.js';
import { logger, repomixLogLevels } from '../../src/shared/logger.js';
import { silenceLogger } from '../testing/loggerDoubles.js';
import { createMockConfig } from '../testing/testUtils.js';

const createDeps = () => ({
  getVersion,
  access: vi.fn((filePath: string) => fs.access(filePath)),
  checkRemoteRepoExists: vi.fn(),
  runMcpAction: vi.fn(),
  runVersionAction: vi.fn(),
  runInitAction: vi.fn(),
  runRemoteAction: vi.fn(),
  runWatchAction: vi.fn(),
  runDefaultAction: vi.fn(),
});

describe('cliRun', () => {
  let deps: ReturnType<typeof createDeps>;
  let loggerSpies: ReturnType<typeof silenceLogger>;

  beforeEach(() => {
    loggerSpies = silenceLogger();
    // Keep the real level and stream setters (still spied) so the log level assertions below
    // observe what runCli actually set; afterEach puts the shared logger back to its defaults.
    loggerSpies.setLogLevel.mockReset();
    loggerSpies.setOutputStream.mockReset();

    deps = createDeps();
    deps.runDefaultAction.mockResolvedValue({
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
    deps.runRemoteAction.mockResolvedValue({
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logger.init();
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

  describe('unknown option output', () => {
    const createHandler = () => {
      const originalOutputError = vi.fn<(str: string, write: (str: string) => void) => void>();
      return { originalOutputError, handler: createOutputErrorHandler(originalOutputError) };
    };

    test.each([
      ["error: unknown option '--exclude'\n", '--exclude', '--ignore'],
      ["error: unknown option '-format'\n", '-format', '--style'],
    ])('should suggest a semantic alternative for %j', (str, unknownOption, suggestion) => {
      const { originalOutputError, handler } = createHandler();
      const write = vi.fn();

      handler(str, write);

      expect(loggerSpies.error).toHaveBeenCalledWith(`✖ Unknown option: ${unknownOption}`);
      expect(loggerSpies.info).toHaveBeenCalledWith(`Did you mean: ${suggestion}?`);
      expect(originalOutputError).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    });

    test.each(["error: unknown option '--frobnicate'\n", "error: missing required argument 'number'\n"])(
      'should fall back to the original Commander output for %j',
      (str) => {
        const { originalOutputError, handler } = createHandler();
        const write = vi.fn();

        handler(str, write);

        expect(originalOutputError).toHaveBeenCalledWith(str, write);
        expect(loggerSpies.info).not.toHaveBeenCalled();
      },
    );

    test('should recognize the unknown option message Commander actually emits', () => {
      const write = vi.fn();
      const command = new Command()
        .exitOverride()
        .option('--ignore <patterns>')
        .configureOutput({ outputError: createOutputErrorHandler(write) });

      expect(() => command.parse(['--exclude', '*.log'], { from: 'user' })).toThrow();
      expect(loggerSpies.info).toHaveBeenCalledWith('Did you mean: --ignore?');
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe('executeAction', () => {
    test('should execute default action when no special options provided', async () => {
      await runCli(['.'], process.cwd(), {}, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(['.'], process.cwd(), expect.any(Object), undefined);
    });

    test('should enable verbose logging when verbose option is true', async () => {
      await runCli(['.'], process.cwd(), { verbose: true }, undefined, deps);

      expect(logger.setLogLevel).toHaveBeenCalledWith(repomixLogLevels.DEBUG);
    });

    test('should execute version action when version option is true', async () => {
      await runCli(['.'], process.cwd(), { version: true }, undefined, deps);

      expect(deps.runVersionAction).toHaveBeenCalled();
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should execute init action when init option is true', async () => {
      await runCli(['.'], process.cwd(), { init: true }, undefined, deps);

      expect(deps.runInitAction).toHaveBeenCalledWith(process.cwd(), false);
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should execute remote action when remote option is provided', async () => {
      await runCli(
        ['.'],
        process.cwd(),
        {
          remote: 'yamadashy/repomix',
        },
        undefined,
        deps,
      );

      expect(deps.runRemoteAction).toHaveBeenCalledWith('yamadashy/repomix', expect.any(Object), undefined);
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect HTTPS URL and execute remote action', async () => {
      await runCli(['https://github.com/user/repo'], process.cwd(), {}, undefined, deps);

      expect(deps.runRemoteAction).toHaveBeenCalledWith('https://github.com/user/repo', expect.any(Object), undefined);
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect git@ SSH URL and execute remote action', async () => {
      await runCli(['git@github.com:user/repo.git'], process.cwd(), {}, undefined, deps);

      expect(deps.runRemoteAction).toHaveBeenCalledWith('git@github.com:user/repo.git', expect.any(Object), undefined);
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect ssh:// URL and execute remote action', async () => {
      await runCli(['ssh://git@github.com/user/repo.git'], process.cwd(), {}, undefined, deps);

      expect(deps.runRemoteAction).toHaveBeenCalledWith(
        'ssh://git@github.com/user/repo.git',
        expect.any(Object),
        undefined,
      );
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect git:// URL and execute remote action', async () => {
      await runCli(['git://github.com/user/repo.git'], process.cwd(), {}, undefined, deps);

      expect(deps.runRemoteAction).toHaveBeenCalledWith(
        'git://github.com/user/repo.git',
        expect.any(Object),
        undefined,
      );
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should auto-detect shorthand when no local path exists and the repository is reachable', async () => {
      deps.checkRemoteRepoExists.mockResolvedValue(true);

      await runCli(['user/repo'], process.cwd(), {}, undefined, deps);

      expect(deps.checkRemoteRepoExists).toHaveBeenCalledWith('https://github.com/user/repo.git');
      expect(deps.runRemoteAction).toHaveBeenCalledWith('user/repo', expect.any(Object), undefined);
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('should fall back to local handling when shorthand is not a reachable repository', async () => {
      deps.checkRemoteRepoExists.mockResolvedValue(false);

      await runCli(['user/repo'], process.cwd(), {}, undefined, deps);

      expect(deps.checkRemoteRepoExists).toHaveBeenCalledWith('https://github.com/user/repo.git');
      expect(deps.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object), undefined);
      expect(deps.runRemoteAction).not.toHaveBeenCalled();
    });

    test('should prefer existing local path over shorthand auto-detection', async () => {
      // Simulate an existing local path that also matches the owner/repo pattern.
      // Stubbing access keeps the test independent of the repository's own directory layout.
      deps.access.mockResolvedValue(undefined);

      await runCli(['user/repo'], process.cwd(), {}, undefined, deps);

      expect(deps.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(deps.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object), undefined);
      expect(deps.runRemoteAction).not.toHaveBeenCalled();
    });

    test('should treat permission-denied local path as existing and skip the remote probe', async () => {
      const accessError = Object.assign(new Error('permission denied'), { code: 'EACCES' });
      deps.access.mockRejectedValue(accessError);

      await runCli(['user/repo'], process.cwd(), {}, undefined, deps);

      expect(deps.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(deps.runRemoteAction).not.toHaveBeenCalled();
      expect(deps.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object), undefined);
    });

    test('should not treat Windows-style absolute path as shorthand', async () => {
      // `C:` contains a colon, which the owner/repo pattern rejects — no probe even when missing locally.
      await runCli(['C:/project'], process.cwd(), {}, undefined, deps);

      expect(deps.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(deps.runRemoteAction).not.toHaveBeenCalled();
      expect(deps.runDefaultAction).toHaveBeenCalledWith(['C:/project'], process.cwd(), expect.any(Object), undefined);
    });

    test('should not probe shorthand in stdin mode', async () => {
      await runCli(['user/repo'], process.cwd(), { stdin: true }, undefined, deps);

      expect(deps.checkRemoteRepoExists).not.toHaveBeenCalled();
      expect(deps.runRemoteAction).not.toHaveBeenCalled();
      expect(deps.runDefaultAction).toHaveBeenCalledWith(['user/repo'], process.cwd(), expect.any(Object), undefined);
    });

    test('should prioritize explicit --remote flag over auto-detected URL', async () => {
      await runCli(
        ['https://github.com/other/repo'],
        process.cwd(),
        {
          remote: 'yamadashy/repomix',
        },
        undefined,
        deps,
      );

      expect(deps.runRemoteAction).toHaveBeenCalledWith('yamadashy/repomix', expect.any(Object), undefined);
    });
  });

  describe('parsable style flag', () => {
    test('should disable parsable style by default', async () => {
      await runCli(['.'], process.cwd(), {}, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.not.objectContaining({
          parsableStyle: false,
        }),
        undefined,
      );
    });

    test('should handle --parsable-style flag', async () => {
      await runCli(['.'], process.cwd(), { parsableStyle: true }, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          parsableStyle: true,
        }),
        undefined,
      );
    });
  });

  describe('skill generation options', () => {
    test('should pass --skill-project-name to default action', async () => {
      await runCli(
        ['.'],
        process.cwd(),
        {
          skillGenerate: true,
          skillProjectName: 'Repomix',
        },
        undefined,
        deps,
      );

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          skillGenerate: true,
          skillProjectName: 'Repomix',
        }),
        undefined,
      );
    });
  });

  describe('security check flag', () => {
    test('should enable security check by default', async () => {
      await runCli(['.'], process.cwd(), {}, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.not.objectContaining({
          securityCheck: false,
        }),
        undefined,
      );
    });

    test('should handle --no-security-check flag', async () => {
      await runCli(['.'], process.cwd(), { securityCheck: false }, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          securityCheck: false,
        }),
        undefined,
      );
    });

    test('should handle explicit --security-check flag', async () => {
      await runCli(['.'], process.cwd(), { securityCheck: true }, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          securityCheck: true,
        }),
        undefined,
      );
    });

    test('should drop Commander default securityCheck so the config file decides', async () => {
      const command = new Command().option('--no-security-check');
      command.parse([], { from: 'user' });

      await commanderActionEndpoint(['.'], command.opts(), command, {
        runCli: (directories, cwd, options) => runCli(directories, cwd, options, undefined, deps),
      });

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.not.objectContaining({
          securityCheck: expect.anything(),
        }),
        undefined,
      );
    });

    test('should pass securityCheck: false from the CLI entry point with --no-security-check', async () => {
      const command = new Command().option('--no-security-check');
      command.parse(['--no-security-check'], { from: 'user' });

      await commanderActionEndpoint(['.'], command.opts(), command, {
        runCli: (directories, cwd, options) => runCli(directories, cwd, options, undefined, deps),
      });

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          securityCheck: false,
        }),
        undefined,
      );
    });

    test('should handle explicit --no-gitignore flag', async () => {
      await runCli(['.'], process.cwd(), { gitignore: false }, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          gitignore: false,
        }),
        undefined,
      );
    });

    test('should handle explicit --no-default-patterns flag', async () => {
      await runCli(['.'], process.cwd(), { defaultPatterns: false }, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          defaultPatterns: false,
        }),
        undefined,
      );
    });

    test('should handle explicit --header-text flag', async () => {
      await runCli(
        ['.'],
        process.cwd(),
        {
          headerText: 'I am a good header text',
        },
        undefined,
        deps,
      );

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          headerText: 'I am a good header text',
        }),
        undefined,
      );
    });

    test('should handle --instruction-file-path flag', async () => {
      await runCli(
        ['.'],
        process.cwd(),
        {
          instructionFilePath: 'path/to/instruction.txt',
        },
        undefined,
        deps,
      );

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          instructionFilePath: 'path/to/instruction.txt',
        }),
        undefined,
      );
    });

    test('should handle --output-file-path-style flag', async () => {
      await runCli(
        ['.'],
        process.cwd(),
        {
          outputFilePathStyle: 'cwd-relative',
        },
        undefined,
        deps,
      );

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          outputFilePathStyle: 'cwd-relative',
        }),
        undefined,
      );
    });

    test('should handle --include-empty-directories flag', async () => {
      await runCli(
        ['.'],
        process.cwd(),
        {
          includeEmptyDirectories: true,
        },
        undefined,
        deps,
      );

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          includeEmptyDirectories: true,
        }),
        undefined,
      );
    });
  });

  describe('quiet mode', () => {
    test('should set log level to SILENT when quiet option is true', async () => {
      const options: CliOptions = {
        quiet: true,
      };

      await runCli(['.'], process.cwd(), options, undefined, deps);

      expect(logger.getLogLevel()).toBe(repomixLogLevels.SILENT);
    });

    test('should set log level to DEBUG when verbose option is true', async () => {
      const options: CliOptions = {
        verbose: true,
      };

      await runCli(['.'], process.cwd(), options, undefined, deps);

      expect(logger.getLogLevel()).toBe(repomixLogLevels.DEBUG);
    });

    test('should set log level to INFO by default', async () => {
      const options: CliOptions = {};

      await runCli(['.'], process.cwd(), options, undefined, deps);

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

      await runCli(['.'], process.cwd(), options, undefined, deps);

      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          stdout: true,
        }),
        undefined,
      );
    });

    test('should not enable stdout mode when explicitly setting output', async () => {
      // Mock pipe detection
      process.stdout.isTTY = false;
      const options: CliOptions = {
        output: 'custom-output.txt',
      };

      await runCli(['.'], process.cwd(), options, undefined, deps);

      // stdout should not be set
      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          output: 'custom-output.txt',
        }),
        undefined,
      );
      expect(deps.runDefaultAction).not.toHaveBeenCalledWith(
        ['.'],
        process.cwd(),
        expect.objectContaining({
          stdout: true,
        }),
      );
    });
  });

  describe('mcp mode', () => {
    test('routes diagnostics to stderr because stdout carries the protocol', async () => {
      const options: CliOptions = {
        mcp: true,
        verbose: true,
      };

      const { setOutputStream, trace } = loggerSpies;

      await runCli(['.'], process.cwd(), options, undefined, deps);

      expect(setOutputStream).toHaveBeenCalledWith('stderr');

      // The option dump is itself diagnostics, so routing decided after it would still corrupt the
      // first frames a client reads.
      const dumpCall = trace.mock.calls.findIndex(([first]) => first === 'options:');
      expect(setOutputStream.mock.invocationCallOrder[0]).toBeLessThan(trace.mock.invocationCallOrder[dumpCall]);
    });

    test('leaves the stream alone for a normal pack', async () => {
      const options: CliOptions = {
        verbose: true,
      };

      await runCli(['.'], process.cwd(), options, undefined, deps);

      expect(loggerSpies.setOutputStream).not.toHaveBeenCalled();
    });
  });

  describe('default deps', () => {
    test('lazily loads the real version action', async () => {
      await runCli([], process.cwd(), { version: true });

      expect(loggerSpies.log).toHaveBeenCalledWith(await getVersion());
    });
  });
});

describe('canonicalizeSandboxRoot', () => {
  const dirStat = { isDirectory: () => true } as Stats;
  const fileStat = { isDirectory: () => false } as Stats;
  const eperm = () => {
    const e = new Error("EPERM: operation not permitted, realpath 'C:\\Users\\RUNNER~1\\Temp\\ws'");
    return Object.assign(e, { code: 'EPERM' });
  };

  test('returns the realpath-resolved root when realpath succeeds (symlink canonicalization)', async () => {
    const root = await canonicalizeSandboxRoot('/tmp/ws', {
      realpath: async () => '/private/tmp/ws',
      stat: async () => dirStat,
    });
    expect(root).toBe('/private/tmp/ws');
  });

  test('falls back to the lexical root when realpath fails but the directory exists (Windows EPERM quirk)', async () => {
    const requested = path.resolve('/tmp/ws');
    const root = await canonicalizeSandboxRoot(requested, {
      realpath: async () => {
        throw eperm();
      },
      stat: async () => dirStat,
    });
    // no refusal to start — the lexical (already absolute) root is used
    expect(root).toBe(path.resolve(requested));
  });

  test('fails closed when realpath fails and the directory is missing/inaccessible', async () => {
    await expect(
      canonicalizeSandboxRoot('/tmp/gone', {
        realpath: async () => {
          throw eperm();
        },
        stat: async () => {
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        },
      }),
    ).rejects.toThrow('--sandbox workspace directory could not be resolved');
  });

  test('fails closed when realpath fails and the path is not a directory', async () => {
    await expect(
      canonicalizeSandboxRoot('/tmp/file', {
        realpath: async () => {
          throw eperm();
        },
        stat: async () => fileStat,
      }),
    ).rejects.toThrow('--sandbox workspace directory could not be resolved');
  });
});
