import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';
import { minimatch } from 'minimatch';
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
    // Default mock for globby
    vi.mocked(globby).mockResolvedValue([]);
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

      vi.mocked(globby).mockImplementation(async (_: unknown, options: unknown) => {
        if ((options as Record<string, unknown>)?.onlyDirectories) {
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

      vi.mocked(globby).mockImplementation(async (_: unknown, options: unknown) => {
        if ((options as Record<string, unknown>)?.onlyDirectories) {
          throw new Error('Should not search for directories when disabled');
        }
        return mockFilePaths;
      });

      const result = await searchFiles('/mock/root', mockConfig);

      expect(result.filePaths).toEqual(mockFilePaths);
      expect(result.emptyDirPaths).toEqual([]);
      expect(globby).toHaveBeenCalledTimes(1);
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
    });

    test('should call globby with correct parameters', async () => {
      const mockConfig = createMockConfig({
        include: ['**/*.js'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: ['*.custom'],
        },
      });

      vi.mocked(globby).mockResolvedValue(['file1.js', 'file2.js']);
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await searchFiles('/mock/root', mockConfig);

      expect(globby).toHaveBeenCalledWith(
        ['**/*.js'],
        expect.objectContaining({
          cwd: '/mock/root',
          ignore: expect.arrayContaining(['*.custom']),
          gitignore: true,
          ignoreFiles: expect.arrayContaining(['**/.repomixignore']),
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

      const mockGitignoreContent = {
        '/mock/root/.gitignore': '*.log',
        '/mock/root/subdir/.gitignore': 'ignored.js',
      };

      vi.mocked(globby).mockImplementation(async () => {
        // Simulate filtering files based on .gitignore
        return mockFileStructure.filter((file) => {
          const relativePath = file.replace('root/', '');
          const dir = path.dirname(relativePath);
          const gitignorePath = path.join('/mock/root', dir, '.gitignore');
          const gitignoreContent = mockGitignoreContent[gitignorePath as keyof typeof mockGitignoreContent];
          if (gitignoreContent && minimatch(path.basename(file), gitignoreContent)) {
            return false;
          }
          return true;
        });
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockGitignoreContent[filePath as keyof typeof mockGitignoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);
      expect(result.filePaths).toEqual(['root/another/file3.js', 'root/subdir/file2.js', 'root/file1.js']);
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

      vi.mocked(globby).mockImplementation(async () => {
        // Simulate globby v16 behavior: parent .gitignore patterns apply to all subdirectories
        return mockFileStructure.filter((file) => {
          const basename = path.basename(file);
          const parentGitignore = mockGitignoreContent['/mock/root/.gitignore'];
          if (minimatch(basename, parentGitignore)) {
            return false;
          }
          return true;
        });
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockGitignoreContent[filePath as keyof typeof mockGitignoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);

      // Verify parent .gitignore pattern filtered out the file
      expect(result.filePaths).toHaveLength(3);
      expect(result.filePaths).toContain('root/file1.js');
      expect(result.filePaths).toContain('root/subdir/file2.js');
      expect(result.filePaths).toContain('root/subdir/nested/file3.js');
      expect(result.filePaths).not.toContain('root/subdir/nested/ignored-by-parent.js');
      expect(result.emptyDirPaths).toEqual([]);

      // Verify gitignore option was passed to globby
      expect(globby).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          gitignore: true,
        }),
      );
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

      vi.mocked(globby).mockImplementation(async () => {
        // Simulate parent .ignore patterns applying to all subdirectories
        return mockFileStructure.filter((file) => {
          const basename = path.basename(file);
          const parentIgnore = mockIgnoreContent['/mock/root/.ignore'];
          if (minimatch(basename, parentIgnore)) {
            return false;
          }
          return true;
        });
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockIgnoreContent[filePath as keyof typeof mockIgnoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);

      // Verify parent .ignore pattern filtered out the file
      expect(result.filePaths).toHaveLength(3);
      expect(result.filePaths).toContain('root/file1.js');
      expect(result.filePaths).toContain('root/subdir/file2.js');
      expect(result.filePaths).toContain('root/subdir/nested/file3.js');
      expect(result.filePaths).not.toContain('root/subdir/nested/ignored-by-parent.js');
      expect(result.emptyDirPaths).toEqual([]);

      // Verify ignoreFiles option includes .ignore
      expect(globby).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ignoreFiles: expect.arrayContaining(['**/.ignore']),
        }),
      );
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

      vi.mocked(globby).mockImplementation(async () => {
        // Simulate parent .repomixignore patterns applying to all subdirectories
        return mockFileStructure.filter((file) => {
          const basename = path.basename(file);
          const parentIgnore = mockIgnoreContent['/mock/root/.repomixignore'];
          if (minimatch(basename, parentIgnore)) {
            return false;
          }
          return true;
        });
      });

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        return mockIgnoreContent[filePath as keyof typeof mockIgnoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig);

      // Verify parent .repomixignore pattern filtered out the file
      expect(result.filePaths).toHaveLength(3);
      expect(result.filePaths).toContain('root/file1.js');
      expect(result.filePaths).toContain('root/subdir/file2.js');
      expect(result.filePaths).toContain('root/subdir/nested/file3.js');
      expect(result.filePaths).not.toContain('root/subdir/nested/ignored-by-repomix.js');
      expect(result.emptyDirPaths).toEqual([]);

      // Verify ignoreFiles option includes .repomixignore
      expect(globby).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ignoreFiles: expect.arrayContaining(['**/.repomixignore']),
        }),
      );
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

      const mockFileStructure = [
        'root/file1.js',
        'root/another/file3.js',
        'root/subdir/file2.js',
        'root/subdir/ignored.js',
      ];

      vi.mocked(globby).mockResolvedValue(mockFileStructure);

      const result = await searchFiles('/mock/root', mockConfig);

      expect(result.filePaths).toEqual(mockFileStructure);
      expect(result.filePaths).toContain('root/subdir/ignored.js');
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

      // Mock globby to return some test files
      vi.mocked(globby).mockResolvedValue(['file1.js', 'file2.js']);

      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });

      const result = await searchFiles('/test/dir', mockConfig);

      // Check that globby was called with correct ignore patterns
      const executeGlobbyCall = vi.mocked(globby).mock.calls[0];
      const ignorePatterns = executeGlobbyCall[1]?.ignore as string[];

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

      const mockGitignoreContent = {
        '/test/worktree/.gitignore': 'ignored-in-worktree.js',
      };

      // Mock globby to return filtered file structure
      const filteredFiles = mockFileStructure.filter((file) => {
        const basename = path.basename(file);
        const parentGitignore = mockGitignoreContent['/test/worktree/.gitignore'];
        if (minimatch(basename, parentGitignore)) {
          return false;
        }
        return true;
      });
      vi.mocked(globby).mockResolvedValue(filteredFiles);

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        // Return worktree content for .git file, gitignore content for .gitignore
        if ((filePath as string).endsWith('.git')) {
          return gitWorktreeContent;
        }
        return mockGitignoreContent[filePath as keyof typeof mockGitignoreContent] || '';
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
      expect(result.filePaths).toHaveLength(3);
      expect(result.filePaths).toContain('file1.js');
      expect(result.filePaths).toContain('file2.js');
      expect(result.filePaths).toContain('subdir/file3.js');
      expect(result.filePaths).not.toContain('subdir/ignored-in-worktree.js');

      // Verify .git file (not directory) is in ignore patterns (worktree-specific behavior)
      // When .git is a worktree reference file, it should be ignored as a file, not as .git/**
      const executeGlobbyCall = vi.mocked(globby).mock.calls[0];
      const ignorePatterns = executeGlobbyCall[1]?.ignore as string[];
      expect(ignorePatterns).toContain('.git');
      expect(ignorePatterns).not.toContain('.git/**');

      // Verify gitignore option was passed (enables parent .gitignore handling)
      expect(globby).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          gitignore: true,
        }),
      );
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

      // Mock globby to return some test files
      vi.mocked(globby).mockResolvedValue(['file1.js', 'file2.js']);

      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });

      const result = await searchFiles('/test/dir', mockConfig);

      // Check that globby was called with correct ignore patterns
      const executeGlobbyCall = vi.mocked(globby).mock.calls[0];
      const ignorePatterns = executeGlobbyCall[1]?.ignore as string[];

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
      vi.mocked(globby).mockResolvedValue(['test.js']);

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
      vi.mocked(globby).mockResolvedValue(['src/file1.ts', 'src/file3.ts']);

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
      vi.mocked(globby).mockResolvedValue(['src/main.ts', 'lib/utils.ts']);

      const result = await searchFiles('/test', mockConfig, explicitFiles);

      expect(result.filePaths).toEqual(['lib/utils.ts', 'src/main.ts']);
      expect(result.emptyDirPaths).toEqual([]);
    });
  });

  describe('createBaseGlobbyOptions consistency', () => {
    test('should use consistent base options across all globby calls', async () => {
      const mockConfig = createMockConfig({
        include: ['**/*.ts'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: ['*.test.ts'],
        },
      });

      vi.mocked(globby).mockResolvedValue(['file1.ts', 'file2.ts']);

      // Call all functions that use globby
      await searchFiles('/test/root', mockConfig);
      await listDirectories('/test/root', mockConfig);
      await listFiles('/test/root', mockConfig);

      // searchFiles calls globby twice (files + directories if includeEmptyDirectories is true)
      // listDirectories calls globby once
      // listFiles calls globby once
      const calls = vi.mocked(globby).mock.calls;

      // Verify all calls have consistent base options
      for (const call of calls) {
        const options = call[1];

        // In our implementation globby is always called with an options object.
        // Guard here to satisfy the type-checker and avoid undefined access.
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

        // Each call should have either onlyFiles or onlyDirectories, but not both
        if (options) {
          const hasOnlyFiles = 'onlyFiles' in options && options.onlyFiles === true;
          const hasOnlyDirectories = 'onlyDirectories' in options && options.onlyDirectories === true;
          expect(hasOnlyFiles || hasOnlyDirectories).toBe(true);
          expect(hasOnlyFiles && hasOnlyDirectories).toBe(false);
        }
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

      // Call all functions
      await searchFiles('/test/root', mockConfigWithoutGitignore);
      await listDirectories('/test/root', mockConfigWithoutGitignore);
      await listFiles('/test/root', mockConfigWithoutGitignore);

      // Verify all calls have gitignore: false
      const calls = vi.mocked(globby).mock.calls;
      for (const call of calls) {
        const options = call[1];

        // In our implementation globby is always called with an options object.
        // Guard here to satisfy the type-checker and avoid undefined access.
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
