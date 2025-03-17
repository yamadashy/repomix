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
  parseIgnoreContent,
  searchFiles,
} from '../../../src/core/file/fileSearch.js';
import { createMockConfig, isWindows } from '../../testing/testUtils.js';

vi.mock('fs/promises');
vi.mock('globby');

describe('fileSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getIgnoreFilePaths', () => {
    test('should return correct paths when .gitignore and .repomixignore exist', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });
      const filePatterns = await getIgnoreFilePatterns(mockConfig);
      expect(filePatterns).toEqual(['**/.gitignore', '**/.repomixignore']);
    });

    test('should not include .gitignore when useGitignore is false', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: false,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });
      const filePatterns = await getIgnoreFilePatterns(mockConfig);
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

      vi.mocked(globby).mockImplementation(async (_, options) => {
        if (options?.onlyDirectories) {
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

      vi.mocked(globby).mockImplementation(async (_, options) => {
        if (options?.onlyDirectories) {
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

      expect(patterns).toEqual(['repomix-output.txt', '*.custom', 'temp/']);
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
          ignoreFiles: expect.arrayContaining(['**/.gitignore', '**/.repomixignore']),
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

      // Mock fs.stat and fs.readFile for .git file
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
      } as Stats);
      vi.mocked(fs.readFile).mockResolvedValue(gitWorktreeContent);

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
      const globbyCall = vi.mocked(globby).mock.calls[0];
      const ignorePatterns = globbyCall[1]?.ignore as string[];

      // Verify .git file (not directory) is in ignore patterns
      expect(ignorePatterns).toContain('.git');
      // Verify .git/** is not in ignore patterns
      expect(ignorePatterns).not.toContain('.git/**');

      // Verify the files were returned correctly
      expect(result.filePaths).toEqual(['file1.js', 'file2.js']);
    });

    test('should handle regular git repository correctly', async () => {
      // Mock .git as a directory
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => false,
      } as Stats);

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
      const globbyCall = vi.mocked(globby).mock.calls[0];
      const ignorePatterns = globbyCall[1]?.ignore as string[];

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

    test('should escape multiple types of brackets', () => {
      const pattern = 'src/(auth)/[id]/{slug}/**/*.ts';
      expect(escapeGlobPattern(pattern)).toBe('src/\\(auth\\)/\\[id\\]/\\{slug\\}/**/*.ts');
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

  test('should handle patterns with mixed backslashes and special characters', () => {
    const pattern = 'src\\temp\\[id]\\{slug}';
    expect(escapeGlobPattern(pattern)).toBe('src\\\\temp\\\\\\[id\\]\\\\\\{slug\\}');
  });
});
