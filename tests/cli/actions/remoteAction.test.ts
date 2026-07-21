import * as fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DefaultActionRunnerResult } from '../../../src/cli/actions/defaultAction.js';
import { copyOutputToCurrentDirectory, runRemoteAction } from '../../../src/cli/actions/remoteAction.js';
import { OperationCancelledError } from '../../../src/shared/errorHandle.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    access: vi.fn(),
    copyFile: vi.fn(),
    cp: vi.fn(),
    mkdir: vi.fn(),
  };
});
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/cli/cliSpinner');

const createMockDefaultActionResult = (): DefaultActionRunnerResult => ({
  packResult: {
    totalFiles: 1,
    totalCharacters: 1,
    totalTokens: 1,
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
  config: createMockConfig(),
});

describe('remoteAction functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('runRemoteAction', () => {
    test('should clone the repository when not a GitHub repo', async () => {
      const execGitShallowCloneMock = vi.fn(async (_url: string, directory: string) => {
        await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
      });
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'https://gitlab.com/owner/repo.git',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: execGitShallowCloneMock,
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn().mockRejectedValue(new Error('Archive download not implemented in test')),
          isGitHubRepository: vi.fn().mockReturnValue(false),
          parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(execGitShallowCloneMock).toHaveBeenCalledTimes(1);
      // Verify skipLocalConfig flag is passed to prevent loading untrusted config from cloned repos
      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: true }),
      );
    });

    describe('remote config trust confirmation', () => {
      const createTrustDeps = (overrides: Record<string, unknown> = {}) => ({
        isGitInstalled: async () => Promise.resolve(true),
        execGitShallowClone: vi.fn(async (_url: string, directory: string) => {
          await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
        }),
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: vi.fn(async () => createMockDefaultActionResult()),
        downloadGitHubArchive: vi.fn().mockRejectedValue(new Error('Archive download not implemented in test')),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        ...overrides,
      });

      test('asks for confirmation when --remote-trust-config is used', async () => {
        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true }, deps);

        expect(deps.confirmRemoteConfigTrust).toHaveBeenCalledTimes(1);
        expect(deps.confirmRemoteConfigTrust).toHaveBeenCalledWith(
          expect.objectContaining({
            repoDir: expect.any(String),
            repoUrl: 'https://gitlab.com/owner/repo.git',
            force: false,
            stdout: false,
            hasExplicitConfig: false,
          }),
        );
      });

      test('aborts without packing when the user declines the config', async () => {
        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        const deps = createTrustDeps({
          confirmRemoteConfigTrust: vi.fn().mockRejectedValue(new OperationCancelledError('Remote config not trusted')),
        });

        await expect(
          runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true }, deps),
        ).rejects.toThrow(OperationCancelledError);

        // The declined config must never reach the packer.
        expect(deps.runDefaultAction).not.toHaveBeenCalled();
      });

      test('never migrates a remote clone, even when its config is trusted', async () => {
        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true }, deps);

        // Migration would rewrite the clone's legacy repopack.config.json into a
        // repomix.config.* the trust prompt never showed.
        expect(deps.runDefaultAction).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ skipMigration: true }),
        );
      });

      test('stops forwarding --force once the trust prompt has consumed it', async () => {
        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true, force: true }, deps);

        // runDefaultAction rejects --force without --skill-generate. Forwarding it
        // would make the documented `--remote-trust-config --force` escape hatch
        // throw instead of skipping the prompt.
        expect(deps.confirmRemoteConfigTrust).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
        expect(deps.runDefaultAction).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ force: undefined }),
        );
      });

      test('keeps forwarding --force when nothing consumed it, so misuse is still reported', async () => {
        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', { force: true }, deps);

        expect(deps.runDefaultAction).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ force: true }),
        );
      });

      test('does not ask for confirmation when the config is not trusted', async () => {
        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', {}, deps);

        expect(deps.confirmRemoteConfigTrust).not.toHaveBeenCalled();
      });
    });

    test('enforces the token budget after copying output, with the check deferred inside runDefaultAction', async () => {
      const execGitShallowCloneMock = vi.fn(async (_url: string, directory: string) => {
        await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
      });
      const base = createMockDefaultActionResult();
      const runDefaultActionMock = vi.fn(async () => ({
        packResult: { ...base.packResult, totalTokens: 300 },
        config: createMockConfig({ output: { filePath: 'repomix-output.txt', tokenBudget: 100 } }),
      }));
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      await expect(
        runRemoteAction(
          'https://gitlab.com/owner/repo.git',
          {},
          {
            isGitInstalled: async () => Promise.resolve(true),
            execGitShallowClone: execGitShallowCloneMock,
            getRemoteRefs: async () => Promise.resolve(['main']),
            runDefaultAction: runDefaultActionMock,
            downloadGitHubArchive: vi.fn().mockRejectedValue(new Error('Archive download not implemented in test')),
            isGitHubRepository: vi.fn().mockReturnValue(false),
            parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
            confirmRemoteConfigTrust: vi.fn(),
          },
        ),
      ).rejects.toThrow(/exceeds the token budget/);

      // runDefaultAction must receive deferTokenBudgetCheck so it does not throw
      // before the output is copied out of the temp dir.
      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ deferTokenBudgetCheck: true }),
      );
      // The output was copied before the guard threw.
      expect(fs.copyFile).toHaveBeenCalled();
    });

    test('copies all split-output files returned by remote packing', async () => {
      const execGitShallowCloneMock = vi.fn(async (_url: string, directory: string) => {
        await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
      });
      const base = createMockDefaultActionResult();
      const runDefaultActionMock = vi.fn(async () => ({
        packResult: {
          ...base.packResult,
          outputFiles: ['split-output.1.xml', 'split-output.2.xml'],
        },
        config: createMockConfig({ output: { filePath: 'split-output.xml', splitOutput: 1024 } }),
      }));

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'https://gitlab.com/owner/repo.git',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: execGitShallowCloneMock,
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn().mockRejectedValue(new Error('Archive download not implemented in test')),
          isGitHubRepository: vi.fn().mockReturnValue(false),
          parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(fs.copyFile).toHaveBeenCalledTimes(2);
      expect(fs.copyFile).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/split-output\.1\.xml$/),
        path.resolve(process.cwd(), 'split-output.1.xml'),
      );
      expect(fs.copyFile).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/split-output\.2\.xml$/),
        path.resolve(process.cwd(), 'split-output.2.xml'),
      );
      expect(fs.copyFile).not.toHaveBeenCalledWith(
        expect.stringMatching(/split-output\.xml$/),
        path.resolve(process.cwd(), 'split-output.xml'),
      );
    });

    test('should download GitHub archive successfully without git installed', async () => {
      const downloadGitHubArchiveMock = vi.fn().mockResolvedValue(undefined);
      const execGitShallowCloneMock = vi.fn();
      const isGitInstalledMock = vi.fn().mockResolvedValue(false); // Git is NOT installed

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'yamadashy/repomix',
        {},
        {
          isGitInstalled: isGitInstalledMock,
          execGitShallowClone: execGitShallowCloneMock,
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: async () => createMockDefaultActionResult(),
          downloadGitHubArchive: downloadGitHubArchiveMock,
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(downloadGitHubArchiveMock).toHaveBeenCalledTimes(1);
      expect(execGitShallowCloneMock).not.toHaveBeenCalled();
      expect(isGitInstalledMock).not.toHaveBeenCalled(); // Git check should not be called when archive succeeds
    });

    test('should fallback to git clone when archive download fails', async () => {
      const downloadGitHubArchiveMock = vi.fn().mockRejectedValue(new Error('Archive download failed'));
      const execGitShallowCloneMock = vi.fn(async (_url: string, directory: string) => {
        await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
      });

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: execGitShallowCloneMock,
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: async () => createMockDefaultActionResult(),
          downloadGitHubArchive: downloadGitHubArchiveMock,
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(downloadGitHubArchiveMock).toHaveBeenCalledTimes(1);
      expect(execGitShallowCloneMock).toHaveBeenCalledTimes(1);
    });

    test('should fail when archive download fails and git is not installed', async () => {
      const downloadGitHubArchiveMock = vi.fn().mockRejectedValue(new Error('Archive download failed'));
      const execGitShallowCloneMock = vi.fn();
      const isGitInstalledMock = vi.fn().mockResolvedValue(false); // Git is NOT installed

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      await expect(
        runRemoteAction(
          'yamadashy/repomix',
          {},
          {
            isGitInstalled: isGitInstalledMock,
            execGitShallowClone: execGitShallowCloneMock,
            getRemoteRefs: async () => Promise.resolve(['main']),
            runDefaultAction: async () => createMockDefaultActionResult(),
            downloadGitHubArchive: downloadGitHubArchiveMock,
            isGitHubRepository: vi.fn().mockReturnValue(true),
            parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
            confirmRemoteConfigTrust: vi.fn(),
          },
        ),
      ).rejects.toThrow('Git is not installed or not in the system PATH.');

      expect(downloadGitHubArchiveMock).toHaveBeenCalledTimes(1);
      expect(isGitInstalledMock).toHaveBeenCalledTimes(1); // Git check should be called when fallback to git clone
      expect(execGitShallowCloneMock).not.toHaveBeenCalled();
    });

    test('should pass skipLocalConfig: true via archive download path', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'yamadashy/repomix',
        {},
        {
          isGitInstalled: vi.fn().mockResolvedValue(false),
          execGitShallowClone: vi.fn(),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: true }),
      );
    });

    test('should set skipLocalConfig to false when --remote-trust-config is passed', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'https://gitlab.com/owner/repo.git',
        { remoteTrustConfig: true },
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: vi.fn(async (_url: string, directory: string) => {
            await fs.writeFile(path.join(directory, 'README.md'), 'Hello');
          }),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn(),
          isGitHubRepository: vi.fn().mockReturnValue(false),
          parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: false }),
      );
    });

    test('should keep file processors disabled for remote runs without --remote-trust-config', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      // enableFileProcessors: true simulates the real CLI entry point injection; the
      // remote gate must still force it off because the config comes from a clone.
      await runRemoteAction(
        'yamadashy/repomix',
        { enableFileProcessors: true },
        {
          isGitInstalled: vi.fn().mockResolvedValue(false),
          execGitShallowClone: vi.fn(),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ enableFileProcessors: false }),
      );
    });

    test('should enable file processors for remote runs when --remote-trust-config is passed', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'https://gitlab.com/owner/repo.git',
        { enableFileProcessors: true, remoteTrustConfig: true },
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: vi.fn(async (_url: string, directory: string) => {
            await fs.writeFile(path.join(directory, 'README.md'), 'Hello');
          }),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn(),
          isGitHubRepository: vi.fn().mockReturnValue(false),
          parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ enableFileProcessors: true }),
      );
    });

    test('should set skipLocalConfig to false when REPOMIX_REMOTE_TRUST_CONFIG env var is true', async () => {
      const originalEnv = process.env.REPOMIX_REMOTE_TRUST_CONFIG;
      process.env.REPOMIX_REMOTE_TRUST_CONFIG = 'true';

      try {
        const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

        const deps = {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: vi.fn(async (_url: string, directory: string) => {
            await fs.writeFile(path.join(directory, 'README.md'), 'Hello');
          }),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn(),
          isGitHubRepository: vi.fn().mockReturnValue(false),
          parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          confirmRemoteConfigTrust: vi.fn(),
        };

        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        await runRemoteAction('https://gitlab.com/owner/repo.git', {}, deps);

        expect(runDefaultActionMock).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ skipLocalConfig: false }),
        );
        // The env var is the second way to trust remote config, so it must reach the
        // same confirmation the flag does rather than becoming a silent bypass.
        expect(deps.confirmRemoteConfigTrust).toHaveBeenCalledTimes(1);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.REPOMIX_REMOTE_TRUST_CONFIG;
        } else {
          process.env.REPOMIX_REMOTE_TRUST_CONFIG = originalEnv;
        }
      }
    });

    test('should keep skipLocalConfig true when REPOMIX_REMOTE_TRUST_CONFIG is not "true"', async () => {
      const originalEnv = process.env.REPOMIX_REMOTE_TRUST_CONFIG;
      process.env.REPOMIX_REMOTE_TRUST_CONFIG = 'yes';

      try {
        const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        await runRemoteAction(
          'https://gitlab.com/owner/repo.git',
          {},
          {
            isGitInstalled: async () => Promise.resolve(true),
            execGitShallowClone: vi.fn(async (_url: string, directory: string) => {
              await fs.writeFile(path.join(directory, 'README.md'), 'Hello');
            }),
            getRemoteRefs: async () => Promise.resolve(['main']),
            runDefaultAction: runDefaultActionMock,
            downloadGitHubArchive: vi.fn(),
            isGitHubRepository: vi.fn().mockReturnValue(false),
            parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
            confirmRemoteConfigTrust: vi.fn(),
          },
        );

        expect(runDefaultActionMock).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ skipLocalConfig: true }),
        );
      } finally {
        if (originalEnv === undefined) {
          delete process.env.REPOMIX_REMOTE_TRUST_CONFIG;
        } else {
          process.env.REPOMIX_REMOTE_TRUST_CONFIG = originalEnv;
        }
      }
    });
  });

  describe('--config path validation in remote mode', () => {
    test('should reject relative --config path in remote mode', async () => {
      await expect(
        runRemoteAction(
          'yamadashy/repomix',
          { config: 'repomix.config.json' },
          {
            isGitInstalled: vi.fn().mockResolvedValue(true),
            execGitShallowClone: vi.fn(),
            getRemoteRefs: async () => Promise.resolve(['main']),
            runDefaultAction: vi.fn(),
            downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
            isGitHubRepository: vi.fn().mockReturnValue(true),
            parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
            confirmRemoteConfigTrust: vi.fn(),
          },
        ),
      ).rejects.toThrow('--config must be an absolute path');
    });

    test('should reject dot-relative --config path in remote mode', async () => {
      await expect(
        runRemoteAction(
          'yamadashy/repomix',
          { config: './my-config.json' },
          {
            isGitInstalled: vi.fn().mockResolvedValue(true),
            execGitShallowClone: vi.fn(),
            getRemoteRefs: async () => Promise.resolve(['main']),
            runDefaultAction: vi.fn(),
            downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
            isGitHubRepository: vi.fn().mockReturnValue(true),
            parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
            confirmRemoteConfigTrust: vi.fn(),
          },
        ),
      ).rejects.toThrow('--config must be an absolute path');
    });

    test('should allow absolute --config path in remote mode', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'yamadashy/repomix',
        { config: '/home/user/repomix.config.json' },
        {
          isGitInstalled: vi.fn().mockResolvedValue(true),
          execGitShallowClone: vi.fn(),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalled();
    });

    test('should reject relative --config path even when --remote-trust-config is passed', async () => {
      await expect(
        runRemoteAction(
          'yamadashy/repomix',
          { config: 'repomix.config.json', remoteTrustConfig: true },
          {
            isGitInstalled: vi.fn().mockResolvedValue(true),
            execGitShallowClone: vi.fn(),
            getRemoteRefs: async () => Promise.resolve(['main']),
            runDefaultAction: vi.fn(),
            downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
            isGitHubRepository: vi.fn().mockReturnValue(true),
            parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
            confirmRemoteConfigTrust: vi.fn(),
          },
        ),
      ).rejects.toThrow('--config must be an absolute path');
    });
  });

  describe('copyOutputToCurrentDirectory', () => {
    test('should copy output file when source and target are different', async () => {
      const sourceDir = '/source/dir';
      const targetDir = '/target/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      expect(fs.copyFile).toHaveBeenCalledWith(path.resolve(sourceDir, fileName), path.resolve(targetDir, fileName));
    });

    test('should skip copy when source and target are the same (absolute path)', async () => {
      const sourceDir = '/some/dir';
      const targetDir = '/some/dir';
      const fileName = 'output.txt';

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    test('should skip copy when resolved paths are the same', async () => {
      const absolutePath = '/absolute/path/output.txt';

      await copyOutputToCurrentDirectory('/temp/dir', '/current/dir', absolutePath);

      // When output file is an absolute path, both resolve to the same path
      // This test verifies the source === target check works with absolute output paths
      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    test('should throw RepomixError on permission error', async () => {
      const permError = new Error('Permission denied') as NodeJS.ErrnoException;
      permError.code = 'EACCES';

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockRejectedValue(permError);

      await expect(copyOutputToCurrentDirectory('/source', '/target', 'output.txt')).rejects.toThrow(
        'Permission denied',
      );
    });
  });
});
