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
    copyFile: vi.fn(),
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
    test('should clone the repository', async () => {
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: async (url: string, directory: string) => {
            await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
          },
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
                gitDiffTokenCount: 0,
              },
              config: createMockConfig(),
            } satisfies DefaultActionRunnerResult;
          },
        },
      );
    });
  });

  describe('copyOutputToCurrentDirectory', () => {
    test('should copy output file', async () => {
      const sourceDir = '/source/dir';
      const targetDir = '/target/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.copyFile).mockResolvedValue();

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      expect(fs.copyFile).toHaveBeenCalledWith(path.resolve(sourceDir, fileName), path.resolve(targetDir, fileName));
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
  });
});
