import * as fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DefaultActionRunnerResult } from '../../../src/cli/actions/defaultAction.js';
import { copyOutputToCurrentDirectory, runRemoteAction } from '../../../src/cli/actions/remoteAction.js';
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
    outputLineCount: 0,
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
          isGitHubRepository: vi.fn().mockResolvedValue(false),
          parseGitHubRepoInfo: vi.fn().mockResolvedValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
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
          isGitHubRepository: vi.fn().mockResolvedValue(true),
          parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
          isGitHubRepository: vi.fn().mockResolvedValue(true),
          parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
            isGitHubRepository: vi.fn().mockResolvedValue(true),
            parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
          isGitHubRepository: vi.fn().mockResolvedValue(true),
          parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
          isGitHubRepository: vi.fn().mockResolvedValue(false),
          parseGitHubRepoInfo: vi.fn().mockResolvedValue(null),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ skipLocalConfig: false }),
      );
    });

    test('should set skipLocalConfig to false when REPOMIX_REMOTE_TRUST_CONFIG env var is true', async () => {
      const originalEnv = process.env.REPOMIX_REMOTE_TRUST_CONFIG;
      process.env.REPOMIX_REMOTE_TRUST_CONFIG = 'true';

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
            isGitHubRepository: vi.fn().mockResolvedValue(false),
            parseGitHubRepoInfo: vi.fn().mockResolvedValue(null),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
          },
        );

        expect(runDefaultActionMock).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ skipLocalConfig: false }),
        );
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
            isGitHubRepository: vi.fn().mockResolvedValue(false),
            parseGitHubRepoInfo: vi.fn().mockResolvedValue(null),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(false),
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
            isGitHubRepository: vi.fn().mockResolvedValue(true),
            parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
            isGitHubRepository: vi.fn().mockResolvedValue(true),
            parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
          isGitHubRepository: vi.fn().mockResolvedValue(true),
          parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
          isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
            isGitHubRepository: vi.fn().mockResolvedValue(true),
            parseGitHubRepoInfo: vi.fn().mockResolvedValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
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
