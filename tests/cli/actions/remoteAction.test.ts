import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { DefaultActionRunnerResult } from '../../../src/cli/actions/defaultAction.js';
import {
  cloneRepository,
  copyOutputToCurrentDirectory,
  runRemoteAction,
} from '../../../src/cli/actions/remoteAction.js';
import { OperationCancelledError } from '../../../src/shared/errorHandle.js';
import { logger } from '../../../src/shared/logger.js';
import { createMockSpinner } from '../../testing/cliDoubles.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Stand-ins for the copy-out step and the spinner. The copy is covered by the
// copyOutputToCurrentDirectory tests below; here it must not write into process.cwd().
const copyOutputToCurrentDirectoryMock = vi.fn();
const { Spinner: MockSpinner } = createMockSpinner();

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
  let loggerSpies: ReturnType<typeof silenceLogger>;

  beforeEach(() => {
    vi.resetAllMocks();
    loggerSpies = silenceLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runRemoteAction', () => {
    test('reports the clone stage and forwards the progress callback to runDefaultAction', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());
      const progressCallback = vi.fn();

      await runRemoteAction('https://gitlab.com/owner/repo.git', {}, progressCallback, {
        isGitInstalled: async () => true,
        execGitShallowClone: vi.fn(async () => {}),
        getRemoteRefs: async () => ['main'],
        runDefaultAction: runDefaultActionMock,
        downloadGitHubArchive: vi.fn(),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(progressCallback).toHaveBeenCalledWith('Cloning repository...');
      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(Object),
        progressCallback,
      );
    });

    test('a throwing progress callback does not fail the remote action', async () => {
      const progressCallback = vi.fn(() => {
        throw new Error('listener failed');
      });

      await expect(
        runRemoteAction('https://gitlab.com/owner/repo.git', {}, progressCallback, {
          isGitInstalled: async () => true,
          execGitShallowClone: vi.fn(async () => {}),
          getRemoteRefs: async () => ['main'],
          runDefaultAction: vi.fn(async () => createMockDefaultActionResult()),
          downloadGitHubArchive: vi.fn(),
          isGitHubRepository: vi.fn().mockReturnValue(false),
          parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          confirmRemoteConfigTrust: vi.fn(),
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        }),
      ).resolves.toBeDefined();
      expect(progressCallback).toHaveBeenCalled();
    });

    test('should clone the repository when not a GitHub repo', async () => {
      const execGitShallowCloneMock = vi.fn(async (_url: string, directory: string) => {
        await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
      });
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      await runRemoteAction('https://gitlab.com/owner/repo.git', {}, undefined, {
        isGitInstalled: async () => Promise.resolve(true),
        execGitShallowClone: execGitShallowCloneMock,
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: runDefaultActionMock,
        downloadGitHubArchive: vi.fn().mockRejectedValue(new Error('Archive download not implemented in test')),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(execGitShallowCloneMock).toHaveBeenCalledTimes(1);
      // Verify skipLocalConfig flag is passed to prevent loading untrusted config from cloned repos
      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: true }),
        undefined,
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
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
        ...overrides,
      });

      test('asks for confirmation when --remote-trust-config is used', async () => {
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true }, undefined, deps);

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
        const deps = createTrustDeps({
          confirmRemoteConfigTrust: vi.fn().mockRejectedValue(new OperationCancelledError('Remote config not trusted')),
        });

        await expect(
          runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true }, undefined, deps),
        ).rejects.toThrow(OperationCancelledError);

        // The declined config must never reach the packer.
        expect(deps.runDefaultAction).not.toHaveBeenCalled();
      });

      test('never migrates a remote clone, even when its config is trusted', async () => {
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true }, undefined, deps);

        // Migration would rewrite the clone's legacy repopack.config.json into a
        // repomix.config.* the trust prompt never showed.
        expect(deps.runDefaultAction).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ skipMigration: true }),
          undefined,
        );
      });

      test('stops forwarding --force once the trust prompt has consumed it', async () => {
        const deps = createTrustDeps();

        await runRemoteAction(
          'https://gitlab.com/owner/repo.git',
          { remoteTrustConfig: true, force: true },
          undefined,
          deps,
        );

        // runDefaultAction rejects --force without --skill-generate. Forwarding it
        // would make the documented `--remote-trust-config --force` escape hatch
        // throw instead of skipping the prompt.
        expect(deps.confirmRemoteConfigTrust).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
        expect(deps.runDefaultAction).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ force: undefined }),
          undefined,
        );
      });

      test('keeps forwarding --force when nothing consumed it, so misuse is still reported', async () => {
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', { force: true }, undefined, deps);

        expect(deps.runDefaultAction).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ force: true }),
          undefined,
        );
      });

      test('does not ask for confirmation when the config is not trusted', async () => {
        const deps = createTrustDeps();

        await runRemoteAction('https://gitlab.com/owner/repo.git', {}, undefined, deps);

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

      await expect(
        runRemoteAction('https://gitlab.com/owner/repo.git', {}, undefined, {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: execGitShallowCloneMock,
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: vi.fn().mockRejectedValue(new Error('Archive download not implemented in test')),
          isGitHubRepository: vi.fn().mockReturnValue(false),
          parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          confirmRemoteConfigTrust: vi.fn(),
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        }),
      ).rejects.toThrow(/exceeds the token budget/);

      // runDefaultAction must receive deferTokenBudgetCheck so it does not throw
      // before the output is copied out of the temp dir.
      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ deferTokenBudgetCheck: true }),
        undefined,
      );
      // The output was copied before the guard threw.
      expect(copyOutputToCurrentDirectoryMock).toHaveBeenCalled();
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

      await runRemoteAction('https://gitlab.com/owner/repo.git', {}, undefined, {
        isGitInstalled: async () => Promise.resolve(true),
        execGitShallowClone: execGitShallowCloneMock,
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: runDefaultActionMock,
        downloadGitHubArchive: vi.fn().mockRejectedValue(new Error('Archive download not implemented in test')),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(copyOutputToCurrentDirectoryMock).toHaveBeenCalledTimes(2);
      expect(copyOutputToCurrentDirectoryMock).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        process.cwd(),
        'split-output.1.xml',
      );
      expect(copyOutputToCurrentDirectoryMock).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        process.cwd(),
        'split-output.2.xml',
      );
      expect(copyOutputToCurrentDirectoryMock).not.toHaveBeenCalledWith(
        expect.any(String),
        process.cwd(),
        'split-output.xml',
      );
    });

    test('should download GitHub archive successfully without git installed', async () => {
      const downloadGitHubArchiveMock = vi.fn().mockResolvedValue(undefined);
      const execGitShallowCloneMock = vi.fn();
      const isGitInstalledMock = vi.fn().mockResolvedValue(false); // Git is NOT installed

      await runRemoteAction('yamadashy/repomix', {}, undefined, {
        isGitInstalled: isGitInstalledMock,
        execGitShallowClone: execGitShallowCloneMock,
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: downloadGitHubArchiveMock,
        isGitHubRepository: vi.fn().mockReturnValue(true),
        parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(downloadGitHubArchiveMock).toHaveBeenCalledTimes(1);
      expect(execGitShallowCloneMock).not.toHaveBeenCalled();
      expect(isGitInstalledMock).not.toHaveBeenCalled(); // Git check should not be called when archive succeeds
    });

    test('should fallback to git clone when archive download fails', async () => {
      const downloadGitHubArchiveMock = vi.fn().mockRejectedValue(new Error('Archive download failed'));
      const execGitShallowCloneMock = vi.fn(async (_url: string, directory: string) => {
        await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
      });

      await runRemoteAction('yamadashy/repomix', {}, undefined, {
        isGitInstalled: async () => Promise.resolve(true),
        execGitShallowClone: execGitShallowCloneMock,
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: downloadGitHubArchiveMock,
        isGitHubRepository: vi.fn().mockReturnValue(true),
        parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(downloadGitHubArchiveMock).toHaveBeenCalledTimes(1);
      expect(execGitShallowCloneMock).toHaveBeenCalledTimes(1);
    });

    test('warns that a path in a /tree/ URL is ignored and clones the branch', async () => {
      const execGitShallowCloneMock = vi.fn(async () => {});

      await runRemoteAction('https://github.com/owner/repo/tree/main/clients/client-ses', {}, undefined, {
        isGitInstalled: async () => true,
        execGitShallowClone: execGitShallowCloneMock,
        getRemoteRefs: async () => ['main'],
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: vi.fn(),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(execGitShallowCloneMock).toHaveBeenCalledWith(
        'https://github.com/owner/repo.git',
        expect.any(String),
        'main',
        undefined,
        undefined,
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('--include "clients/client-ses/**"'));
    });

    test('warns about a path in the URL when the archive download succeeds', async () => {
      const downloadGitHubArchiveMock = vi.fn(async () => {});

      await runRemoteAction('https://github.com/owner/repo/tree/main/some/path', { remoteBranch: 'main' }, undefined, {
        isGitInstalled: async () => true,
        execGitShallowClone: vi.fn(async () => {}),
        getRemoteRefs: async () => ['main'],
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: downloadGitHubArchiveMock,
        isGitHubRepository: vi.fn().mockReturnValue(true),
        parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'owner', repo: 'repo', ref: 'main/some/path' }),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(downloadGitHubArchiveMock).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'main' }),
        expect.any(String),
        expect.any(Object),
        expect.any(Function),
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('--include "some/path/**"'));
    });

    test('does not name a path it cannot split from an unknown ref', async () => {
      await runRemoteAction('https://github.com/owner/repo/blob/feature/x/a.ts', {}, undefined, {
        isGitInstalled: async () => true,
        execGitShallowClone: vi.fn(async () => {}),
        getRemoteRefs: async () => ['main'],
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: vi.fn(async () => {}),
        isGitHubRepository: vi.fn().mockReturnValue(true),
        parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'owner', repo: 'repo' }),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('The path in the remote URL is ignored'));
      expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('x/a.ts'));
    });

    test.each([
      ['a quote', 'a%22b'],
      ['a comma', 'a,b'],
      ['a glob character', 'a*b'],
      ['shell syntax', '%24(x)'],
      ['a control character', 'a%1Bb'],
    ])('does not echo a path containing %s', async (_label, segment) => {
      await runRemoteAction(`https://github.com/owner/repo/tree/main/${segment}`, {}, undefined, {
        isGitInstalled: async () => true,
        execGitShallowClone: vi.fn(async () => {}),
        getRemoteRefs: async () => ['main'],
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: vi.fn(),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('The path in the remote URL is ignored'));
      expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('--include "'));
    });

    test('suggests --include for paths with route-group parentheses and brackets', async () => {
      await runRemoteAction('https://github.com/owner/repo/tree/main/app/(marketing)/[slug]', {}, undefined, {
        isGitInstalled: async () => true,
        execGitShallowClone: vi.fn(async () => {}),
        getRemoteRefs: async () => ['main'],
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: vi.fn(),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('--include "app/(marketing)/[slug]/**"'));
    });

    test('does not warn about a path for a plain branch URL', async () => {
      await runRemoteAction('https://github.com/owner/repo/tree/main', {}, undefined, {
        isGitInstalled: async () => true,
        execGitShallowClone: vi.fn(async () => {}),
        getRemoteRefs: async () => ['main'],
        runDefaultAction: async () => createMockDefaultActionResult(),
        downloadGitHubArchive: vi.fn(),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('does not fall back to git clone when the archive download is cancelled', async () => {
      const controller = new AbortController();
      let tempDirPath = '';
      const downloadGitHubArchiveMock = vi.fn(async (_repoInfo: unknown, directory: string) => {
        tempDirPath = directory;
        controller.abort();
        throw new DOMException('This operation was aborted', 'AbortError');
      });
      const execGitShallowCloneMock = vi.fn();
      const runDefaultActionMock = vi.fn();

      await expect(
        runRemoteAction('yamadashy/repomix', { signal: controller.signal }, undefined, {
          isGitInstalled: async () => true,
          execGitShallowClone: execGitShallowCloneMock,
          getRemoteRefs: async () => ['main'],
          runDefaultAction: runDefaultActionMock,
          downloadGitHubArchive: downloadGitHubArchiveMock,
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        }),
      ).rejects.toMatchObject({ name: 'AbortError' });

      expect(downloadGitHubArchiveMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
        expect.any(Function),
      );
      expect(execGitShallowCloneMock).not.toHaveBeenCalled();
      expect(runDefaultActionMock).not.toHaveBeenCalled();
      await expect(fs.stat(tempDirPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    test('passes the signal to git clone and to runDefaultAction', async () => {
      const { signal } = new AbortController();
      const execGitShallowCloneMock = vi.fn(async () => {});
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      await runRemoteAction('https://gitlab.com/owner/repo.git', { signal }, undefined, {
        isGitInstalled: async () => true,
        execGitShallowClone: execGitShallowCloneMock,
        getRemoteRefs: async () => ['main'],
        runDefaultAction: runDefaultActionMock,
        downloadGitHubArchive: vi.fn(),
        isGitHubRepository: vi.fn().mockReturnValue(false),
        parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(execGitShallowCloneMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        undefined,
        undefined,
        signal,
      );
      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ signal }),
        undefined,
      );
    });

    test('should fail when archive download fails and git is not installed', async () => {
      const downloadGitHubArchiveMock = vi.fn().mockRejectedValue(new Error('Archive download failed'));
      const execGitShallowCloneMock = vi.fn();
      const isGitInstalledMock = vi.fn().mockResolvedValue(false); // Git is NOT installed

      await expect(
        runRemoteAction('yamadashy/repomix', {}, undefined, {
          isGitInstalled: isGitInstalledMock,
          execGitShallowClone: execGitShallowCloneMock,
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: async () => createMockDefaultActionResult(),
          downloadGitHubArchive: downloadGitHubArchiveMock,
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        }),
      ).rejects.toThrow('Git is not installed or not in the system PATH.');

      expect(downloadGitHubArchiveMock).toHaveBeenCalledTimes(1);
      expect(isGitInstalledMock).toHaveBeenCalledTimes(1); // Git check should be called when fallback to git clone
      expect(execGitShallowCloneMock).not.toHaveBeenCalled();
    });

    test('should pass skipLocalConfig: true via archive download path', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      await runRemoteAction('yamadashy/repomix', {}, undefined, {
        isGitInstalled: vi.fn().mockResolvedValue(false),
        execGitShallowClone: vi.fn(),
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: runDefaultActionMock,
        downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
        isGitHubRepository: vi.fn().mockReturnValue(true),
        parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: true }),
        undefined,
      );
    });

    test('should set skipLocalConfig to false when --remote-trust-config is passed', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      await runRemoteAction('https://gitlab.com/owner/repo.git', { remoteTrustConfig: true }, undefined, {
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
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: false }),
        undefined,
      );
    });

    test('should keep file processors disabled for remote runs without --remote-trust-config', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      // enableFileProcessors: true simulates the real CLI entry point injection; the
      // remote gate must still force it off because the config comes from a clone.
      await runRemoteAction('yamadashy/repomix', { enableFileProcessors: true }, undefined, {
        isGitInstalled: vi.fn().mockResolvedValue(false),
        execGitShallowClone: vi.fn(),
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: runDefaultActionMock,
        downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
        isGitHubRepository: vi.fn().mockReturnValue(true),
        parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ enableFileProcessors: false }),
        undefined,
      );
    });

    test('should enable file processors for remote runs when --remote-trust-config is passed', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      await runRemoteAction(
        'https://gitlab.com/owner/repo.git',
        { enableFileProcessors: true, remoteTrustConfig: true },
        undefined,
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
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ enableFileProcessors: true }),
        undefined,
      );
    });

    test('should set skipLocalConfig to false when REPOMIX_REMOTE_TRUST_CONFIG env var is true', async () => {
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
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
        env: { REPOMIX_REMOTE_TRUST_CONFIG: 'true' },
      };

      await runRemoteAction('https://gitlab.com/owner/repo.git', {}, undefined, deps);

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: false }),
        undefined,
      );
      // The env var is the second way to trust remote config, so it must reach the
      // same confirmation the flag does rather than becoming a silent bypass.
      expect(deps.confirmRemoteConfigTrust).toHaveBeenCalledTimes(1);
    });

    test('should keep skipLocalConfig true when REPOMIX_REMOTE_TRUST_CONFIG is not "true"', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      await runRemoteAction('https://gitlab.com/owner/repo.git', {}, undefined, {
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
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
        env: { REPOMIX_REMOTE_TRUST_CONFIG: 'yes' },
      });

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: true }),
        undefined,
      );
    });
  });

  describe('--skill-generate in remote mode', () => {
    // Assembled from parts so the fixture does not read as a real basic-auth literal to secret scanners.
    const credential = 'token';
    const repoUrl = `https://user:${credential}@gitlab.com/owner/my-repo.git`;

    const createSkillDeps = () => ({
      isGitInstalled: async () => true,
      execGitShallowClone: vi.fn(async () => {}),
      getRemoteRefs: async () => ['main'],
      runDefaultAction: vi.fn(async () => ({
        ...createMockDefaultActionResult(),
        config: createMockConfig({ skillGenerate: true }),
      })),
      downloadGitHubArchive: vi.fn(),
      isGitHubRepository: vi.fn().mockReturnValue(false),
      parseGitHubRepoInfo: vi.fn().mockReturnValue(null),
      isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
      confirmRemoteConfigTrust: vi.fn(),
      copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
      resolveAndPrepareSkillDir: vi.fn(async (skillOutput: string) => `/resolved/${skillOutput}`),
      promptSkillLocation: vi.fn(async (skillName: string) => ({
        location: 'project' as const,
        skillDir: `/prompted/${skillName}`,
      })),
      Spinner: MockSpinner,
    });

    test('uses --skill-output without prompting and passes the resolved skill settings to the packer', async () => {
      const deps = createSkillDeps();

      await runRemoteAction(
        repoUrl,
        { skillGenerate: 'custom-skill', skillOutput: 'out', force: true },
        undefined,
        deps,
      );

      expect(deps.resolveAndPrepareSkillDir).toHaveBeenCalledWith('out', process.cwd(), true);
      expect(deps.promptSkillLocation).not.toHaveBeenCalled();
      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({
          skillName: 'custom-skill',
          skillDir: '/resolved/out',
          skillProjectName: 'My Repo',
          // The source URL ends up in SKILL.md, so credentials must be stripped
          skillSourceUrl: expect.not.stringContaining('token'),
          force: true,
        }),
        undefined,
      );
      // Skill output is written straight to its target, so nothing is copied out of the temp dir
      expect(copyOutputToCurrentDirectoryMock).not.toHaveBeenCalled();
    });

    test('prompts for the skill location with a name derived from the URL when --skill-output is omitted', async () => {
      const deps = createSkillDeps();

      await runRemoteAction(repoUrl, { skillGenerate: true }, undefined, deps);

      expect(deps.resolveAndPrepareSkillDir).not.toHaveBeenCalled();
      expect(deps.promptSkillLocation).toHaveBeenCalledWith('repomix-reference-my-repo', process.cwd());
      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({
          skillName: 'repomix-reference-my-repo',
          skillDir: '/prompted/repomix-reference-my-repo',
        }),
        undefined,
      );
    });

    test('rejects a whitespace-only --skill-output before packing', async () => {
      const deps = createSkillDeps();

      await expect(
        runRemoteAction(repoUrl, { skillGenerate: true, skillOutput: '   ' }, undefined, deps),
      ).rejects.toThrow('--skill-output path cannot be empty');

      expect(deps.resolveAndPrepareSkillDir).not.toHaveBeenCalled();
      expect(deps.promptSkillLocation).not.toHaveBeenCalled();
      expect(deps.runDefaultAction).not.toHaveBeenCalled();
    });

    test('leaves skill settings unset when --skill-generate is not used', async () => {
      const deps = createSkillDeps();
      deps.runDefaultAction.mockResolvedValue(createMockDefaultActionResult());

      await runRemoteAction(repoUrl, {}, undefined, deps);

      expect(deps.promptSkillLocation).not.toHaveBeenCalled();
      expect(deps.runDefaultAction).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({
          skillName: undefined,
          skillDir: undefined,
          skillProjectName: undefined,
          skillSourceUrl: undefined,
        }),
        undefined,
      );
    });
  });

  describe('--config path validation in remote mode', () => {
    test('should reject relative --config path in remote mode', async () => {
      await expect(
        runRemoteAction('yamadashy/repomix', { config: 'repomix.config.json' }, undefined, {
          isGitInstalled: vi.fn().mockResolvedValue(true),
          execGitShallowClone: vi.fn(),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: vi.fn(),
          downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        }),
      ).rejects.toThrow('--config must be an absolute path');
    });

    test('should reject dot-relative --config path in remote mode', async () => {
      await expect(
        runRemoteAction('yamadashy/repomix', { config: './my-config.json' }, undefined, {
          isGitInstalled: vi.fn().mockResolvedValue(true),
          execGitShallowClone: vi.fn(),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: vi.fn(),
          downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        }),
      ).rejects.toThrow('--config must be an absolute path');
    });

    test('should allow absolute --config path in remote mode', async () => {
      const runDefaultActionMock = vi.fn(async () => createMockDefaultActionResult());

      await runRemoteAction('yamadashy/repomix', { config: '/home/user/repomix.config.json' }, undefined, {
        isGitInstalled: vi.fn().mockResolvedValue(true),
        execGitShallowClone: vi.fn(),
        getRemoteRefs: async () => Promise.resolve(['main']),
        runDefaultAction: runDefaultActionMock,
        downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
        isGitHubRepository: vi.fn().mockReturnValue(true),
        parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
        isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
        confirmRemoteConfigTrust: vi.fn(),
        copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
        Spinner: MockSpinner,
      });

      expect(runDefaultActionMock).toHaveBeenCalled();
    });

    test('should reject relative --config path even when --remote-trust-config is passed', async () => {
      await expect(
        runRemoteAction('yamadashy/repomix', { config: 'repomix.config.json', remoteTrustConfig: true }, undefined, {
          isGitInstalled: vi.fn().mockResolvedValue(true),
          execGitShallowClone: vi.fn(),
          getRemoteRefs: async () => Promise.resolve(['main']),
          runDefaultAction: vi.fn(),
          downloadGitHubArchive: vi.fn().mockResolvedValue(undefined),
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          confirmRemoteConfigTrust: vi.fn(),
          copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
          Spinner: MockSpinner,
        }),
      ).rejects.toThrow('--config must be an absolute path');
    });
  });

  describe('copyOutputToCurrentDirectory', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-remote-copy-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    test('should copy output file when source and target are different', async () => {
      const sourceDir = path.join(tempDir, 'source');
      // The target directory does not exist yet, so this also covers its creation
      const targetDir = path.join(tempDir, 'target', 'dir');
      const fileName = 'output.txt';
      await fs.mkdir(sourceDir);
      await fs.writeFile(path.join(sourceDir, fileName), 'packed output');

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      expect(await fs.readFile(path.join(targetDir, fileName), 'utf8')).toBe('packed output');
    });

    test('should skip copy when source and target are the same (absolute path)', async () => {
      const copyFile = vi.fn();
      const sourceDir = '/some/dir';
      const targetDir = '/some/dir';
      const fileName = 'output.txt';

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName, { mkdir: vi.fn(), copyFile });

      expect(copyFile).not.toHaveBeenCalled();
    });

    test('should skip copy when resolved paths are the same', async () => {
      const copyFile = vi.fn();
      const absolutePath = '/absolute/path/output.txt';

      await copyOutputToCurrentDirectory('/temp/dir', '/current/dir', absolutePath, { mkdir: vi.fn(), copyFile });

      // When output file is an absolute path, both resolve to the same path
      // This test verifies the source === target check works with absolute output paths
      expect(copyFile).not.toHaveBeenCalled();
    });

    test('should throw RepomixError on permission error', async () => {
      const permError = new Error('Permission denied') as NodeJS.ErrnoException;
      permError.code = 'EACCES';

      await expect(
        copyOutputToCurrentDirectory('/source', '/target', 'output.txt', {
          mkdir: vi.fn().mockResolvedValue(undefined),
          copyFile: vi.fn().mockRejectedValue(permError),
        }),
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('cloneRepository credential redaction', () => {
    // Assembled from parts so the fixture does not read as a real basic-auth
    // literal to secret scanners.
    const token = 'ghp_secrettoken';
    const credentialedUrl = `https://oauth2:${token}@github.com/owner/repo.git`;

    test('should not log credentials embedded in the repository URL', async () => {
      await cloneRepository(credentialedUrl, '/temp/dir', undefined, {
        execGitShallowClone: vi.fn().mockResolvedValue(undefined),
      });

      const logged = loggerSpies.log.mock.calls.flat().join('\n');
      expect(logged).not.toContain(token);
      expect(logged).toContain('https://***@github.com/owner/repo.git');
    });

    test('should still clone using the original, unredacted URL', async () => {
      const execGitShallowCloneMock = vi.fn().mockResolvedValue(undefined);

      await cloneRepository(credentialedUrl, '/temp/dir', undefined, {
        execGitShallowClone: execGitShallowCloneMock,
      });

      expect(execGitShallowCloneMock).toHaveBeenCalledWith(
        credentialedUrl,
        '/temp/dir',
        undefined,
        undefined,
        undefined,
      );
    });

    test('should not leak credentials through a clone failure message', async () => {
      // Node's execFile puts the full command line into the rejection message,
      // so an unredacted failure would carry the credential to the terminal.
      const execGitShallowCloneMock = vi
        .fn()
        .mockRejectedValue(new Error(`Command failed: git clone --depth 1 -- ${credentialedUrl} /temp/dir`));

      let error: Error | undefined;
      try {
        await cloneRepository(credentialedUrl, '/temp/dir', undefined, {
          execGitShallowClone: execGitShallowCloneMock,
        });
      } catch (err) {
        error = err as Error;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).not.toContain(token);
      expect(error?.message).toContain('https://***@github.com/owner/repo.git');
    });
  });
});
