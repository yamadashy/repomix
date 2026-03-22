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

describe('remoteAction functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('runRemoteAction', () => {
    test('should clone the repository when not a GitHub repo', async () => {
      const execGitShallowCloneMock = vi.fn(async (_url: string, directory: string) => {
        await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
      });
      const runDefaultActionMock = vi.fn(async () => {
        return {
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
        } satisfies DefaultActionRunnerResult;
      });

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
        },
      );

      expect(execGitShallowCloneMock).toHaveBeenCalledTimes(1);
      // Verify isRemote flag is passed to prevent loading untrusted config from cloned repos
      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ isRemote: true }),
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
          runDefaultAction: async () => {
            return {
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
            } satisfies DefaultActionRunnerResult;
          },
          downloadGitHubArchive: downloadGitHubArchiveMock,
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
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
          runDefaultAction: async () => {
            return {
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
            } satisfies DefaultActionRunnerResult;
          },
          downloadGitHubArchive: downloadGitHubArchiveMock,
          isGitHubRepository: vi.fn().mockReturnValue(true),
          parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
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
            runDefaultAction: async () => {
              return {
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
              } satisfies DefaultActionRunnerResult;
            },
            downloadGitHubArchive: downloadGitHubArchiveMock,
            isGitHubRepository: vi.fn().mockReturnValue(true),
            parseGitHubRepoInfo: vi.fn().mockReturnValue({ owner: 'yamadashy', repo: 'repomix' }),
            isArchiveDownloadSupported: vi.fn().mockReturnValue(true),
          },
        ),
      ).rejects.toThrow('Git is not installed or not in the system PATH.');

      expect(downloadGitHubArchiveMock).toHaveBeenCalledTimes(1);
      expect(isGitInstalledMock).toHaveBeenCalledTimes(1); // Git check should be called when fallback to git clone
      expect(execGitShallowCloneMock).not.toHaveBeenCalled();
    });

    test('should pass isRemote: true via archive download path', async () => {
      const runDefaultActionMock = vi.fn(async () => {
        return {
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
        } satisfies DefaultActionRunnerResult;
      });

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
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ isRemote: true }),
      );
    });

    test('should set isRemote to false when --remote-trust-config is passed', async () => {
      const runDefaultActionMock = vi.fn(async () => {
        return {
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
        } satisfies DefaultActionRunnerResult;
      });

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
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ isRemote: false }),
      );
    });

    test('should set isRemote to false when REPOMIX_REMOTE_TRUST_CONFIG env var is true', async () => {
      const originalEnv = process.env.REPOMIX_REMOTE_TRUST_CONFIG;
      process.env.REPOMIX_REMOTE_TRUST_CONFIG = 'true';

      try {
        const runDefaultActionMock = vi.fn(async () => {
          return {
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
          } satisfies DefaultActionRunnerResult;
        });

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
          },
        );

        expect(runDefaultActionMock).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ isRemote: false }),
        );
      } finally {
        if (originalEnv === undefined) {
          delete process.env.REPOMIX_REMOTE_TRUST_CONFIG;
        } else {
          process.env.REPOMIX_REMOTE_TRUST_CONFIG = originalEnv;
        }
      }
    });

    test('should keep isRemote true when REPOMIX_REMOTE_TRUST_CONFIG is not "true"', async () => {
      const originalEnv = process.env.REPOMIX_REMOTE_TRUST_CONFIG;
      process.env.REPOMIX_REMOTE_TRUST_CONFIG = 'yes';

      try {
        const runDefaultActionMock = vi.fn(async () => {
          return {
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
          } satisfies DefaultActionRunnerResult;
        });

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
          },
        );

        expect(runDefaultActionMock).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.objectContaining({ isRemote: true }),
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
          },
        ),
      ).rejects.toThrow('--config must be an absolute path');
    });

    test('should allow absolute --config path in remote mode', async () => {
      const runDefaultActionMock = vi.fn(async () => {
        return {
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
        } satisfies DefaultActionRunnerResult;
      });

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
        },
      );

      expect(runDefaultActionMock).toHaveBeenCalled();
    });
  });

  describe('copyOutputToCurrentDirectory', () => {
    test('should copy output file when source and target are different', async () => {
      const sourceDir = '/source/dir';
      const targetDir = '/target/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.copyFile).mockResolvedValue();

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      expect(fs.copyFile).toHaveBeenCalledWith(path.resolve(sourceDir, fileName), path.resolve(targetDir, fileName));
    });

    test('should skip copy when source and target are the same', async () => {
      const sourceDir = '/tmp/dir';
      const targetDir = '/tmp/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.copyFile).mockResolvedValue();

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      // Should not call copyFile when source and target are the same
      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    test('should skip copy when absolute path resolves to same location', async () => {
      const sourceDir = '/tmp/repomix-123';
      const targetDir = process.cwd();
      const absolutePath = '/tmp/my_private_dir/output.xml';

      vi.mocked(fs.copyFile).mockResolvedValue();

      await copyOutputToCurrentDirectory(sourceDir, targetDir, absolutePath);

      // When absolute path is used, both source and target resolve to the same path
      // path.resolve('/tmp/repomix-123', '/tmp/my_private_dir/output.xml') -> '/tmp/my_private_dir/output.xml'
      // path.resolve(process.cwd(), '/tmp/my_private_dir/output.xml') -> '/tmp/my_private_dir/output.xml'
      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    test('should throw error when copy fails', async () => {
      const sourceDir = '/source/dir';
      const targetDir = '/target/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.copyFile).mockRejectedValue(new Error('Permission denied'));

      await expect(copyOutputToCurrentDirectory(sourceDir, targetDir, fileName)).rejects.toThrow(
        'Failed to copy output file',
      );
    });

    test('should throw helpful error message for EPERM permission errors', async () => {
      const sourceDir = '/tmp/repomix-123';
      const targetDir = 'C:\\Windows\\System32';
      const fileName = 'output.xml';

      const epermError = new Error('operation not permitted') as NodeJS.ErrnoException;
      epermError.code = 'EPERM';
      vi.mocked(fs.copyFile).mockRejectedValue(epermError);

      await expect(copyOutputToCurrentDirectory(sourceDir, targetDir, fileName)).rejects.toThrow(
        /Permission denied.*protected.*--output.*--stdout/s,
      );
    });

    test('should throw helpful error message for EACCES permission errors', async () => {
      const sourceDir = '/tmp/repomix-123';
      const targetDir = '/protected/dir';
      const fileName = 'output.xml';

      const eaccesError = new Error('permission denied') as NodeJS.ErrnoException;
      eaccesError.code = 'EACCES';
      vi.mocked(fs.copyFile).mockRejectedValue(eaccesError);

      await expect(copyOutputToCurrentDirectory(sourceDir, targetDir, fileName)).rejects.toThrow(
        /Permission denied.*protected.*--output.*--stdout/s,
      );
    });
  });
});
