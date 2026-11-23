import nodeFs from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type Options as GlobbyOptions, type GlobEntry, globby } from 'globby';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createIgnoreFileFilter } from '../../../src/core/file/ignoreFileFilter.js';
import { rebaseIgnorePattern } from '../../../src/core/file/ignoreFileRules.js';
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
      // .ignore / .repomixignore above the cwd are not read, as with globby.
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

  test('applies several ignore files in one directory, later ones overriding earlier ones', async () => {
    await writeFiles({
      'sub/.gitignore': '*.txt\n',
      'sub/.repomixignore': '!keep.txt\n',
      'sub/a.txt': '',
      'sub/keep.txt': '',
    });

    // Directory listing order decides which file is applied later; on common filesystems
    // `.gitignore` is listed before `.repomixignore`.
    expect(await searchBothWays()).toEqual(['sub/.gitignore', 'sub/.repomixignore', 'sub/keep.txt']);
  });

  test('does not read ignore files under node_modules, coverage, flow-typed or .git', async () => {
    const files: Record<string, string> = {};
    for (const dir of ['node_modules/m', 'coverage', 'pkg/flow-typed', '.git/x']) {
      files[`${dir}/.gitignore`] = '*.txt\n';
      files[`${dir}/nested/.gitignore`] = '*.txt\n';
      files[`${dir}/a.txt`] = '';
      files[`${dir}/nested/b.txt`] = '';
    }
    await writeFiles(files);

    const result = await searchBothWays();
    for (const dir of ['node_modules/m', 'coverage', 'pkg/flow-typed', '.git/x']) {
      expect(result).toContain(`${dir}/a.txt`);
      expect(result).toContain(`${dir}/nested/b.txt`);
    }
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

  test('a lone `!` in a nested ignore file re-includes nothing', async () => {
    // As in git: `bang/*` stays in force for everything below `bang/`.
    await writeFiles({
      '.gitignore': 'bang/*\n',
      'bang/.gitignore': '!\n',
      'bang/f.txt': '',
      'bang/sub/f.txt': '',
      'kept.txt': '',
    });

    expect(await searchBothWays()).toEqual(['.gitignore', 'kept.txt']);
  });

  describe('intentional differences from globby (matching git)', () => {
    test('a `../x` rule in a nested .gitignore does not escape its directory', async () => {
      // globby joined `dotdot` and `../normal2.txt` into the root rule `normal2.txt` and ignored
      // the root file; git never matches `..`, and `git check-ignore` keeps the file.
      await writeFiles({ 'dotdot/.gitignore': '../normal2.txt\n', 'normal2.txt': '', 'dotdot/normal2.txt': '' });
      expect(await searchBothWays()).toEqual(['dotdot/.gitignore', 'dotdot/normal2.txt', 'normal2.txt']);
      expect(rebaseIgnorePattern('../normal2.txt', 'dotdot')).toBe('dotdot/../normal2.txt');
    });

    test('a directory-only rule does not exclude a regular file of the same name', async () => {
      // globby's traversal pruning turned `thing/` into `**/thing/**`, which also excluded a
      // regular file named `thing`; git only ignores directories for `thing/`.
      await writeFiles({
        'onlydir/.gitignore': 'thing/\n',
        'onlydir/thing': '',
        'onlydir2/.gitignore': 'thing/\n',
        'onlydir2/thing/f': '',
      });
      expect(await searchBothWays()).toEqual(['onlydir/.gitignore', 'onlydir/thing', 'onlydir2/.gitignore']);
    });

    test('rules in `sp[1]/` do not apply to `sp1/`', async () => {
      // globby put the unescaped directory name in front of each rule, so `sp[1]/**/*.dat` also
      // matched `sp1/z.dat`; git applies `sp[1]/.gitignore` only inside `sp[1]/`.
      await writeFiles({ 'sp[1]/.gitignore': '*.dat\n', 'sp[1]/z.dat': '', 'sp1/z.dat': '' });
      expect(await searchBothWays()).toEqual(['sp1/z.dat', 'sp[1]/.gitignore']);
    });
  });
});
