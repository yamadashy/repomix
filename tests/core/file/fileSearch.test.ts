import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { globby as realGlobby } from 'globby';
import { minimatch } from 'minimatch';
import { afterEach, beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { defaultIgnoreList } from '../../../src/config/defaultIgnore.js';
import {
  escapeGlobPattern,
  expandIgnorePattern,
  getIgnoreFilePatterns,
  getIgnorePatterns,
  gitExcludePatternToGlob,
  listDirectories,
  listFiles,
  normalizeGlobPattern,
  parseIgnoreContent,
  searchFiles,
} from '../../../src/core/file/fileSearch.js';
import { checkDirectoryPermissions, PermissionError } from '../../../src/core/file/permissionCheck.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { createMockConfig, isWindows } from '../../testing/testUtils.js';

type FileSearchDeps = NonNullable<Parameters<typeof searchFiles>[4]>;

const deps = {
  stat: vi.fn<FileSearchDeps['stat']>(),
  readdir: vi.fn<FileSearchDeps['readdir']>(),
  readFile: vi.fn<FileSearchDeps['readFile']>(),
  realpath: vi.fn<FileSearchDeps['realpath']>(),
  // globby is overloaded; MockedFunction keeps the call signatures so deps stays assignable.
  globby: vi.fn() as unknown as MockedFunction<FileSearchDeps['globby']>,
  checkDirectoryPermissions: vi.fn<FileSearchDeps['checkDirectoryPermissions']>(),
};

const createRealDeps = (): FileSearchDeps => ({
  stat: fs.stat,
  readdir: fs.readdir,
  readFile: fs.readFile,
  realpath: fs.realpath,
  globby: realGlobby,
  checkDirectoryPermissions,
});

describe('fileSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for fs.stat to assume directory exists and is a directory
    deps.stat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
    } as Stats);
    // Default mock for checkDirectoryPermissions
    deps.checkDirectoryPermissions.mockResolvedValue({
      hasAllPermission: true,
      details: { read: true, write: true, execute: true },
    });
    // Default mock for globby
    deps.globby.mockResolvedValue([]);
  });

  describe('getIgnoreFilePaths', () => {
    test('should return correct paths when .ignore and .repomixignore are enabled (.gitignore handled by gitignore option)', async () => {
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

      deps.globby.mockImplementation(async (_: unknown, options: unknown) => {
        const opts = options as Record<string, unknown>;
        // New single-call path: files and directories are returned together in objectMode
        if (opts?.objectMode) {
          const fileEntries = mockFilePaths.map((p) => ({
            path: p,
            name: p.split('/').pop() ?? p,
            dirent: { isFile: () => true, isDirectory: () => false } as unknown,
          }));
          const dirEntries = mockEmptyDirs.map((p) => ({
            path: p,
            name: p.split('/').pop() ?? p,
            dirent: { isFile: () => false, isDirectory: () => true } as unknown,
          }));
          return [...fileEntries, ...dirEntries] as never;
        }
        return mockFilePaths;
      });

      deps.readdir.mockResolvedValue([]);

      const result = await searchFiles('/mock/root', mockConfig, undefined, false, deps);

      expect(result.filePaths).toEqual(mockFilePaths);
      expect(result.emptyDirPaths.sort()).toEqual(mockEmptyDirs.sort());
      // One globby call (objectMode) returns files+directories together.
      expect(deps.globby).toHaveBeenCalledTimes(1);
      const callOptions = deps.globby.mock.calls[0][1] as Record<string, unknown>;
      expect(callOptions.objectMode).toBe(true);
      expect(callOptions.onlyFiles).toBe(false);
    });

    test('should not collect empty directories when disabled', async () => {
      const mockConfig = createMockConfig({
        output: {
          includeEmptyDirectories: false,
        },
      });

      const mockFilePaths = ['src/file1.js', 'src/file2.js'];

      deps.globby.mockImplementation(async (_: unknown, options: unknown) => {
        if ((options as Record<string, unknown>)?.onlyDirectories) {
          throw new Error('Should not search for directories when disabled');
        }
        return mockFilePaths;
      });

      const result = await searchFiles('/mock/root', mockConfig, undefined, false, deps);

      expect(result.filePaths).toEqual(mockFilePaths);
      expect(result.emptyDirPaths).toEqual([]);
      expect(deps.globby).toHaveBeenCalledTimes(1);
    });

    test('confineToBaseDir drops matches that resolve outside rootDir', async () => {
      // A glob pattern (absolute, brace-expanded, extglob, …) can make fast-glob
      // return paths outside rootDir regardless of cwd. With confineToBaseDir=true
      // (set by the MCP sandbox) searchFiles must drop them so no pattern trick can
      // surface a file outside the searched directory — the syntax-agnostic backstop
      // behind the sandbox's pattern guard.
      const mockConfig = createMockConfig({ output: { includeEmptyDirectories: false } });
      deps.globby.mockResolvedValue(['src/a.ts', '/etc/passwd', '../sibling/secret.txt'] as never);
      // Identity realpath (no symlinks in this fixture): the confine check compares
      // canonical paths, so a mock that returns its input models a symlink-free tree.
      // The symlink-escape case is covered by a real-filesystem test elsewhere.
      deps.realpath.mockImplementation(async (p: string) => p);

      const result = await searchFiles('/mock/root', mockConfig, undefined, true, deps);

      expect(result.filePaths).toEqual(['src/a.ts']);
    });

    test('confineToBaseDir keeps children when the root is the filesystem root', async () => {
      // A root that already ends in the separator ("/" on POSIX, "C:\\" on Windows)
      // must not build a "//" prefix that rejects every child. --sandbox / is
      // degenerate but must still return its files rather than silently nothing.
      const mockConfig = createMockConfig({ output: { includeEmptyDirectories: false } });
      deps.globby.mockResolvedValue(['etc/hosts', 'srv/app.ts'] as never);
      deps.realpath.mockImplementation(async (p: string) => p);

      const result = await searchFiles('/', mockConfig, undefined, true, deps);

      expect(result.filePaths).toEqual(['etc/hosts', 'srv/app.ts']);
    });

    test('without confineToBaseDir, out-of-root matches are preserved (default CLI/library behavior)', async () => {
      // confineToBaseDir defaults to false so the documented ../ / absolute
      // include-pattern behavior is unchanged for normal CLI and library callers.
      const mockConfig = createMockConfig({ output: { includeEmptyDirectories: false } });
      deps.globby.mockResolvedValue(['src/a.ts', '../sibling/secret.txt'] as never);

      const result = await searchFiles('/mock/root', mockConfig, undefined, false, deps);

      expect(result.filePaths).toEqual(['../sibling/secret.txt', 'src/a.ts']);
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

      const patterns = await getIgnorePatterns(process.cwd(), mockConfig, deps);

      // Default list first, then the default output file; .git/info/exclude is unreadable here
      expect(patterns).toEqual([...defaultIgnoreList, 'repomix-output.xml']);
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

      const patterns = await getIgnorePatterns(process.cwd(), mockConfig, deps);

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

      const patterns = await getIgnorePatterns(process.cwd(), mockConfig, deps);

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

      deps.readFile.mockImplementation(async (filePath) => {
        // Use path.join to create platform-specific path for testing
        const excludePath = path.join('.git', 'info', 'exclude');
        if (filePath.toString().endsWith(excludePath)) {
          return mockExcludeContent;
        }
        return '';
      });

      const patterns = await getIgnorePatterns('/mock/root', mockConfig, deps);

      // Only test for the exclude file patterns. Git matches them at any depth, so they
      // reach globby with the depth prefix that makes that happen.
      expect(patterns).toContain('**/*.ignored');
      expect(patterns).toContain('**/temp-files/');
    });

    test('should keep anchored exclude patterns anchored and skip negated ones', async () => {
      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      const mockExcludeContent = `
/nested/secret.txt
nested/other.txt
!nested/keep.txt
`;

      deps.readFile.mockImplementation(async (filePath) => {
        const excludePath = path.join('.git', 'info', 'exclude');
        if (filePath.toString().endsWith(excludePath)) {
          return mockExcludeContent;
        }
        return '';
      });

      const patterns = await getIgnorePatterns('/mock/root', mockConfig, deps);

      // Patterns carrying a slash are anchored to the repository root, so they gain no
      // `**/` prefix. Negations would exclude instead of re-include, so they are dropped.
      expect(patterns).toContain('nested/secret.txt');
      expect(patterns).toContain('nested/other.txt');
      expect(patterns.some((pattern) => pattern.includes('keep.txt'))).toBe(false);
      expect(patterns).not.toContain('**/nested/secret.txt');
    });

    test('should ignore numbered split output files without excluding similarly named files', async () => {
      const mockConfig = createMockConfig({
        cwd: '/mock/root',
        output: { filePath: 'docs/mycustom.xml', splitOutput: 9216 },
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      const patterns = await getIgnorePatterns('/mock/root', mockConfig, deps);
      const splitPartPattern = patterns.find((pattern) => minimatch('docs/mycustom.1.xml', pattern));

      expect(patterns).toEqual(['docs/mycustom.xml', 'docs/mycustom.[1-9]*([0-9]).xml']);
      expect(splitPartPattern).toBe('docs/mycustom.[1-9]*([0-9]).xml');
      if (!splitPartPattern) return;
      expect(minimatch('docs/mycustom.notes.xml', splitPartPattern)).toBe(false);
      expect(minimatch('docs/mycustom.10.xml', splitPartPattern)).toBe(true);
      // Never generated: parts start at 1 and are not zero-padded.
      expect(minimatch('docs/mycustom.0.xml', splitPartPattern)).toBe(false);
      expect(minimatch('docs/mycustom.01.xml', splitPartPattern)).toBe(false);
    });

    test('should use POSIX separators for a nested output file path (Windows)', async () => {
      const mockConfig = createMockConfig({
        cwd: '/mock/root',
        output: { filePath: 'docs/repomix-output.xml' },
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: [],
        },
      });

      // Simulate Windows: path.relative returns backslash-separated paths there.
      // globby matches ignore patterns against forward-slash paths, so the raw
      // value would never match the output file and it would leak into itself.
      vi.spyOn(path, 'relative').mockReturnValueOnce('docs\\repomix-output.xml');

      const patterns = await getIgnorePatterns('/mock/root', mockConfig, deps);

      expect(patterns).toContain('docs/repomix-output.xml');
      expect(patterns).not.toContain('docs\\repomix-output.xml');
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

  describe('gitExcludePatternToGlob', () => {
    test('should match git by making slash-free patterns apply at any depth', () => {
      expect(gitExcludePatternToGlob('secret.txt')).toBe('**/secret.txt');
      expect(gitExcludePatternToGlob('*.log')).toBe('**/*.log');
      expect(gitExcludePatternToGlob('build/')).toBe('**/build/');
    });

    test('should keep patterns that git anchors to the exclude file directory', () => {
      expect(gitExcludePatternToGlob('nested/secret.txt')).toBe('nested/secret.txt');
      expect(gitExcludePatternToGlob('/secret.txt')).toBe('secret.txt');
      expect(gitExcludePatternToGlob('/nested/secret.txt')).toBe('nested/secret.txt');
    });
  });

  describe('filterFiles', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      // Re-establish default mocks after reset
      deps.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      } as Stats);
      deps.checkDirectoryPermissions.mockResolvedValue({
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

      deps.globby.mockResolvedValue(['file1.js', 'file2.js']);

      await searchFiles('/mock/root', mockConfig, undefined, false, deps);

      expect(deps.globby).toHaveBeenCalledWith(
        ['**/*.js'],
        expect.objectContaining({
          cwd: '/mock/root',
          ignore: expect.arrayContaining(['*.custom']),
          // Ignore files are applied through the fs readdir hook plus a post-filter
          // (ignoreFileFilter.ts), not through globby's gitignore / ignoreFiles options.
          fs: expect.objectContaining({ readdir: expect.any(Function) }),
          onlyFiles: true,
          absolute: false,
          dot: true,
          followSymbolicLinks: false,
        }),
      );
      const options = deps.globby.mock.calls[0][1];
      expect(options).not.toHaveProperty('gitignore');
      expect(options).not.toHaveProperty('ignoreFiles');
    });

    (isWindows ? test.skip : test)('Honor .gitignore files in subdirectories', async () => {
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

      deps.globby.mockImplementation(async () => {
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

      deps.readFile.mockImplementation(async (filePath) => {
        return mockGitignoreContent[filePath as keyof typeof mockGitignoreContent] || '';
      });

      const result = await searchFiles('/mock/root', mockConfig, undefined, false, deps);
      expect(result.filePaths).toEqual(['root/another/file3.js', 'root/subdir/file2.js', 'root/file1.js']);
      expect(result.filePaths).not.toContain('root/subdir/ignored.js');
      expect(result.emptyDirPaths).toEqual([]);
    });

    describe('ignore files on a real filesystem', () => {
      let tempDir: string;

      beforeEach(async () => {
        tempDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-file-search-')));
      });

      afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
      });

      const writeFiles = async (files: Record<string, string>) => {
        for (const [filePath, content] of Object.entries(files)) {
          await fs.mkdir(path.dirname(path.join(tempDir, filePath)), { recursive: true });
          await fs.writeFile(path.join(tempDir, filePath), content);
        }
      };

      test('should respect a .gitignore above the target directory, up to the git root', async () => {
        // Parent .gitignore files between the git root and the target apply, as in git.
        await fs.mkdir(path.join(tempDir, '.git'));
        await writeFiles({
          '.gitignore': 'ignored-by-parent.js\n',
          'subdir/.gitignore': 'ignored-by-subdir.js\n',
          'subdir/file2.js': '',
          'subdir/nested/file3.js': '',
          'subdir/nested/ignored-by-parent.js': '',
          'subdir/nested/ignored-by-subdir.js': '',
        });
        const mockConfig = createMockConfig({
          include: ['**/*.js'],
          ignore: { useGitignore: true, useDefaultPatterns: false, customPatterns: [] },
        });

        const result = await searchFiles(path.join(tempDir, 'subdir'), mockConfig);

        expect(result.filePaths).toEqual(['nested/file3.js', 'file2.js']);
        expect(result.emptyDirPaths).toEqual([]);
      });

      test('should apply a root .ignore file to nested directories', async () => {
        await writeFiles({
          '.ignore': 'ignored-by-parent.js\n',
          'file1.js': '',
          'subdir/file2.js': '',
          'subdir/nested/file3.js': '',
          'subdir/nested/ignored-by-parent.js': '',
        });
        const mockConfig = createMockConfig({
          include: ['**/*.js'],
          ignore: { useGitignore: false, useDotIgnore: true, useDefaultPatterns: false, customPatterns: [] },
        });

        const result = await searchFiles(tempDir, mockConfig);

        expect(result.filePaths).toEqual(['subdir/nested/file3.js', 'subdir/file2.js', 'file1.js']);
        expect(result.emptyDirPaths).toEqual([]);
      });

      test('should apply a root .repomixignore file to nested directories', async () => {
        // .repomixignore applies even with .gitignore and .ignore disabled.
        await writeFiles({
          '.repomixignore': 'ignored-by-repomix.js\n',
          'file1.js': '',
          'subdir/file2.js': '',
          'subdir/nested/file3.js': '',
          'subdir/nested/ignored-by-repomix.js': '',
        });
        const mockConfig = createMockConfig({
          include: ['**/*.js'],
          ignore: { useGitignore: false, useDotIgnore: false, useDefaultPatterns: false, customPatterns: [] },
        });

        const result = await searchFiles(tempDir, mockConfig);

        expect(result.filePaths).toEqual(['subdir/nested/file3.js', 'subdir/file2.js', 'file1.js']);
        expect(result.emptyDirPaths).toEqual([]);
      });

      test('should keep explicitly included ignored files excluded (static patterns)', async () => {
        // fast-glob resolves static patterns without reading directories, so this relies on the
        // post-filter rather than the readdir hook.
        await writeFiles({
          '.gitignore': 'secret.txt\nsub/hidden.txt\n',
          'a.txt': '',
          'secret.txt': '',
          'sub/hidden.txt': '',
        });
        const mockConfig = createMockConfig({
          include: ['secret.txt', 'sub/hidden.txt', 'a.txt'],
          ignore: { useGitignore: true, useDefaultPatterns: false, customPatterns: [] },
        });

        const result = await searchFiles(tempDir, mockConfig);

        expect(result.filePaths).toEqual(['a.txt']);
      });

      test('should keep ignored files from an explicit (stdin) file list excluded', async () => {
        await writeFiles({
          '.gitignore': 'secret.txt\n',
          'secret.txt': '',
          'sub/ok.txt': '',
        });
        const mockConfig = createMockConfig({
          ignore: { useGitignore: true, useDefaultPatterns: false, customPatterns: [] },
        });

        const result = await searchFiles(tempDir, mockConfig, [
          path.join(tempDir, 'secret.txt'),
          path.join(tempDir, 'sub/ok.txt'),
        ]);

        expect(result.filePaths).toEqual(['sub/ok.txt']);
      });

      test('should honour ignore files in listFiles and listDirectories', async () => {
        await writeFiles({
          '.gitignore': 'build/\n*.log\n',
          '.repomixignore': 'private/\n',
          'src/index.ts': '',
          'src/debug.log': '',
          'build/out.js': '',
          'private/notes.md': '',
        });
        const mockConfig = createMockConfig({
          ignore: { useGitignore: true, useDefaultPatterns: false, customPatterns: [] },
        });

        expect(await listFiles(tempDir, mockConfig)).toEqual(['src/index.ts', '.gitignore', '.repomixignore']);
        expect(await listDirectories(tempDir, mockConfig)).toEqual(['src']);
      });

      test('should apply ignore files only when enabled, consistently across all functions', async () => {
        await writeFiles({
          '.gitignore': 'gitignored/\n',
          'gitignored/file.ts': '',
          'kept/file.ts': '',
        });
        const withGitignore = createMockConfig({
          ignore: { useGitignore: true, useDefaultPatterns: false, customPatterns: [] },
        });
        const withoutGitignore = createMockConfig({
          ignore: { useGitignore: false, useDefaultPatterns: false, customPatterns: [] },
        });

        expect((await searchFiles(tempDir, withGitignore)).filePaths).toEqual(['kept/file.ts', '.gitignore']);
        expect(await listFiles(tempDir, withGitignore)).toEqual(['kept/file.ts', '.gitignore']);
        expect(await listDirectories(tempDir, withGitignore)).toEqual(['kept']);

        expect((await searchFiles(tempDir, withoutGitignore)).filePaths).toEqual([
          'gitignored/file.ts',
          'kept/file.ts',
          '.gitignore',
        ]);
        expect(await listFiles(tempDir, withoutGitignore)).toEqual([
          'gitignored/file.ts',
          'kept/file.ts',
          '.gitignore',
        ]);
        expect(await listDirectories(tempDir, withoutGitignore)).toEqual(['gitignored', 'kept']);
      });

      test('should handle a git worktree with a .gitignore and a parent .gitignore', async () => {
        // In a worktree `.git` is a file; it must be ignored as a file (not via `.git/**`), and
        // the .gitignore files from the worktree root down to the target still apply.
        await writeFiles({
          '.git': 'gitdir: /path/to/main/repo/.git/worktrees/feature-branch\n',
          '.gitignore': 'ignored-in-worktree.js\n',
          'file1.js': '',
          'subdir/file3.js': '',
          'subdir/ignored-in-worktree.js': '',
          'subdir/inner/file4.js': '',
          'subdir/inner/ignored-in-worktree.js': '',
        });
        const mockConfig = createMockConfig({
          ignore: { useGitignore: true, useDefaultPatterns: true, customPatterns: [] },
        });
        const globbySpy = vi.fn(realGlobby) as unknown as MockedFunction<FileSearchDeps['globby']>;
        const realDeps = { ...createRealDeps(), globby: globbySpy };

        const result = await searchFiles(tempDir, mockConfig, undefined, false, realDeps);
        expect(result.filePaths).toEqual(['subdir/inner/file4.js', 'subdir/file3.js', '.gitignore', 'file1.js']);

        const ignorePatterns = globbySpy.mock.calls[0][1]?.ignore as string[];
        expect(ignorePatterns).toContain('.git');
        expect(ignorePatterns).not.toContain('.git/**');

        // From a subdirectory, the worktree root's .gitignore is a parent .gitignore.
        const subResult = await searchFiles(path.join(tempDir, 'subdir'), mockConfig);
        expect(subResult.filePaths).toEqual(['inner/file4.js', 'file3.js']);
      });
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

      deps.globby.mockResolvedValue(mockFileStructure);

      const result = await searchFiles('/mock/root', mockConfig, undefined, false, deps);

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
      deps.stat
        .mockResolvedValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        } as Stats)
        .mockResolvedValue({
          isFile: () => true,
          isDirectory: () => false,
        } as Stats);
      deps.readFile.mockResolvedValue(gitWorktreeContent);

      // Override checkDirectoryPermissions mock for this test
      deps.checkDirectoryPermissions.mockResolvedValue({
        hasAllPermission: true,
        details: { read: true, write: true, execute: true },
      });

      // Mock globby to return some test files
      deps.globby.mockResolvedValue(['file1.js', 'file2.js']);

      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });

      const result = await searchFiles('/test/dir', mockConfig, undefined, false, deps);

      // Check that globby was called with correct ignore patterns
      const executeGlobbyCall = deps.globby.mock.calls[0];
      const ignorePatterns = executeGlobbyCall[1]?.ignore as string[];

      // Verify .git file (not directory) is in ignore patterns
      expect(ignorePatterns).toContain('.git');
      // Verify .git/** is not in ignore patterns
      expect(ignorePatterns).not.toContain('.git/**');

      // Verify the files were returned correctly
      expect(result.filePaths).toEqual(['file1.js', 'file2.js']);
    });

    test('should handle regular git repository correctly', async () => {
      // Mock .git as a directory
      deps.stat
        .mockResolvedValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        } as Stats)
        .mockResolvedValue({
          isFile: () => false,
          isDirectory: () => true,
        } as Stats);

      // Override checkDirectoryPermissions mock for this test
      deps.checkDirectoryPermissions.mockResolvedValue({
        hasAllPermission: true,
        details: { read: true, write: true, execute: true },
      });

      // Mock globby to return some test files
      deps.globby.mockResolvedValue(['file1.js', 'file2.js']);

      const mockConfig = createMockConfig({
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
      });

      const result = await searchFiles('/test/dir', mockConfig, undefined, false, deps);

      // Check that globby was called with correct ignore patterns
      const executeGlobbyCall = deps.globby.mock.calls[0];
      const ignorePatterns = executeGlobbyCall[1]?.ignore as string[];

      // Verify .git/** is in ignore patterns for regular git repos
      expect(ignorePatterns).toContain('.git/**');
      // Verify just .git is not in ignore patterns
      expect(ignorePatterns).not.toContain('.git');

      // Verify the files were returned correctly
      expect(result.filePaths).toEqual(['file1.js', 'file2.js']);
    });

    describe('globby error handling', () => {
      // Errors thrown by globby flow through handleGlobbyError → outer catch.
      // We exercise both layers explicitly so refactors can't silently lose
      // PermissionError translation or the friendly RepomixError wrapper.
      test('translates EPERM into PermissionError', async () => {
        const epermError = Object.assign(new Error('boom'), { code: 'EPERM' });
        deps.globby.mockRejectedValue(epermError);

        await expect(searchFiles('/mock/root', createMockConfig({}), undefined, false, deps)).rejects.toBeInstanceOf(
          PermissionError,
        );
      });

      test('translates EACCES into PermissionError', async () => {
        const eaccesError = Object.assign(new Error('boom'), { code: 'EACCES' });
        deps.globby.mockRejectedValue(eaccesError);

        await expect(searchFiles('/mock/root', createMockConfig({}), undefined, false, deps)).rejects.toBeInstanceOf(
          PermissionError,
        );
      });

      test('wraps generic Error from globby with directory context', async () => {
        deps.globby.mockRejectedValue(new Error('disk read failed'));

        await expect(searchFiles('/mock/root', createMockConfig({}), undefined, false, deps)).rejects.toThrow(
          /Failed to filter files in directory \/mock\/root\. Reason: disk read failed/,
        );
      });

      test('throws a generic message for non-Error throws', async () => {
        deps.globby.mockRejectedValue({ unexpected: 'shape' });

        await expect(searchFiles('/mock/root', createMockConfig({}), undefined, false, deps)).rejects.toThrow(
          'An unexpected error occurred while filtering files.',
        );
      });
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

  describe('expandIgnorePattern', () => {
    test('keeps the bare form of **/ patterns whose last segment has a wildcard', () => {
      expect(expandIgnorePattern('**/npm-debug.log*')).toEqual(['**/npm-debug.log*', '**/npm-debug.log*/**']);
      expect(expandIgnorePattern('**/.*')).toEqual(['**/.*', '**/.*/**']);
      expect(expandIgnorePattern('**/file?.txt')).toEqual(['**/file?.txt', '**/file?.txt/**']);
    });

    test('returns only the normalized form for literal names and other patterns', () => {
      expect(expandIgnorePattern('**/node_modules')).toEqual(['**/node_modules/**']);
      expect(expandIgnorePattern('**/*.log/**')).toEqual(['**/*.log/**']);
      expect(expandIgnorePattern('*.log')).toEqual(['*.log']);
      expect(expandIgnorePattern('bin/')).toEqual(['bin']);
    });
  });

  describe('searchFiles path validation', () => {
    test('should throw error when target path does not exist', async () => {
      const error = new Error('ENOENT') as Error & { code: string };
      error.code = 'ENOENT';
      deps.stat.mockRejectedValue(error);

      const mockConfig = createMockConfig();

      await expect(searchFiles('/nonexistent/path', mockConfig, undefined, false, deps)).rejects.toThrow(RepomixError);
      await expect(searchFiles('/nonexistent/path', mockConfig, undefined, false, deps)).rejects.toThrow(
        'Target path does not exist: /nonexistent/path',
      );
    });

    test('should throw PermissionError when access is denied', async () => {
      const error = new Error('EPERM') as Error & { code: string };
      error.code = 'EPERM';
      deps.stat.mockRejectedValue(error);

      const mockConfig = createMockConfig();

      await expect(searchFiles('/forbidden/path', mockConfig, undefined, false, deps)).rejects.toThrow(PermissionError);
    });

    test('should throw error when target path is a file, not a directory', async () => {
      deps.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      } as Stats);

      const mockConfig = createMockConfig();

      await expect(searchFiles('/path/to/file.txt', mockConfig, undefined, false, deps)).rejects.toThrow(RepomixError);
      await expect(searchFiles('/path/to/file.txt', mockConfig, undefined, false, deps)).rejects.toThrow(
        'Target path is not a directory: /path/to/file.txt. Please specify a directory path, not a file path.',
      );
    });

    test('should succeed when target path is a valid directory', async () => {
      deps.globby.mockResolvedValue(['test.js']);

      const mockConfig = createMockConfig();

      const result = await searchFiles('/valid/directory', mockConfig, undefined, false, deps);

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
      deps.globby.mockResolvedValue(['src/file1.ts', 'src/file3.ts']);

      const result = await searchFiles('/test', mockConfig, explicitFiles, false, deps);

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
      deps.globby.mockResolvedValue(['src/main.ts', 'lib/utils.ts']);

      const result = await searchFiles('/test', mockConfig, explicitFiles, false, deps);

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

      deps.globby.mockResolvedValue(['file1.ts', 'file2.ts']);

      // Call all functions that use globby
      await searchFiles('/test/root', mockConfig, undefined, false, deps);
      await listDirectories('/test/root', mockConfig, deps);
      await listFiles('/test/root', mockConfig, deps);

      // searchFiles calls globby once: `onlyFiles: true` when `includeEmptyDirectories` is
      // disabled (the case here), or `onlyFiles: false, objectMode: true` when enabled to
      // return files and directories in a single traversal.
      // listDirectories calls globby once (onlyDirectories: true)
      // listFiles calls globby once (onlyFiles: true)
      const calls = deps.globby.mock.calls;
      expect(calls).toHaveLength(3);

      // Verify all calls have consistent base options
      for (const call of calls) {
        const options = call[1];

        // toMatchObject fails on a missing options object; the guard below only narrows the type.
        expect(options).toMatchObject({
          cwd: '/test/root',
          fs: expect.objectContaining({ readdir: expect.any(Function) }),
          absolute: false,
          dot: true,
          followSymbolicLinks: false,
        });
        if (!options) continue;
        // Ignore files are applied by ignoreFileFilter.ts, never by globby's own options.
        expect(options).not.toHaveProperty('gitignore');
        expect(options).not.toHaveProperty('ignoreFiles');

        // A call must target a recognised entry kind: onlyFiles, onlyDirectories,
        // or objectMode (the combined files+directories path). A call may not
        // set both onlyFiles and onlyDirectories.
        const hasOnlyFiles = 'onlyFiles' in options && options.onlyFiles === true;
        const hasOnlyDirectories = 'onlyDirectories' in options && options.onlyDirectories === true;
        const hasObjectMode = 'objectMode' in options && options.objectMode === true;
        expect(hasOnlyFiles || hasOnlyDirectories || hasObjectMode).toBe(true);
        expect(hasOnlyFiles && hasOnlyDirectories).toBe(false);
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

      deps.globby.mockResolvedValue([]);

      // Call all functions
      await searchFiles('/test/root', mockConfig, undefined, false, deps);
      await listDirectories('/test/root', mockConfig, deps);
      await listFiles('/test/root', mockConfig, deps);

      // Verify all calls include custom patterns in ignore array
      const calls = deps.globby.mock.calls;
      expect(calls).toHaveLength(3);
      for (const call of calls) {
        const options = call[1];

        const ignorePatterns = options?.ignore as string[];
        expect(ignorePatterns).toEqual(expect.arrayContaining(customPatterns));
      }
    });
  });
});
