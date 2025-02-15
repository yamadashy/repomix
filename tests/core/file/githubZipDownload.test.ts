import * as fs from 'node:fs/promises';
import path from 'node:path';
import type JSZip from 'jszip';
import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  type GitHubUrlInfo,
  buildZipUrl,
  downloadGitHubZip,
  isGitHubShorthand,
  isGitHubUrlOrShorthand,
  parseGitHubUrl,
} from '../../../src/core/file/githubZipDownload.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

vi.mock('node:fs/promises');
vi.mock('../../../src/shared/logger');

describe('githubZipDownload', () => {
  describe('isGitHubShorthand', () => {
    test('should return true for valid shorthand formats', () => {
      const validFormats = [
        'user/repo',
        'org-name/repo-name',
        'user_name/repo_name',
        'a.b/repo',
        'MyUser123/MyRepo-123',
        'user.name/repo.name',
      ];

      for (const format of validFormats) {
        expect(isGitHubShorthand(format)).toBe(true);
      }
    });

    test('should return false for invalid shorthand formats', () => {
      const invalidFormats = [
        'user', // Missing repo
        '/repo', // Missing user
        'user/', // Missing repo
        '-user/repo', // User starts with hyphen
        'user/-repo', // Repo starts with hyphen
        'user./repo', // User ends with dot
        'user/repo.', // Repo ends with dot
        'user/repo#branch', // Contains invalid character
        'user/repo/extra', // Extra path segment
        'us!er/repo', // Contains invalid character
        'user/re*po', // Contains invalid character
        'user//repo', // Double slash
        '.user/repo', // Starts with dot
        'user/.repo', // Repo starts with dot
        'https://github.com/user/repo', // Full URL
        'git@github.com:user/repo.git', // SSH URL
      ];

      for (const format of invalidFormats) {
        expect(isGitHubShorthand(format)).toBe(false);
      }
    });
  });

  describe('isGitHubUrlOrShorthand', () => {
    test('should return true for GitHub URLs', () => {
      const validUrls = [
        'https://github.com/user/repo',
        'http://github.com/user/repo',
        'git@github.com:user/repo.git',
        'git://github.com/user/repo.git',
        'https://github.com/user/repo/tree/main',
        'https://github.com/user/repo.git',
      ];

      for (const url of validUrls) {
        expect(isGitHubUrlOrShorthand(url)).toBe(true);
      }
    });

    test('should return true for GitHub shorthand', () => {
      const validShorthands = ['user/repo', 'org-name/repo-name', 'user_name/repo_name', 'user.name/repo.name'];

      for (const shorthand of validShorthands) {
        expect(isGitHubUrlOrShorthand(shorthand)).toBe(true);
      }
    });

    test('should return false for non-GitHub URLs and invalid formats', () => {
      const invalidUrls = [
        'https://gitlab.com/user/repo',
        'https://bitbucket.org/user/repo',
        'user',
        '/repo',
        'invalid-url',
        'git@gitlab.com:user/repo.git',
      ];

      for (const url of invalidUrls) {
        expect(isGitHubUrlOrShorthand(url)).toBe(false);
      }
    });
  });

  describe('parseGitHubUrl', () => {
    test('should parse GitHub shorthand format', () => {
      const inputs: [string, GitHubUrlInfo][] = [
        ['user/repo', { owner: 'user', repo: 'repo' }],
        ['org-name/repo-name', { owner: 'org-name', repo: 'repo-name' }],
        ['user_name/repo_name', { owner: 'user_name', repo: 'repo_name' }],
        ['user.name/repo.name', { owner: 'user.name', repo: 'repo.name' }],
      ];

      for (const [input, expected] of inputs) {
        expect(parseGitHubUrl(input)).toEqual(expected);
      }
    });

    test('should parse GitHub URLs', () => {
      const inputs: [string, GitHubUrlInfo][] = [
        ['https://github.com/user/repo', { owner: 'user', repo: 'repo' }],
        ['http://github.com/user/repo', { owner: 'user', repo: 'repo' }],
        ['https://github.com/user/repo.git', { owner: 'user', repo: 'repo' }],
      ];

      for (const [input, expected] of inputs) {
        expect(parseGitHubUrl(input)).toEqual(expected);
      }
    });

    test('should parse complex branch names', () => {
      const cases = [
        ['https://github.com/user/repo/tree/main', 'main'],
        ['https://github.com/user/repo/tree/feature/branch', 'feature/branch'],
        ['https://github.com/user/repo/tree/fix/issue-123/test', 'fix/issue-123/test'],
        ['https://github.com/user/repo/tree/release/v1.0.0', 'release/v1.0.0'],
        ['https://github.com/user/repo/tree/feat/add-support/for/deep/paths', 'feat/add-support/for/deep/paths'],
      ];

      for (const [input, expectedBranch] of cases) {
        const result = parseGitHubUrl(input);
        expect(result.branch).toBe(expectedBranch);
      }
    });

    test('should throw for invalid URLs or formats', () => {
      const invalidInputs = [
        'https://gitlab.com/user/repo',
        'user',
        '/repo',
        'user/',
        'invalid-url',
        'https://github.com/invalid',
      ];

      for (const input of invalidInputs) {
        expect(() => parseGitHubUrl(input)).toThrow(RepomixError);
      }
    });
  });

  describe('buildZipUrl', () => {
    test('should build URL for default branch (HEAD)', () => {
      const urls: [string, string, string | undefined, string][] = [
        ['user', 'repo', undefined, 'https://github.com/user/repo/archive/HEAD.zip'],
        ['org-name', 'repo-name', undefined, 'https://github.com/org-name/repo-name/archive/HEAD.zip'],
        ['user.name', 'repo.name', undefined, 'https://github.com/user.name/repo.name/archive/HEAD.zip'],
      ];

      for (const [owner, repo, branch, expected] of urls) {
        expect(buildZipUrl(owner, repo, branch)).toBe(expected);
      }
    });

    test('should build URL for specific branch', () => {
      const urls = [
        ['user', 'repo', 'main', 'https://github.com/user/repo/archive/refs/heads/main.zip'],
        ['user', 'repo', 'develop', 'https://github.com/user/repo/archive/refs/heads/develop.zip'],
        ['user', 'repo', 'feature/branch', 'https://github.com/user/repo/archive/refs/heads/feature/branch.zip'],
        ['user', 'repo', 'v1.0.0', 'https://github.com/user/repo/archive/refs/heads/v1.0.0.zip'],
      ];

      for (const [owner, repo, branch, expected] of urls) {
        expect(buildZipUrl(owner, repo, branch)).toBe(expected);
      }
    });
  });

  describe('downloadGitHubZip', () => {
    const mockDirectory = '/test/dir';
    type MockZipFile = {
      dir: boolean;
      async?: Mock;
    };
    const mockZipContent: Record<string, MockZipFile> = {
      'repo-main/': { dir: true },
      'repo-main/README.md': { dir: false, async: vi.fn() },
      'repo-main/src/': { dir: true },
      'repo-main/src/index.ts': { dir: false, async: vi.fn() },
    };

    beforeEach(() => {
      vi.resetAllMocks();
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    test('should download and extract zip successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });
      const mockJSZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockZipContent,
        }),
        files: {},
        file: vi.fn(),
        folder: vi.fn(),
        forEach: vi.fn(),
        filter: vi.fn(),
        remove: vi.fn(),
        generateAsync: vi.fn(),
        generateNodeStream: vi.fn(),
        generateInternalStream: vi.fn(),
        loadFile: vi.fn(),
        support: {},
      } as unknown as typeof JSZip;

      // Mock file content async calls
      const nonDirFiles = Object.values(mockZipContent).filter(
        (file): file is MockZipFile & { async: Mock } => !file.dir && file.async !== undefined,
      );
      for (const file of nonDirFiles) {
        file.async.mockResolvedValue(Buffer.from('test content'));
      }

      await downloadGitHubZip('yamadashy/repomix', mockDirectory, undefined, {
        fetch: mockFetch,
        JSZip: mockJSZip,
      });

      expect(mockFetch).toHaveBeenCalledWith('https://github.com/yamadashy/repomix/archive/HEAD.zip');
      expect(mockJSZip.loadAsync).toHaveBeenCalled();
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    test('should handle HTTP error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        downloadGitHubZip('yamadashy/repomix', mockDirectory, undefined, {
          fetch: mockFetch,
          JSZip: {} as typeof JSZip,
        }),
      ).rejects.toThrow(RepomixError);
    });

    test('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        downloadGitHubZip('yamadashy/repomix', mockDirectory, undefined, {
          fetch: mockFetch,
          JSZip: {} as typeof JSZip,
        }),
      ).rejects.toThrow(RepomixError);
    });

    test('should handle zip extraction errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });
      const mockJSZip = {
        loadAsync: vi.fn().mockRejectedValue(new Error('Invalid zip file')),
        files: {},
        file: vi.fn(),
        folder: vi.fn(),
        forEach: vi.fn(),
        filter: vi.fn(),
        remove: vi.fn(),
        generateAsync: vi.fn(),
        generateNodeStream: vi.fn(),
        generateInternalStream: vi.fn(),
        loadFile: vi.fn(),
        support: {},
      } as unknown as typeof JSZip;

      await expect(
        downloadGitHubZip('yamadashy/repomix', mockDirectory, undefined, {
          fetch: mockFetch,
          JSZip: mockJSZip,
        }),
      ).rejects.toThrow(RepomixError);
    });

    test('should handle file system errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });
      const mockJSZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockZipContent,
        }),
        files: {},
        file: vi.fn(),
        folder: vi.fn(),
        forEach: vi.fn(),
        filter: vi.fn(),
        remove: vi.fn(),
        generateAsync: vi.fn(),
        generateNodeStream: vi.fn(),
        generateInternalStream: vi.fn(),
        loadFile: vi.fn(),
        support: {},
      } as unknown as typeof JSZip;

      const nonDirFiles = Object.values(mockZipContent).filter(
        (file): file is MockZipFile & { async: Mock } => !file.dir && file.async !== undefined,
      );
      for (const file of nonDirFiles) {
        file.async.mockResolvedValue(Buffer.from('test content'));
      }

      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(
        downloadGitHubZip('yamadashy/repomix', mockDirectory, undefined, {
          fetch: mockFetch,
          JSZip: mockJSZip,
        }),
      ).rejects.toThrow(RepomixError);
    });

    test('should use specified branch for download', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });
      const mockJSZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockZipContent,
        }),
        files: {},
        file: vi.fn(),
        folder: vi.fn(),
        forEach: vi.fn(),
        filter: vi.fn(),
        remove: vi.fn(),
        generateAsync: vi.fn(),
        generateNodeStream: vi.fn(),
        generateInternalStream: vi.fn(),
        loadFile: vi.fn(),
        support: {},
      } as unknown as typeof JSZip;

      const nonDirFiles = Object.values(mockZipContent).filter(
        (file): file is MockZipFile & { async: Mock } => !file.dir && file.async !== undefined,
      );
      for (const file of nonDirFiles) {
        file.async.mockResolvedValue(Buffer.from('test content'));
      }

      await downloadGitHubZip('yamadashy/repomix', mockDirectory, 'develop', {
        fetch: mockFetch,
        JSZip: mockJSZip,
      });

      expect(mockFetch).toHaveBeenCalledWith('https://github.com/yamadashy/repomix/archive/refs/heads/develop.zip');
    });
  });
});
