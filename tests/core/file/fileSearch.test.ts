import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';
import { glob as tinyGlob } from 'tinyglobby';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  escapeGlobPattern,
  getIgnoreFilePatterns,
  getIgnorePatterns,
  listDirectories,
  listFiles,
  normalizeGlobPattern,
  parseIgnoreContent,
  searchFiles,
} from '../../../src/core/file/fileSearch.js';
import { checkDirectoryPermissions, PermissionError } from '../../../src/core/file/permissionCheck.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { createMockConfig, isWindows } from '../../testing/testUtils.js';

vi.mock('fs/promises');
vi.mock('globby', () => ({
  globby: vi.fn(),
}));
vi.mock('tinyglobby', () => ({
  glob: vi.fn(),
}));
vi.mock('../../../src/core/file/permissionCheck.js', () => ({
  checkDirectoryPermissions: vi.fn(),
  PermissionError: class extends Error {
    constructor(
      message: string,
      public readonly path: string,
      public readonly code?: string,
    ) {
      super(message);
      this.name = 'PermissionError';
    }
  },
}));

describe('fileSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for fs.stat to assume directory exists and is a directory
    vi.mocked(fs.stat).mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
    } as Stats);
    // Default mock for checkDirectoryPermissions
    vi.mocked(checkDirectoryPermissions).mockResolvedValue({
      hasAllPermission: true,
      details: { read: true, write: true, execute: true },
    });
    // Default mock for globby (used by listDirectories/listFiles)
    vi.mocked(globby).mockResolvedValue([]);
    // Default mock for tinyglobby (used by searchFiles)
    vi.mocked(tinyGlob).mockResolvedValue([]);
    // Default mock for fs.readFile (used by buildIgnoreFilter for gitignore files)
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
  });

  describe('getIgnoreFilePaths', () => {
    test('should return correct paths when .ignore and .repomixignore are enabled (.gitignore handled by gitignore option)', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDotIgnore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });
      const filePatterns = await getIgnoreFilePatterns(mockConfig);
      // .gitignore is not included because it's handled by globby's gitignore option
      expect(filePatterns).toEqual(['**/.ignore', '**/.repomixignore']);
    });

    test('should not include .gitignore when useGitignore is false', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: false,
          useDotIgnore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });
      const filePatterns = await getIgnoreFilePatterns(mockConfig);
      expect(filePatterns).toEqual(['**/.ignore', '**/.repomixignore']);
    });

    test('should not include .ignore when useDotIgnore is false', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDotIgnore: false,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });
      const filePatterns = await getIgnoreFilePatterns(mockConfig);
      // .gitignore is not included because it's handled by globby's gitignore option
      expect(filePatterns).toEqual(['**/.repomixignore']);
    });

    test('should handle empty directories when enabled', async () => {
      const mockConfig = createMockConfig({
        output: {
          includeEmptyDirectories: true,
        },
      });

      const mockFilePaths = ['src/file1.js', 'src/file2.js'];
      const mockEmptyDirs = ['src/empty', 'empty-root'];

      // searchFiles makes 2 tinyglobby calls for default includes:
      // 1. Main file search (onlyFiles: true) — ignore files extracted from results
      // 2. Directory search (onlyDirectories: true)
      vi.mocked(tinyGlob).mockImplementation(async (patterns: unknown, options: unknown) => {
        const opts = options as Record<string, unknown>;
        const pats = patterns as string[];
        // Ignore file discovery call
        if (pats.some((p) => p.includes('.gitignore') || p.includes('.repomixignore'))) {
          return [];
        }
        if (opts?.onlyDirectories) {
          return mockEmptyDirs;
        }
        return mockFilePaths;
      });

      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await searchFiles('/mock/root', mockConfig);

      expect(result.filePaths).toEqual(mockFilePaths);
      expect(result.emptyDirPaths.sort()).toEqual(mockEmptyDirs.sort());
    });

    test('should not collect empty directories when disabled', async () => {
      const mockConfig = createMockConfig({
        output: {
          includeEmptyDirectories: false,
        },
      });

      const mockFilePaths = ['src/file1.js', 'src/file2.js'];

      vi.mocked(tinyGlob).mockResolvedValue(mockFilePaths);

      const result = await searchFiles('/mock/root', mockConfig);

      expect(result.filePaths).toEqual(mockFilePaths);
      expect(result.emptyDirPaths).toEqual([]);
      // One tinyglobby call for default includes: the main file search only.
      // Ignore-file discovery is inlined by extracting from the main results.
      // (no directory search since includeEmptyDirectories is false)
      expect(tinyGlob).toHaveBeenCalledTimes(1);
    });

    test('should extract ignore files from main glob results for default includes', async () => {
      const mockConfig = createMockConfig({
        output: {
          includeEmptyDirectories: false,
        },
        ignore: {
          useGitignore: true,
          useDotIgnore: true,
        },
      });

      // Main glob returns regular files plus a nested .gitignore
      // The .gitignore in src/ contains 'secret.js', which should exclude src/secret.js
      const rawFiles = ['src/file1.js', 'src/secret.js', 'src/.gitignore', 'lib/file2.js'];

      vi.mocked(tinyGlob).mockResolvedValue(rawFiles);
      vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
        if (String(filePath).endsWith('.gitignore')) {
          return 'secret.js';
        }
        return '';
      });

      const result = await searchFiles('/mock/root', mockConfig);

      // Should have only 1 tinyGlob call (no separate ignore-file discovery)
      expect(tinyGlob).toHaveBeenCalledTimes(1);
      // src/secret.js should be filtered by src/.gitignore containing 'secret.js'
      expect(result.filePaths).not.toContain('src/secret.js');
      // Other files are unaffected
      expect(result.filePaths).toContain('src/file1.js');
      expect(result.filePaths).toContain('lib/file2.js');
    });
  });

  describe('getIgnorePatterns', () => {
    test('should return default patterns when useDefaultPatterns is true', async () => {
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });

      const patterns = await getIgnorePatterns(process.cwd(), mockConfig);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('**/node_modules/**');
    });

    test('should include custom patterns', async () => {
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: ['*.custom', 'temp/'],
        },
      });

      const patterns = await getIgnorePatterns(process.cwd(), mockConfig);

      expect(patterns).toEqual(['repomix-output.xml', '*.custom', 'temp/']);
    });

    test('should combine default and custom patterns', async () => {
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: ['*.custom', 'temp/'],
        },
      });

      const patterns = await getIgnorePatterns(process.cwd(), mockConfig);

      expect(patterns).toContain('**/node_modules/**');
      expect(patterns).toContain('*.custom');
      expect(patterns).toContain('temp/');
    });

    test('should include patterns from .git/info/exclude when useGitignore is true', async () => {
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      const mockExcludeContent = `
# Test exclude file
*.ignored
temp-files/
`;

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        // Use path.join to create platform-specific path for testing
        const excludePath = path.join('.git', 'info', 'exclude');
        if (filePath.toString().endsWith(excludePath)) {
          return mockExcludeContent;
        }
        return '';
      });

      const patterns = await getIgnorePatterns('/mock/root', mockConfig);

      // Only test for the exclude file patterns
      expect(patterns).toContain('*.ignored');
      expect(patterns).toContain('temp-files/');
    });
  });

  describe('parseIgnoreContent', () => {
    test('should correctly parse ignore content', () => {
      const content = `
# Comment
node_modules
*.log

.DS_Store
      `;

      const patterns = parseIgnoreContent(content);

      expect(patterns).toEqual(['node_modules', '*.log', '.DS_Store']);
    });

    test('should handle mixed line endings', () => {
      const content = 'node_modules\n*.log\r\n.DS_Store\r';

      const patterns = parseIgnoreContent(content);

      expect(patterns).toEqual(['node_modules', '*.log', '.DS_Store']);
    });
  });

  describe('filterFiles', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      // Re-establish default mocks after reset
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      } as Stats);
      vi.mocked(checkDirectoryPermissions).mockResolvedValue({
        hasAllPermission: true,
        details: { read: true, write: true, execute: true },
      });
      vi.mocked(tinyGlob).mockResolvedValue([]);
      vi.mocked(globby).mockResolvedValue([]);
      // Default: no ignore files found (ENOENT)
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
    });

    test('should call tinyglobby with correct parameters', async () => {
      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: ['*.custom'],
        },
      });

      vi.mocked(tinyGlob).mockResolvedValue(['file1.js', 'file2.js']);
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await searchFiles('/mock/root', mockConfig);

      expect(tinyGlob).toHaveBeenCalledWith(
        ['**/*.js'],
        expect.objectContaining({
          cwd: '/mock/root',
          ignore: expect.arrayContaining(['*.custom']),
          onlyFiles: true,
          absolute: false,
          dot: true,
          followSymbolicLinks: false,
        }),
      );
    });

    test.runIf(!isWindows)('Honor .gitignore files in subdirectories', async () => {
      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      const mockFileStructure = [
        'root/file1.js',
        'root/subdir/file2.js',
        'root/subdir/ignored.js',
        'root/another/file3.js',
      ];

      // Paths are relative to rootDir (/mock/root), so `root/subdir/.gitignore`
      // maps to absolute path `/mock/root/root/subdir/.gitignore`.
      const mockGitignoreContent: Record<string, string> = {};
      mockGitignoreContent[path.join('/mock/root', 'root', '.gitignore')] = '*.log';
      mockGitignoreContent[path.join('/mock/root', 'root', 'subdir', '.gitignore')] = 'ignored.js';

      // buildIgnoreFilter runs a separate tinyGlob for ignore files, then the
      // main search runs another tinyGlob for the user's include patterns.
      vi.mocked(tinyGlob).mockImplementation(async (patterns: unknown) => {
        const pats = patterns as string[];
        if (pats.some((p) => p.includes('.gitignore') || p.includes('.repomixignore'))) {
          return ['root/.gitignore', 'root/subdir/.gitignore'];
        }
        return mockFileStructure;
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockGitignoreContent[filePath as string] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);
      expect(result.filePaths).not.toContain('root/subdir/ignored.js');
      expect(result.emptyDirPaths).toEqual([]);
    });

    test.runIf(!isWindows)('should respect parent directory .gitignore patterns (v16 behavior)', async () => {
      // This test verifies globby v16's key improvement: respecting parent directory .gitignore files.
      // In v15, only .gitignore files in the cwd and below were checked.
      // In v16, .gitignore files in parent directories (up to the git root) are also respected,
      // matching Git's standard behavior. This makes Repomix's file filtering align with Git's expectations.
      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      // Simulate parent .gitignore pattern applying to subdirectory files
      const mockFileStructure = [
        'root/file1.js',
        'root/subdir/file2.js',
        'root/subdir/nested/file3.js',
        // 'root/subdir/nested/ignored-by-parent.js' - filtered by parent .gitignore
      ];

      const mockGitignoreContent = {
        '/mock/root/.gitignore': 'ignored-by-parent.js',
      };

      vi.mocked(tinyGlob).mockImplementation(async (patterns: unknown) => {
        const pats = patterns as string[];
        if (pats.some((p) => p.includes('.gitignore') || p.includes('.repomixignore'))) {
          return ['.gitignore'];
        }
        return [...mockFileStructure, 'root/subdir/nested/ignored-by-parent.js'];
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockGitignoreContent[filePath as keyof typeof mockGitignoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);

      // Verify parent .gitignore pattern filtered out the file
      expect(result.filePaths).not.toContain('root/subdir/nested/ignored-by-parent.js');
      expect(result.emptyDirPaths).toEqual([]);
    });

    test.runIf(!isWindows)('should respect parent directory .ignore patterns', async () => {
      // This test verifies that .ignore files in parent directories are respected,
      // similar to .gitignore behavior in v16.
      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: false,
          useDotIgnore: true,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      // Simulate parent .ignore pattern applying to subdirectory files
      const mockFileStructure = [
        'root/file1.js',
        'root/subdir/file2.js',
        'root/subdir/nested/file3.js',
        // 'root/subdir/nested/ignored-by-parent.js' - filtered by parent .ignore
      ];

      const mockIgnoreContent = {
        '/mock/root/.ignore': 'ignored-by-parent.js',
      };

      vi.mocked(tinyGlob).mockImplementation(async (patterns: unknown) => {
        const pats = patterns as string[];
        if (pats.some((p) => p.includes('.ignore') || p.includes('.repomixignore'))) {
          return ['.ignore'];
        }
        return [...mockFileStructure, 'root/subdir/nested/ignored-by-parent.js'];
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockIgnoreContent[filePath as keyof typeof mockIgnoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);

      // Verify parent .ignore pattern filtered out the file
      expect(result.filePaths).not.toContain('root/subdir/nested/ignored-by-parent.js');
      expect(result.emptyDirPaths).toEqual([]);
    });

    test.runIf(!isWindows)('should respect parent directory .repomixignore patterns', async () => {
      // This test verifies that .repomixignore files in parent directories are respected.
      // .repomixignore is always enabled by default.
      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: false,
          useDotIgnore: false,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      // Simulate parent .repomixignore pattern applying to subdirectory files
      const mockFileStructure = [
        'root/file1.js',
        'root/subdir/file2.js',
        'root/subdir/nested/file3.js',
        // 'root/subdir/nested/ignored-by-repomix.js' - filtered by parent .repomixignore
      ];

      const mockIgnoreContent = {
        '/mock/root/.repomixignore': 'ignored-by-repomix.js',
      };

      vi.mocked(tinyGlob).mockImplementation(async (patterns: unknown) => {
        const pats = patterns as string[];
        if (pats.some((p) => p.includes('.repomixignore'))) {
          return ['.repomixignore'];
        }
        return [...mockFileStructure, 'root/subdir/nested/ignored-by-repomix.js'];
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockIgnoreContent[filePath as keyof typeof mockIgnoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);

      // Verify parent .repomixignore pattern filtered out the file
      expect(result.filePaths).not.toContain('root/subdir/nested/ignored-by-repomix.js');
      expect(result.emptyDirPaths).toEqual([]);
    });

    test('should not apply .gitignore when useGitignore is false', async () => {
      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: false,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      const sep = path.sep;
      const mockFileStructure = [
        `root${sep}file1.js`,
        `root${sep}another${sep}file3.js`,
        `root${sep}subdir${sep}file2.js`,
        `root${sep}subdir${sep}ignored.js`,
      ];

      vi.mocked(tinyGlob).mockResolvedValue(mockFileStructure);

      const result = await searchFiles('/mock/root', mockConfig);

      expect(result.filePaths).toEqual([
        `root${sep}another${sep}file3.js`,
        `root${sep}subdir${sep}file2.js`,
        `root${sep}subdir${sep}ignored.js`,
        `root${sep}file1.js`,
      ]);
      expect(result.filePaths).toContain(`root${sep}subdir${sep}ignored.js`);
      expect(result.emptyDirPaths).toEqual([]);
    });

    test('should handle git worktree correctly', async () => {
      // Mock .git file content for worktree
      const gitWorktreeContent = 'gitdir: /path/to/main/repo/.git/worktrees/feature-branch';

      // Mock fs.stat - first call for rootDir, subsequent calls for .git file
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        } as Stats)
        .mockResolvedValue({
          isFile: () => true,
          isDirectory: () => false,
        } as Stats);
      vi.mocked(fs.readFile).mockResolvedValue(gitWorktreeContent);

      // Override checkDirectoryPermissions mock for this test
      vi.mocked(checkDirectoryPermissions).mockResolvedValue({
        hasAllPermission: true,
        details: { read: true, write: true, execute: true },
      });

      // Mock tinyglobby to return some test files
      vi.mocked(tinyGlob).mockResolvedValue(['file1.js', 'file2.js']);

      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });

      const result = await searchFiles('/test/dir', mockConfig);

      // Check that tinyglobby was called with correct ignore patterns
      const executeTinyGlobCall = vi.mocked(tinyGlob).mock.calls[0];
      const ignorePatterns = executeTinyGlobCall[1]?.ignore as string[];

      // Verify .git file (not directory) is in ignore patterns
      expect(ignorePatterns).toContain('.git');
      // Verify .git/** is not in ignore patterns
      expect(ignorePatterns).not.toContain('.git/**');

      // Verify the files were returned correctly
      expect(result.filePaths).toEqual(['file1.js', 'file2.js']);
    });

    test.runIf(!isWindows)('should handle git worktree with parent .gitignore correctly', async () => {
      // This test verifies that git worktree environments correctly handle parent directory .gitignore files.
      // It combines worktree detection with parent .gitignore pattern application.

      // Mock .git file content for worktree
      const gitWorktreeContent = 'gitdir: /path/to/main/repo/.git/worktrees/feature-branch';

      // Mock fs.stat - first call for rootDir, subsequent calls for .git file
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        } as Stats)
        .mockResolvedValue({
          isFile: () => true,
          isDirectory: () => false,
        } as Stats);

      // Override checkDirectoryPermissions mock for this test
      vi.mocked(checkDirectoryPermissions).mockResolvedValue({
        hasAllPermission: true,
        details: { read: true, write: true, execute: true },
      });

      // Simulate parent .gitignore pattern in worktree environment
      const mockFileStructure = [
        'file1.js',
        'file2.js',
        'subdir/file3.js',
        // 'subdir/ignored-in-worktree.js' - filtered by parent .gitignore
      ];

      // buildIgnoreFilter reads .gitignore at path.join(rootDir, relativePath)
      const mockGitignoreContent: Record<string, string> = {};
      mockGitignoreContent[path.join('/test/worktree', '.gitignore')] = 'ignored-in-worktree.js';

      vi.mocked(tinyGlob).mockImplementation(async (patterns: unknown) => {
        const pats = patterns as string[];
        if (pats.some((p) => p.includes('.gitignore') || p.includes('.repomixignore'))) {
          return ['.gitignore'];
        }
        return [...mockFileStructure, 'subdir/ignored-in-worktree.js'];
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        if ((filePath as string).endsWith('.git')) {
          return gitWorktreeContent;
        }
        return mockGitignoreContent[filePath as string] || '';
      });

      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true, // Enable default patterns to trigger worktree detection
          customPatterns: [],
        },
      });

      const result = await searchFiles('/test/worktree', mockConfig);

      // Verify parent .gitignore pattern filtered out the file in worktree
      expect(result.filePaths).not.toContain('subdir/ignored-in-worktree.js');
      expect(result.filePaths).toContain('file1.js');
      expect(result.filePaths).toContain('file2.js');
      expect(result.filePaths).toContain('subdir/file3.js');
      expect(result.filePaths).not.toContain('subdir/ignored-in-worktree.js');

      // Verify .git file (not directory) is in ignore patterns (worktree-specific behavior)
      const executeTinyGlobCall = vi.mocked(tinyGlob).mock.calls[0];
      const ignorePatterns = executeTinyGlobCall[1]?.ignore as string[];
      expect(ignorePatterns).toContain('.git');
      expect(ignorePatterns).not.toContain('.git/**');
    });

    test('should handle regular git repository correctly', async () => {
      // Mock .git as a directory
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        } as Stats)
        .mockResolvedValue({
          isFile: () => false,
          isDirectory: () => true,
        } as Stats);

      // Override checkDirectoryPermissions mock for this test
      vi.mocked(checkDirectoryPermissions).mockResolvedValue({
        hasAllPermission: true,
        details: { read: true, write: true, execute: true },
      });

      // Mock tinyglobby to return some test files
      vi.mocked(tinyGlob).mockResolvedValue(['file1.js', 'file2.js']);

      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });

      const result = await searchFiles('/test/dir', mockConfig);

      // Check that tinyglobby was called with correct ignore patterns
      const executeTinyGlobCall = vi.mocked(tinyGlob).mock.calls[0];
      const ignorePatterns = executeTinyGlobCall[1]?.ignore as string[];

      // Verify .git/** is in ignore patterns for regular git repos
      expect(ignorePatterns).toContain('.git/**');
      // Verify just .git is not in ignore patterns
      expect(ignorePatterns).not.toContain('.git');

      // Verify the files were returned correctly
      expect(result.filePaths).toEqual(['file1.js', 'file2.js']);
    });
  });

  describe('escapeGlobPattern', () => {
    test('should escape parentheses in pattern', () => {
      const pattern = 'src/(categories)/**/*.ts';
      expect(escapeGlobPattern(pattern)).toBe('src/\\(categories\\)/**/*.ts');
    });

    test('should handle nested brackets', () => {
      const pattern = 'src/(auth)/([id])/**/*.ts';
      expect(escapeGlobPattern(pattern)).toBe('src/\\(auth\\)/\\(\\[id\\]\\)/**/*.ts');
    });

    test('should handle empty string', () => {
      expect(escapeGlobPattern('')).toBe('');
    });

    test('should not modify patterns without special characters', () => {
      const pattern = 'src/components/**/*.ts';
      expect(escapeGlobPattern(pattern)).toBe(pattern);
    });

    test('should handle multiple occurrences of the same bracket type', () => {
      const pattern = 'src/(auth)/(settings)/**/*.ts';
      expect(escapeGlobPattern(pattern)).toBe('src/\\(auth\\)/\\(settings\\)/**/*.ts');
    });
  });

  test('should escape backslashes in pattern', () => {
    const pattern = 'src\\temp\\(categories)';
    expect(escapeGlobPattern(pattern)).toBe('src\\\\temp\\\\\\(categories\\)');
  });

  test('should handle patterns with already escaped special characters', () => {
    const pattern = 'src\\\\(categories)';
    expect(escapeGlobPattern(pattern)).toBe('src\\\\\\\\\\(categories\\)');
  });

  describe('normalizeGlobPattern', () => {
    test('should remove trailing slash from simple directory pattern', () => {
      expect(normalizeGlobPattern('bin/')).toBe('bin');
    });

    test('should remove trailing slash from nested directory pattern', () => {
      expect(normalizeGlobPattern('src/components/')).toBe('src/components');
    });

    test('should preserve patterns without trailing slash', () => {
      expect(normalizeGlobPattern('bin')).toBe('bin');
    });

    test('should preserve patterns ending with **/', () => {
      expect(normalizeGlobPattern('src/**/')).toBe('src/**/');
    });

    test('should preserve patterns with file extensions', () => {
      expect(normalizeGlobPattern('*.ts')).toBe('*.ts');
    });

    test('should handle patterns with special characters', () => {
      expect(normalizeGlobPattern('src/(components)/')).toBe('src/(components)');
    });

    test('should convert **/folder pattern to **/folder/** for consistency', () => {
      expect(normalizeGlobPattern('**/bin')).toBe('**/bin/**');
    });

    test('should convert **/nested/folder pattern to **/nested/folder/**', () => {
      expect(normalizeGlobPattern('**/nested/folder')).toBe('**/nested/folder/**');
    });

    test('should not convert patterns that already have /**', () => {
      expect(normalizeGlobPattern('**/folder/**')).toBe('**/folder/**');
    });

    test('should not convert patterns that already have /**/*', () => {
      expect(normalizeGlobPattern('**/folder/**/*')).toBe('**/folder/**/*');
    });
  });

  describe('searchFiles path validation', () => {
    test('should throw error when target path does not exist', async () => {
      const error = new Error('ENOENT') as Error & { code: string };
      error.code = 'ENOENT';
      vi.mocked(fs.stat).mockRejectedValue(error);

      const mockConfig = createMockConfig();

      await expect(searchFiles('/nonexistent/path', mockConfig)).rejects.toThrow(RepomixError);
      await expect(searchFiles('/nonexistent/path', mockConfig)).rejects.toThrow(
        'Target path does not exist: /nonexistent/path',
      );
    });

    test('should throw PermissionError when access is denied', async () => {
      const error = new Error('EPERM') as Error & { code: string };
      error.code = 'EPERM';
      vi.mocked(fs.stat).mockRejectedValue(error);

      const mockConfig = createMockConfig();

      await expect(searchFiles('/forbidden/path', mockConfig)).rejects.toThrow(PermissionError);
    });

    test('should throw error when target path is a file, not a directory', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      } as Stats);

      const mockConfig = createMockConfig();

      await expect(searchFiles('/path/to/file.txt', mockConfig)).rejects.toThrow(RepomixError);
      await expect(searchFiles('/path/to/file.txt', mockConfig)).rejects.toThrow(
        'Target path is not a directory: /path/to/file.txt. Please specify a directory path, not a file path.',
      );
    });

    test('should succeed when target path is a valid directory', async () => {
      vi.mocked(tinyGlob).mockResolvedValue(['test.js']);

      const mockConfig = createMockConfig();

      const result = await searchFiles('/valid/directory', mockConfig);

      expect(result.filePaths).toEqual(['test.js']);
      expect(result.emptyDirPaths).toEqual([]);
    });

    test('should filter explicit files based on include and ignore patterns', async () => {
      const mockConfig = createMockConfig({
        include: ['**/*.ts'],
        ignore: {
          useGitignore: false,
          useDefaultPatterns: false,
          customPatterns: ['**/*.test.ts'],
        },
      });

      const explicitFiles = [
        '/test/src/file1.ts',
        '/test/src/file1.test.ts',
        '/test/src/file2.js',
        '/test/src/file3.ts',
      ];

      // Mock globby to return the expected filtered files
      vi.mocked(tinyGlob).mockResolvedValue(['src/file1.ts', 'src/file3.ts']);

      const result = await searchFiles('/test', mockConfig, explicitFiles);

      expect(result.filePaths).toEqual(['src/file1.ts', 'src/file3.ts']);
      expect(result.emptyDirPaths).toEqual([]);
    });

    test('should handle explicit files with ignore patterns only', async () => {
      const mockConfig = createMockConfig({
        include: [],
        ignore: {
          useGitignore: false,
          useDefaultPatterns: false,
          customPatterns: ['tests/**'],
        },
      });

      const explicitFiles = ['/test/src/main.ts', '/test/tests/unit.test.ts', '/test/lib/utils.ts'];

      // Mock globby to return the expected filtered files
      vi.mocked(tinyGlob).mockResolvedValue(['src/main.ts', 'lib/utils.ts']);

      const result = await searchFiles('/test', mockConfig, explicitFiles);

      expect(result.filePaths).toEqual(['lib/utils.ts', 'src/main.ts']);
      expect(result.emptyDirPaths).toEqual([]);
    });
  });

  describe('createBaseGlobbyOptions consistency', () => {
    test('should use consistent base options across listDirectories/listFiles (globby)', async () => {
      const mockConfig = createMockConfig({
        include: ['**/*.ts'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: ['*.test.ts'],
        },
      });

      vi.mocked(globby).mockResolvedValue(['file1.ts', 'file2.ts']);
      vi.mocked(tinyGlob).mockResolvedValue(['file1.ts', 'file2.ts']);

      // listDirectories and listFiles still use globby
      await listDirectories('/test/root', mockConfig);
      await listFiles('/test/root', mockConfig);

      const calls = vi.mocked(globby).mock.calls;

      // Verify all globby calls have consistent base options
      for (const call of calls) {
        const options = call[1];
        expect(options).toBeDefined();
        if (!options) continue;

        expect(options).toMatchObject({
          cwd: '/test/root',
          gitignore: true,
          ignoreFiles: expect.arrayContaining(['**/.repomixignore']),
          absolute: false,
          dot: true,
          followSymbolicLinks: false,
        });
      }

      // searchFiles uses tinyglobby — verify its options
      await searchFiles('/test/root', mockConfig);
      const tinyCalls = vi.mocked(tinyGlob).mock.calls;
      for (const call of tinyCalls) {
        const options = call[1];
        expect(options).toBeDefined();
        if (!options) continue;

        expect(options).toMatchObject({
          cwd: '/test/root',
          absolute: false,
          dot: true,
          followSymbolicLinks: false,
        });
      }
    });

    test('should respect gitignore config consistently across all functions', async () => {
      const mockConfigWithoutGitignore = createMockConfig({
        ignore: {
          useGitignore: false,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      vi.mocked(globby).mockResolvedValue([]);
      vi.mocked(tinyGlob).mockResolvedValue([]);

      // Call all functions
      await searchFiles('/test/root', mockConfigWithoutGitignore);
      await listDirectories('/test/root', mockConfigWithoutGitignore);
      await listFiles('/test/root', mockConfigWithoutGitignore);

      // Verify globby calls have gitignore: false (for listDirs/listFiles)
      const calls = vi.mocked(globby).mock.calls;
      for (const call of calls) {
        const options = call[1];
        expect(options).toBeDefined();
        if (!options) continue;

        expect(options).toMatchObject({
          gitignore: false,
        });
      }
    });

    test('should apply custom ignore patterns consistently across all functions', async () => {
      const customPatterns = ['*.custom', 'temp/**'];
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns,
        },
      });

      vi.mocked(globby).mockResolvedValue([]);
      vi.mocked(tinyGlob).mockResolvedValue([]);

      // Call all functions
      await searchFiles('/test/root', mockConfig);
      await listDirectories('/test/root', mockConfig);
      await listFiles('/test/root', mockConfig);

      // Verify all calls include custom patterns in ignore array
      const calls = vi.mocked(globby).mock.calls;
      for (const call of calls) {
        const options = call[1];

        // In our implementation globby is always called with an options object.
        // Guard here to satisfy the type-checker and avoid undefined access.
        expect(options).toBeDefined();
        if (!options) continue;

        const ignorePatterns = options.ignore as string[];
        expect(ignorePatterns).toEqual(expect.arrayContaining(customPatterns));
      }
    });
  });
});
