import nodeFs from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type Options as GlobbyOptions, type GlobEntry, globby } from 'globby';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { isCaseInsensitiveDirectory } from '../../../src/core/file/caseInsensitiveDirectory.js';
import { createIgnoreFileFilter } from '../../../src/core/file/ignoreFileFilter.js';
import { isWindows } from '../../testing/testUtils.js';

const baseGlobOptions = { dot: true, followSymbolicLinks: false, absolute: false } as const;

describe('ignoreFileFilter', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-ignore-file-filter-')));
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

  type Mode = 'hook' | 'post-filter only';

  // Runs a walk the way fileSearch does. With 'post-filter only' the readdir hook is not
  // installed, as with static patterns or another walker; the result must be the same.
  const search = async (
    mode: Mode,
    {
      cwd = tempDir,
      patterns = ['**/*'],
      useGitignore = true,
      useDotIgnore = true,
      kind = 'files' as 'files' | 'directories',
    } = {},
  ): Promise<string[]> => {
    const filter = createIgnoreFileFilter(cwd, { useGitignore, useDotIgnore });
    const options: GlobbyOptions = {
      ...baseGlobOptions,
      cwd,
      ...(kind === 'directories' ? { onlyDirectories: true } : { onlyFiles: true }),
      ...(mode === 'hook' ? { fs: { ...nodeFs, readdir: filter.readdir } as unknown as GlobbyOptions['fs'] } : {}),
    };
    const results = await globby(patterns, options);
    return (await filter.filterResults(results, kind)).sort();
  };

  const searchBothWays = async (options: Parameters<typeof search>[1] = {}): Promise<string[]> => {
    const withHook = await search('hook', options);
    const withoutHook = await search('post-filter only', options);
    expect(withoutHook).toEqual(withHook);
    return withHook;
  };

  test('applies nested rules, negations, anchored, unanchored and directory-only rules', async () => {
    await writeFiles({
      '.gitignore': '*.log\n!keep.log\n/anchored.txt\nbuild/\nlib/*\n!lib/keep.js\n',
      'a.log': '',
      'keep.log': '',
      'anchored.txt': '',
      'sub/anchored.txt': '',
      'build/x.js': '',
      'sub/build/y.js': '',
      'lib/a.js': '',
      'lib/keep.js': '',
      'sub/.gitignore': '!b.log\n/local\nnested-*\n!nested-keep\n',
      'sub/b.log': '',
      'sub/c.log': '',
      'sub/local': '',
      'sub/deeper/local': '',
      'sub/nested-a': '',
      'sub/nested-keep': '',
    });

    expect(await searchBothWays()).toEqual([
      '.gitignore',
      'keep.log',
      'lib/keep.js',
      'sub/.gitignore',
      'sub/anchored.txt',
      'sub/b.log',
      'sub/deeper/local',
      'sub/nested-keep',
    ]);
  });

  test('applies the .gitignore files from the git root down to the cwd (.git directory)', async () => {
    await fs.mkdir(path.join(tempDir, '.git'));
    await writeFiles({
      '.gitignore': 'root-ignored.txt\n/pkg/anchored.txt\n',
      'pkg/.gitignore': 'pkg-ignored.txt\n',
      // .ignore / .repomixignore above the cwd are not read.
      '.ignore': 'not-applied.txt\n',
      'pkg/root-ignored.txt': '',
      'pkg/anchored.txt': '',
      'pkg/pkg-ignored.txt': '',
      'pkg/not-applied.txt': '',
      'pkg/kept.txt': '',
    });

    expect(await searchBothWays({ cwd: path.join(tempDir, 'pkg') })).toEqual([
      '.gitignore',
      'kept.txt',
      'not-applied.txt',
    ]);
  });

  test('applies the .gitignore files from the git root down to the cwd (.git file, as in worktrees)', async () => {
    await writeFiles({
      '.git': 'gitdir: /somewhere/else/.git/worktrees/wt\n',
      '.gitignore': 'root-ignored.txt\n',
      'pkg/root-ignored.txt': '',
      'pkg/kept.txt': '',
    });

    expect(await searchBothWays({ cwd: path.join(tempDir, 'pkg') })).toEqual(['kept.txt']);
  });

  test('does not read .gitignore with useGitignore off, nor .ignore with useDotIgnore off', async () => {
    await writeFiles({
      '.gitignore': 'by-gitignore.txt\n',
      '.ignore': 'by-dotignore.txt\n',
      '.repomixignore': 'by-repomixignore.txt\n',
      'by-gitignore.txt': '',
      'by-dotignore.txt': '',
      'by-repomixignore.txt': '',
    });

    const noGitignore = await searchBothWays({ useGitignore: false });
    expect(noGitignore).toContain('by-gitignore.txt');
    expect(noGitignore).not.toContain('by-dotignore.txt');
    expect(noGitignore).not.toContain('by-repomixignore.txt');

    const noDotIgnore = await searchBothWays({ useDotIgnore: false });
    expect(noDotIgnore).not.toContain('by-gitignore.txt');
    expect(noDotIgnore).toContain('by-dotignore.txt');
    expect(noDotIgnore).not.toContain('by-repomixignore.txt');
  });

  test('applies several ignore files in one directory as .gitignore, then .ignore, then .repomixignore', async () => {
    await writeFiles({
      // Each later file overrides the earlier ones.
      'sub/.gitignore': '*.txt\n',
      'sub/.ignore': '!other.txt\n',
      'sub/.repomixignore': '!keep.txt\n',
      'sub/a.txt': '',
      'sub/keep.txt': '',
      'sub/other.txt': '',
      'rev/.gitignore': '!*.txt\n',
      'rev/.ignore': '!b.txt\n',
      'rev/.repomixignore': '*.txt\n',
      'rev/b.txt': '',
    });
    const expected = [
      'rev/.gitignore',
      'rev/.ignore',
      'rev/.repomixignore',
      'sub/.gitignore',
      'sub/.ignore',
      'sub/.repomixignore',
      'sub/keep.txt',
      'sub/other.txt',
    ];
    expect(await searchBothWays()).toEqual(expected);

    // The same whatever order the filesystem lists a directory in: here every listing the filter
    // reads, in the hook and on its own, comes back reversed.
    const realReaddir = nodeFs.readdir;
    const realReaddirPromise = fs.readdir;
    const reverse = <T>(entries: T[] | undefined): T[] | undefined => entries?.slice().reverse();
    const callbackSpy = vi
      .spyOn(nodeFs, 'readdir')
      .mockImplementation(((
        dirPath: string,
        options: unknown,
        callback: (error: NodeJS.ErrnoException | null, entries?: unknown[]) => void,
      ) =>
        realReaddir(
          dirPath,
          options as never,
          ((error: NodeJS.ErrnoException | null, entries?: unknown[]) => callback(error, reverse(entries))) as never,
        )) as unknown as typeof nodeFs.readdir);
    const promiseSpy = vi
      .spyOn(fs, 'readdir')
      .mockImplementation((async (...args: Parameters<typeof fs.readdir>) =>
        reverse((await realReaddirPromise(...args)) as unknown[])) as unknown as typeof fs.readdir);
    try {
      expect(await searchBothWays()).toEqual(expected);
      expect(callbackSpy).toHaveBeenCalled();
      expect(promiseSpy).toHaveBeenCalled();
    } finally {
      callbackSpy.mockRestore();
      promiseSpy.mockRestore();
    }
  });

  test('reads ignore files inside node_modules, coverage and flow-typed, as git does', async () => {
    const files: Record<string, string> = {};
    for (const dir of ['node_modules/m', 'coverage', 'pkg/flow-typed']) {
      files[`${dir}/.gitignore`] = '*.txt\n';
      files[`${dir}/nested/.gitignore`] = '*.js\n';
      files[`${dir}/a.txt`] = '';
      files[`${dir}/nested/b.js`] = '';
      files[`${dir}/nested/c.md`] = '';
    }
    await writeFiles(files);

    const result = await searchBothWays();
    for (const dir of ['node_modules/m', 'coverage', 'pkg/flow-typed']) {
      expect(result).not.toContain(`${dir}/a.txt`);
      expect(result).not.toContain(`${dir}/nested/b.js`);
      expect(result).toContain(`${dir}/nested/c.md`);
    }
  });

  test('does not read ignore files inside .git', async () => {
    await writeFiles({
      '.git/x/.gitignore': '*.txt\n',
      '.git/x/a.txt': '',
      'sub/.git/.gitignore': '*.txt\n',
      'sub/.git/b.txt': '',
    });

    const result = await searchBothWays();
    expect(result).toContain('.git/x/a.txt');
    expect(result).toContain('sub/.git/b.txt');
  });

  test('applies rules inside directories whose names contain glob syntax or a leading !', async () => {
    await writeFiles({
      'sp[1]/.gitignore': '*.dat\n',
      'sp[1]/z.dat': '',
      'sp[1]/keep.txt': '',
      '!bang/.gitignore': 'q.txt\n',
      '!bang/q.txt': '',
      '!bang/r.txt': '',
    });

    expect(await searchBothWays()).toEqual(['!bang/.gitignore', '!bang/r.txt', 'sp[1]/.gitignore', 'sp[1]/keep.txt']);
  });

  // Windows does not allow `*` in file names.
  test.skipIf(process.platform === 'win32')('applies rules inside a directory whose name contains *', async () => {
    await writeFiles({
      'a*b/.gitignore': 'x.txt\n',
      'a*b/x.txt': '',
      'a*b/y.txt': '',
      'axb/x.txt': '',
    });

    expect(await searchBothWays()).toEqual(['a*b/.gitignore', 'a*b/y.txt', 'axb/x.txt']);
  });

  test('prunes ignored directories during the walk', async () => {
    await writeFiles({
      '.gitignore': 'build/\n',
      'build/out.js': '',
      'src/index.ts': '',
    });
    const readDirectories: string[] = [];
    const filter = createIgnoreFileFilter(tempDir, { useGitignore: true, useDotIgnore: true });
    const trackingReaddir: typeof filter.readdir = (dirPath, options, callback) => {
      readDirectories.push(path.relative(tempDir, dirPath));
      filter.readdir(dirPath, options, callback);
    };

    const results = await globby(['**/*'], {
      ...baseGlobOptions,
      cwd: tempDir,
      fs: { ...nodeFs, readdir: trackingReaddir } as unknown as GlobbyOptions['fs'],
    });

    expect(results.sort()).toEqual(['.gitignore', 'src/index.ts']);
    expect(readDirectories).not.toContain('build');
    expect(readDirectories).toContain('src');
  });

  test('gives the same answer when the hook never ran, building directory rules itself', async () => {
    await writeFiles({
      '.gitignore': 'secret.txt\n',
      'deep/er/.gitignore': 'hidden.txt\n',
      'secret.txt': '',
      'deep/er/hidden.txt': '',
      'deep/er/ok.txt': '',
    });
    const filter = createIgnoreFileFilter(tempDir, { useGitignore: true, useDotIgnore: true });

    expect(
      await filter.filterResults(['secret.txt', 'deep/er/hidden.txt', 'deep/er/ok.txt', 'missing/file.txt'], 'files'),
    ).toEqual(['deep/er/ok.txt', 'missing/file.txt']);
  });

  test('leaves absolute results outside the cwd alone, including a file in the filesystem root', async () => {
    await writeFiles({ '.gitignore': '*.txt\n', 'a.txt': '' });
    const filter = createIgnoreFileFilter(tempDir, { useGitignore: true, useDotIgnore: true });
    const rootFile = `${path.parse(tempDir).root.replace(/\\/g, '/')}outside.txt`;
    const inside = `${tempDir.replace(/\\/g, '/')}/a.txt`;

    expect(await filter.filterResults([rootFile, inside], 'files')).toEqual([rootFile]);
  });

  // Windows paths are case-insensitive, so an absolute pattern can spell the cwd differently.
  test.runIf(isWindows)('applies rules to absolute results that spell the cwd in another case', async () => {
    await writeFiles({ '.gitignore': 'secret.txt\n', 'sub/secret.txt': '', 'sub/ok.txt': '', 'secret.txt': '' });
    const filter = createIgnoreFileFilter(tempDir, { useGitignore: true, useDotIgnore: true });
    const posixTempDir = tempDir.replace(/\\/g, '/');
    const otherCase =
      posixTempDir[0] === posixTempDir[0].toLowerCase()
        ? posixTempDir[0].toUpperCase() + posixTempDir.slice(1)
        : posixTempDir[0].toLowerCase() + posixTempDir.slice(1);

    expect(
      await filter.filterResults(
        [`${otherCase}/sub/secret.txt`, `${otherCase}/sub/ok.txt`, `${otherCase}/secret.txt`],
        'files',
      ),
    ).toEqual([`${otherCase}/sub/ok.txt`]);
  });

  test('tests directories with a trailing slash so directory-only rules apply', async () => {
    await writeFiles({
      '.gitignore': 'out/\n',
      'out/a.txt': '',
      'src/out.txt': '',
    });
    expect(await searchBothWays({ kind: 'directories' })).toEqual(['src']);
  });

  (isWindows ? test.skip : test)('treats a symlink as a file, so a directory-only rule does not match it', async () => {
    await writeFiles({
      'symdir/.gitignore': 'linkd/\nlinkf/\n',
      'symdir/plain.txt': '',
      'target/index.ts': '',
      'target.txt': '',
    });
    await fs.symlink('../target', path.join(tempDir, 'symdir/linkd'));
    await fs.symlink('../target.txt', path.join(tempDir, 'symdir/linkf'));
    const filter = createIgnoreFileFilter(tempDir, { useGitignore: true, useDotIgnore: true });

    // objectMode is the only mode that returns symlink entries. fileSearch drops them afterwards,
    // so whether the filter keeps them does not change what gets packed.
    const entries: GlobEntry[] = await globby(['symdir/*'], {
      ...baseGlobOptions,
      cwd: tempDir,
      onlyFiles: false,
      objectMode: true,
      fs: { ...nodeFs, readdir: filter.readdir } as unknown as GlobbyOptions['fs'],
    });
    const kept = await filter.filterResults(entries, 'entries');
    expect(kept.map((entry) => entry.path).sort()).toEqual([
      'symdir/.gitignore',
      'symdir/linkd',
      'symdir/linkf',
      'symdir/plain.txt',
    ]);

    // A pattern whose static base is the symlinked directory reads through it; the rule still
    // ignores everything below `symdir/linkd/`.
    expect(await searchBothWays({ patterns: ['symdir/linkd/**'] })).toEqual([]);
  });

  test('a `../x` rule in a nested .gitignore does not escape its directory', async () => {
    // Git never matches `..`, so the root file stays.
    await writeFiles({ 'dotdot/.gitignore': '../normal2.txt\n', 'normal2.txt': '', 'dotdot/normal2.txt': '' });
    expect(await searchBothWays()).toEqual(['dotdot/.gitignore', 'dotdot/normal2.txt', 'normal2.txt']);
  });

  test('rules with `.`, `..` or empty components match nothing, in nested and top-level files', async () => {
    await writeFiles({
      '.gitignore': './top.txt\nsub/../top2.txt\nb//c\n/\n',
      'top.txt': '',
      'top2.txt': '',
      'b/c': '',
      'a/.gitignore': './x.txt\nsub/../y.txt\nd//e\nw/..\n',
      'a/x.txt': '',
      'a/y.txt': '',
      'a/d/e': '',
      'a/w/f': '',
    });
    expect(await searchBothWays()).toEqual([
      '.gitignore',
      'a/.gitignore',
      'a/d/e',
      'a/w/f',
      'a/x.txt',
      'a/y.txt',
      'b/c',
      'top.txt',
      'top2.txt',
    ]);
  });

  test('a lone `!` re-includes nothing', async () => {
    await writeFiles({ '.gitignore': 'n/*\n', 'n/.gitignore': '!\n', 'n/f': '', 'n/sub/f': '' });
    expect(await searchBothWays()).toEqual(['.gitignore']);
  });

  test('a directory-only rule does not exclude a regular file of the same name', async () => {
    await writeFiles({
      'onlydir/.gitignore': 'thing/\n',
      'onlydir/thing': '',
      'onlydir2/.gitignore': 'thing/\n',
      'onlydir2/thing/f': '',
    });
    expect(await searchBothWays()).toEqual(['onlydir/.gitignore', 'onlydir/thing', 'onlydir2/.gitignore']);
  });

  test('rules in `sp[1]/` do not apply to `sp1/`', async () => {
    await writeFiles({ 'sp[1]/.gitignore': '*.dat\n', 'sp[1]/z.dat': '', 'sp1/z.dat': '' });
    expect(await searchBothWays()).toEqual(['sp1/z.dat', 'sp[1]/.gitignore']);
  });

  describe('case sensitivity follows the filesystem, as core.ignorecase does in git', () => {
    test('matches rules case-insensitively exactly when the filesystem folds case', async () => {
      await writeFiles({ '.gitignore': 'build/\nREADME.TXT\n', 'BUILD/x.js': '', 'readme.txt': '', 'kept.js': '' });
      const ignoreCase = await isCaseInsensitiveDirectory(tempDir);
      expect(await searchBothWays()).toEqual(
        ignoreCase ? ['.gitignore', 'kept.js'] : ['.gitignore', 'BUILD/x.js', 'kept.js', 'readme.txt'],
      );
    });
  });
});
