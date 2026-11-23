import { spawnSync } from 'node:child_process';
import nodeFs from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type Options as GlobbyOptions, globby } from 'globby';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { isCaseInsensitiveDirectory } from '../../../src/core/file/caseInsensitiveDirectory.js';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createIgnoreFileFilter } from '../../../src/core/file/ignoreFileFilter.js';
import { createMockConfig, isWindows } from '../../testing/testUtils.js';

// Checks the ignore-file filter against git itself: for each fixture, the files that
// `git ls-files --others --exclude-per-directory=<name>` lists (the untracked files git does not
// ignore) must be exactly the files the filter keeps, with and without its readdir hook.
//
// Fixtures come from a table of tricky cases and from a seeded generator of small trees and rule
// sets. Set REPOMIX_GIT_ORACLE_CASES to run more generated cases (the default keeps this file
// fast), and REPOMIX_GIT_ORACLE_SEED to try another seed.

type IgnoreFileName = '.gitignore' | '.ignore' | '.repomixignore';
type Fixture = Record<string, string>;

const isGitAvailable = spawnSync('git', ['--version'], { stdio: 'ignore' }).status === 0;
const supportsSpecialNames = !isWindows;
const generatedCaseCount = Number(process.env.REPOMIX_GIT_ORACLE_CASES ?? 160);
const generatorSeed = Number(process.env.REPOMIX_GIT_ORACLE_SEED ?? 20251123);

// The ignore-file options that make the filter read exactly one ignore-file name, as git reads
// the single name given to --exclude-per-directory.
const filterOptionsFor = (name: IgnoreFileName) => ({
  useGitignore: name === '.gitignore',
  useDotIgnore: name === '.ignore',
});

describe.skipIf(!isGitAvailable)('ignoreFileFilter against git', () => {
  let tempDir: string;
  let repoDir: string;
  let gitDir: string;
  let gitEnv: NodeJS.ProcessEnv;
  let gitIgnoresCase: boolean;
  let caseCounter = 0;

  const runGit = (args: string[], cwd: string): string => {
    const result = spawnSync('git', args, { cwd, env: gitEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
    return result.stdout;
  };

  beforeAll(async () => {
    tempDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-git-oracle-')));
    // Independent of the developer's git setup: no global or system config (so no global ignore
    // file and no init template), and no GIT_* variables inherited from a hook or an IDE.
    gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    gitEnv.GIT_CONFIG_GLOBAL = path.join(tempDir, 'no-global-gitconfig');
    gitEnv.GIT_CONFIG_NOSYSTEM = '1';
    // One repository serves every fixture through --work-tree; nothing is ever added to its
    // index, so every file of a fixture is untracked. `git init` probes the filesystem of the
    // temporary directory to set core.ignorecase (it is left unset, meaning false, when the
    // filesystem is case-sensitive), as for any repository created there.
    repoDir = path.join(tempDir, 'repo');
    runGit(['init', '--quiet', repoDir], tempDir);
    gitDir = path.join(repoDir, '.git');
    const configured = spawnSync('git', ['config', '--bool', 'core.ignorecase'], {
      cwd: repoDir,
      env: gitEnv,
      encoding: 'utf8',
    });
    gitIgnoresCase = configured.stdout.trim() === 'true';
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const writeFixture = async (fixture: Fixture): Promise<string> => {
    const dir = path.join(tempDir, `case-${caseCounter++}`);
    await fs.mkdir(dir);
    for (const [filePath, content] of Object.entries(fixture)) {
      const target = path.join(dir, filePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      if (content.startsWith('symlink:')) {
        await fs.symlink(content.slice('symlink:'.length), target);
      } else {
        await fs.writeFile(target, content);
      }
    }
    return dir;
  };

  // The regular files git keeps: its untracked list without symlinks, which the walker never
  // returns as files.
  const gitKeptFiles = async (dir: string, name: IgnoreFileName): Promise<string[]> => {
    const output = runGit(
      [
        '-c',
        'core.excludesFile=',
        '--git-dir',
        gitDir,
        '--work-tree',
        dir,
        'ls-files',
        '--others',
        '-z',
        `--exclude-per-directory=${name}`,
      ],
      dir,
    );
    const listed = output.split('\0').filter(Boolean);
    const isFile = await Promise.all(
      listed.map((file) => fs.lstat(path.join(dir, file)).then((stats) => stats.isFile())),
    );
    return listed.filter((_, index) => isFile[index]).sort();
  };

  const filterKeptFiles = async (
    dir: string,
    filterOptions: { useGitignore: boolean; useDotIgnore: boolean },
    mode: 'hook' | 'post-filter only',
  ): Promise<string[]> => {
    const filter = createIgnoreFileFilter(dir, filterOptions);
    const results = await globby(['**/*'], {
      cwd: dir,
      dot: true,
      followSymbolicLinks: false,
      onlyFiles: true,
      ...(mode === 'hook' ? { fs: { ...nodeFs, readdir: filter.readdir } as unknown as GlobbyOptions['fs'] } : {}),
    });
    return (await filter.filterResults(results, 'files')).sort();
  };

  // On a mismatch, name the paths that differ and the ignore files that can affect them, rather
  // than the whole fixture.
  const describeMismatch = (fixture: Fixture, expected: string[], actual: string[]): string => {
    const differing = [
      ...expected.filter((file) => !actual.includes(file)).map((file) => `${file} (git keeps it, the filter does not)`),
      ...actual.filter((file) => !expected.includes(file)).map((file) => `${file} (the filter keeps it, git does not)`),
    ];
    const differingPaths = [...expected, ...actual].filter(
      (file) => !(expected.includes(file) && actual.includes(file)),
    );
    const relevantIgnoreFiles = Object.entries(fixture).filter(([file]) => {
      if (!IGNORE_FILE_NAMES.includes(path.posix.basename(file) as IgnoreFileName)) return false;
      const dir = path.posix.dirname(file);
      return differingPaths.some((differingPath) => dir === '.' || differingPath.startsWith(`${dir}/`));
    });
    return [...differing, ...relevantIgnoreFiles.map(([file, content]) => `${file}: ${JSON.stringify(content)}`)].join(
      '\n',
    );
  };

  // `gitView` is the fixture as git sees it; for several ignore-file names it differs from
  // `dir` (see the precedence cases).
  const expectSameAsGit = async (
    dir: string,
    fixture: Fixture,
    name: IgnoreFileName,
    filterOptions = filterOptionsFor(name),
    gitView: string = dir,
  ) => {
    const expected = await gitKeptFiles(gitView, name);
    for (const mode of ['hook', 'post-filter only'] as const) {
      const actual = await filterKeptFiles(dir, filterOptions, mode);
      if (actual.join('\0') !== expected.join('\0')) {
        expect.fail(`${mode}: differs from git\n${describeMismatch(fixture, expected, actual)}`);
      }
    }
  };

  test('the filesystem probe agrees with the core.ignorecase that git init chose', async () => {
    expect(await isCaseInsensitiveDirectory(repoDir)).toBe(gitIgnoresCase);
  });

  // [description, fixture, options]
  const tableCases: [string, Fixture, { name?: IgnoreFileName; skip?: boolean }?][] = [
    [
      'nested rules, anchored and unanchored rules',
      {
        '.gitignore': '*.log\n/anchored.txt\nsub/fixed.txt\n',
        'a.log': '',
        'anchored.txt': '',
        'sub/anchored.txt': '',
        'sub/fixed.txt': '',
        'sub/sub/fixed.txt': '',
        'sub/.gitignore': '/local\nnested-*\ndeep/fixed.txt\n',
        'sub/local': '',
        'sub/deeper/local': '',
        'sub/nested-a': '',
        'sub/deep/fixed.txt': '',
        'sub/x/deep/fixed.txt': '',
      },
    ],
    [
      'negation, and re-inclusion under an ignored parent',
      {
        '.gitignore': '*.log\n!keep.log\nlib/*\n!lib/keep.js\nout/\n!out/keep.js\n',
        'a.log': '',
        'keep.log': '',
        'lib/a.js': '',
        'lib/keep.js': '',
        'out/keep.js': '',
        'sub/.gitignore': '!a.log\n',
        'sub/a.log': '',
        'out2/.gitignore': '!*\n',
        'out2/x.log': '',
      },
    ],
    [
      'a nested ignore file cannot re-include below a directory ignored by its parent',
      {
        '.gitignore': 'ignored/\n',
        'ignored/.gitignore': '!*\n',
        'ignored/x.txt': '',
        'kept/.gitignore': '*\n!.gitignore\n',
        'kept/x.txt': '',
      },
    ],
    [
      'directory-only rules versus files of the same name',
      {
        '.gitignore': 'thing/\nbuild/\n/top/\n',
        thing: '',
        'sub/thing': '',
        'sub2/thing/f': '',
        'build/x.js': '',
        'sub/build/y.js': '',
        'top/a': '',
        'sub/top/a': '',
      },
    ],
    [
      '** forms',
      {
        '.gitignore': '**/logs\n**/foo/bar\nabc/**\na/**/b\nx**y\n***/z\n',
        'logs/a': '',
        'deep/logs/a': '',
        'foo/bar': '',
        'one/foo/bar': '',
        'abc/def/g': '',
        'abc2/def': '',
        'a/b': '',
        'a/x/y/b': '',
        xay: '',
        'x/y': '',
        xy: '',
        'q/z': '',
        z: '',
      },
    ],
    [
      'escapes and trailing whitespace',
      {
        '.gitignore': '\\#hash\n\\!bang\ntrail\\ \nspaced  \n#comment\n',
        '#hash': '',
        '!bang': '',
        'trail ': '',
        trail: '',
        spaced: '',
        '#comment': '',
      },
      { skip: !supportsSpecialNames },
    ],
    [
      'character classes, ranges and ?',
      {
        '.gitignore': '[ab].txt\nf[0-3]\nn[!x]\n?.md\n[[:digit:]]z\n',
        'a.txt': '',
        'c.txt': '',
        f2: '',
        f7: '',
        nx: '',
        ny: '',
        'q.md': '',
        'qq.md': '',
        '5z': '',
        yz: '',
      },
    ],
    [
      'glob characters and backslashes in directory names',
      {
        'sp[1]/.gitignore': '*.dat\n',
        'sp[1]/z.dat': '',
        'sp1/z.dat': '',
        'a*b/.gitignore': 'x.txt\n',
        'a*b/x.txt': '',
        'axb/x.txt': '',
        'q?/.gitignore': 'y\n',
        'q?/y': '',
        'qz/y': '',
        'b\\s/.gitignore': 'w\n',
        'b\\s/w': '',
        '!bang/.gitignore': 'v\n',
        '!bang/v': '',
        '#hash/.gitignore': 'u\n',
        '#hash/u': '',
      },
      { skip: !supportsSpecialNames },
    ],
    [
      '../, ./, // and other rules git never matches',
      {
        'a/.gitignore': '../x.txt\n./y.txt\nsub/../z.txt\nb//c\n/\nw/..\n',
        'x.txt': '',
        'a/x.txt': '',
        'a/y.txt': '',
        'a/z.txt': '',
        'a/b/c': '',
        'a/w/f': '',
        'a/f': '',
        // A lone `!` re-includes nothing.
        '.gitignore': 'n/*\n',
        'n/.gitignore': '!\n!/\n',
        'n/f': '',
        'n/sub/f': '',
      },
    ],
    [
      'rules at the top level that git never matches',
      {
        '.gitignore': './y.txt\nsub/../z.txt\nb//c\n/\nw/..\n',
        'y.txt': '',
        'z.txt': '',
        'sub/z.txt': '',
        'b/c': '',
        'w/f': '',
      },
    ],
    [
      'case variants',
      {
        '.gitignore': 'build/\nREADME.TXT\n*.LOG\nDocs/x.txt\n',
        'BUILD/a.js': '',
        'readme.txt': '',
        'a.log': '',
        'docs/x.txt': '',
        'sub/.gitignore': 'Thing\n',
        'sub/thing': '',
      },
    ],
    [
      'ignore files inside node_modules, coverage and flow-typed',
      {
        'node_modules/m/.gitignore': '*.txt\n',
        'node_modules/m/a.txt': '',
        'node_modules/m/nested/.gitignore': 'b.js\n',
        'node_modules/m/nested/b.js': '',
        'coverage/.gitignore': '*\n!.gitignore\n',
        'coverage/lcov.info': '',
        'pkg/flow-typed/.gitignore': 'npm/\n',
        'pkg/flow-typed/npm/x.js': '',
        'pkg/flow-typed/kept.js': '',
      },
    ],
    [
      'ignore files inside ignored directories are not read',
      {
        '.gitignore': 'vendor/\n',
        'vendor/.gitignore': '!*\n',
        'vendor/a': '',
        'other/.gitignore': '/x\n',
        'other/x': '',
        'other/y': '',
      },
    ],
    [
      'byte order marks and CRLF line endings',
      {
        '.gitignore': '\uFEFFa.txt\r\nb.txt\r\n',
        'a.txt': '',
        'b.txt': '',
        'sub/.gitignore': '\uFEFF/c.txt\r\n\r\n#x\r\nd.txt\r',
        'sub/c.txt': '',
        'sub/d.txt': '',
        'c.txt': '',
      },
    ],
    [
      'a symlinked directory is not followed and is not a directory for directory-only rules',
      {
        '.gitignore': 'link/\n',
        'target/.gitignore': 'secret\n',
        'target/secret': '',
        'target/ok': '',
        link: 'symlink:target',
      },
      { skip: isWindows },
    ],
    [
      '.ignore files',
      { '.ignore': '*.log\n', 'a.log': '', 'sub/.ignore': '!b.log\n', 'sub/b.log': '' },
      { name: '.ignore' },
    ],
    [
      '.repomixignore files',
      { '.repomixignore': 'dist/\n', 'dist/a.js': '', 'sub/.repomixignore': '/x\n', 'sub/x': '', x: '' },
      { name: '.repomixignore' },
    ],
  ];

  test.each(tableCases.filter(([, , options]) => !options?.skip))('%s', async (_description, fixture, options) => {
    const name = options?.name ?? '.gitignore';
    const dir = await writeFixture(fixture);
    await expectSameAsGit(dir, fixture, name);

    // searchFiles applies the same filter, with only ignore files deciding here.
    const config = createMockConfig({ cwd: dir, ignore: { useDefaultPatterns: false, ...filterOptionsFor(name) } });
    const { filePaths } = await searchFiles(dir, config);
    expect([...filePaths].sort()).toEqual(await gitKeptFiles(dir, name));
  });

  test('several ignore files in one directory apply as .gitignore, then .ignore, then .repomixignore', async () => {
    // Git reads one name per directory, so the expectation comes from a copy of the fixture whose
    // .gitignore files hold the three files' rules in that order.
    const fixture: Fixture = {
      '.gitignore': '*.txt\n',
      '.ignore': '!keep*.txt\n',
      '.repomixignore': 'keep-not.txt\n',
      'a.txt': '',
      'keep.txt': '',
      'keep-not.txt': '',
      'sub/.gitignore': '!*.txt\n',
      'sub/.ignore': '*.txt\n',
      'sub/.repomixignore': '!b.txt\n',
      'sub/a.txt': '',
      'sub/b.txt': '',
    };
    const dir = await writeFixture(fixture);
    const gitView = await writeFixture(mergeIgnoreFiles(fixture));
    await expectSameAsGit(dir, fixture, '.gitignore', { useGitignore: true, useDotIgnore: true }, gitView);
  });

  // Known difference, from the `ignore` package: git reads an escaped slash as a plain slash, so
  // `a\/**` is `a/**`, which matches everything below `a` but not `a` itself, and `a/keep` can be
  // re-included. The `ignore` package also matches the directory `a` with `a\/**`. When this
  // starts failing, the difference is gone: drop this test and the generator's workaround.
  test('known difference: an escaped slash before a trailing ** also matches the directory', async () => {
    const fixture: Fixture = { '.gitignore': 'a\\/**\n', 'a/.gitignore': '!keep\n', 'a/keep': '', 'a/other': '' };
    const dir = await writeFixture(fixture);
    expect(await gitKeptFiles(dir, '.gitignore')).toEqual(['.gitignore', 'a/keep']);
    expect(await filterKeptFiles(dir, filterOptionsFor('.gitignore'), 'hook')).toEqual(['.gitignore']);
    expect(await filterKeptFiles(dir, filterOptionsFor('.gitignore'), 'post-filter only')).toEqual(['.gitignore']);
  });

  describe('generated cases', () => {
    const random = createRandom(generatorSeed);
    const generated = Array.from({ length: generatedCaseCount }, () => generateCase(random));

    // Most generated cases sit side by side in one tree, under directories `c<n>`, so a single
    // git run checks many of them and every rule goes through rebasing. A few run at the top level
    // of their own tree, where the rules reach the `ignore` package as written.
    const topLevelCount = Math.ceil(generatedCaseCount / 8);
    const batchSize = 60;

    test('top-level cases', async () => {
      for (const generatedCase of generated.slice(0, topLevelCount)) {
        const fixture = generatedCase.build(gitIgnoresCase);
        const dir = await writeFixture(fixture.files);
        if (fixture.name === 'multi') {
          const gitView = await writeFixture(mergeIgnoreFiles(fixture.files));
          await expectSameAsGit(dir, fixture.files, '.gitignore', { useGitignore: true, useDotIgnore: true }, gitView);
        } else {
          await expectSameAsGit(dir, fixture.files, fixture.name);
        }
      }
    });

    const nested = generated.slice(topLevelCount);
    for (let start = 0; start < nested.length; start += batchSize) {
      const batch = nested.slice(start, start + batchSize);
      test(`nested cases ${start + 1}-${start + batch.length}`, async () => {
        // A batch uses one ignore-file name; the cases' own names are remapped to it.
        for (const name of ['.gitignore', 'multi'] as const) {
          const files: Fixture = {};
          batch.forEach((generatedCase, index) => {
            const fixture = generatedCase.build(gitIgnoresCase, name);
            for (const [file, content] of Object.entries(fixture.files)) {
              files[`c${index}/${file}`] = content;
            }
          });
          const dir = await writeFixture(files);
          if (name === 'multi') {
            const gitView = await writeFixture(mergeIgnoreFiles(files));
            await expectSameAsGit(dir, files, '.gitignore', { useGitignore: true, useDotIgnore: true }, gitView);
          } else {
            await expectSameAsGit(dir, files, name);
          }
        }
      });
    }
  });
});

const IGNORE_FILE_NAMES: IgnoreFileName[] = ['.gitignore', '.ignore', '.repomixignore'];

// A copy of the fixture in which each directory's .gitignore holds the rules of its .gitignore,
// .ignore and .repomixignore in that order, which is how the filter applies them. The .ignore and
// .repomixignore files stay, as ordinary files for git.
const mergeIgnoreFiles = (fixture: Fixture): Fixture => {
  const merged: Fixture = { ...fixture };
  const dirs = new Set(
    Object.keys(fixture)
      .filter((file) => IGNORE_FILE_NAMES.includes(path.posix.basename(file) as IgnoreFileName))
      .map((file) => path.posix.dirname(file)),
  );
  for (const dir of dirs) {
    const prefix = dir === '.' ? '' : `${dir}/`;
    merged[`${prefix}.gitignore`] = IGNORE_FILE_NAMES.map((name) => fixture[`${prefix}${name}`] ?? '')
      .map((content) => (content && !content.endsWith('\n') ? `${content}\n` : content))
      .join('');
  }
  return merged;
};

// mulberry32: a small deterministic PRNG.
const createRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (probability: number) => next() < probability,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
};
type Random = ReturnType<typeof createRandom>;

const PLAIN_NAMES = [
  'a',
  'b',
  'x.txt',
  'y.log',
  'Foo',
  'build',
  'lib',
  'out',
  'node_modules',
  'coverage',
  'flow-typed',
];
const SPECIAL_NAMES = ['sp[1]', 'a*b', 'q?', 'b\\s', '#h', '!b', 'd e', 'trail ', 'b\t'];

// Rare and malformed glob syntax, where a matcher is most likely to differ from git. There is
// no `a**` here: git before 2.52 matched `a**/x` against `ax` (fixed by "match_pathname(): give
// fnmatch one char of prefix context"), so the answer would depend on the git version.
const EXOTIC_SEGMENTS = [
  '[]]',
  '[!]]',
  '[a-]',
  '[z-a]',
  '[[:alpha:]',
  '[[:bogus:]]',
  '[^a]',
  '[\\]]',
  'a[',
  '**a',
  '***',
  '\\a',
  '\\',
  '*\\',
  'x.t?t',
  '[.]*',
  '*[!.]*',
  '[a-c-e]',
  '[*]',
  '[?]',
  '[\\*]',
  '[]-a]',
  '[--0]',
  '[ab',
];

const flipCase = (random: Random, value: string): string =>
  value.replace(/[a-z]/gi, (char) => (random.chance(0.5) ? char.toUpperCase() : char.toLowerCase()));

const generateRule = (random: Random, names: string[]): string => {
  const segment = (): string => {
    const roll = random.next();
    if (roll < 0.1) return random.pick(EXOTIC_SEGMENTS);
    if (roll < 0.5) {
      const name = random.pick(names);
      // Glob characters in a real name are escaped so the rule names it literally.
      const literal = name.replace(/[\\*?[\]]/g, '\\$&').replace(/^[!#]/, '\\$&');
      return random.chance(0.15) ? flipCase(random, literal) : literal;
    }
    return random.pick([
      '*',
      '?',
      '**',
      '*.txt',
      '*.LOG',
      'b*',
      '*o*',
      '[ab]',
      '[a-c]',
      '[!a]',
      'x.???',
      '[[:upper:]]oo',
      '\\*',
      'a\\*b',
      '.',
      '..',
      'sp[1]',
      'node_modules',
      '[A-Z]*',
    ]);
  };
  const body = Array.from({ length: random.pick([1, 1, 1, 2, 2, 3]) }, segment).join(random.chance(0.05) ? '//' : '/');
  const lead = random.pick(['', '', '', '', '!', '!', '/', '**/', './', '../', '\\!', '\\#', '!/']);
  const trail = random.pick(['', '', '', '', '/', '/', ' ', '\\ ', '  ', '\t', '/..', '/**', '/*']);
  // An escaped slash (`\/`) is turned back into a plain one, which is what git reads it as: the
  // `ignore` package does not, a known difference covered by its own test above.
  return `${lead}${body}${trail}`.replace(/(?<!\\)((?:\\\\)*)\\\//g, '$1/');
};

const generateIgnoreFile = (random: Random, names: string[]): string => {
  const lines = Array.from({ length: random.int(1, 5) }, () => {
    if (random.chance(0.08)) return random.pick(['', '#comment', '# x', '   ', '!', '/', '!/', '\\']);
    return generateRule(random, names);
  });
  const eol = random.chance(0.15) ? '\r\n' : '\n';
  return (random.chance(0.08) ? '\uFEFF' : '') + lines.join(eol) + (random.chance(0.8) ? eol : '');
};

interface GeneratedCase {
  // `name` overrides the case's own ignore-file name; 'multi' places all three names.
  build: (
    caseInsensitive: boolean,
    name?: IgnoreFileName | 'multi',
  ) => { name: IgnoreFileName | 'multi'; files: Fixture };
}

// A case is generated as a seed for its own PRNG, so it can be built for either kind of
// filesystem and with any ignore-file name while the rest of the sequence stays the same.
const generateCase = (random: Random): GeneratedCase => {
  const caseSeed = Math.floor(random.next() * 2 ** 32);
  const ownName = random.pick<IgnoreFileName | 'multi'>([
    '.gitignore',
    '.gitignore',
    '.ignore',
    '.repomixignore',
    'multi',
  ]);
  return {
    build: (caseInsensitive, name = ownName) => {
      const caseRandom = createRandom(caseSeed);
      const names = supportsSpecialNames ? [...PLAIN_NAMES, ...SPECIAL_NAMES] : PLAIN_NAMES;
      const files: Fixture = {};
      const addDir = (dir: string, depth: number) => {
        const prefix = dir ? `${dir}/` : '';
        const used = new Set<string>();
        const childCount = caseRandom.int(1, 4);
        for (let index = 0; index < childCount; index++) {
          let child = caseRandom.pick(names);
          if (caseRandom.chance(0.15)) child = flipCase(caseRandom, child);
          // Siblings differing only in case cannot coexist on a case-insensitive filesystem.
          const key = caseInsensitive ? child.toLowerCase() : child;
          if (used.has(key)) continue;
          used.add(key);
          if (depth < 3 && caseRandom.chance(0.4)) {
            addDir(`${prefix}${child}`, depth + 1);
          } else {
            files[`${prefix}${child}`] = '';
          }
        }
        if (caseRandom.chance(dir ? 0.45 : 0.8)) {
          const placed = name === 'multi' ? IGNORE_FILE_NAMES.filter(() => caseRandom.chance(0.6)) : [name];
          // With several names, every directory holding one also holds a .gitignore, so the
          // merged copy git sees has the same set of files.
          if (name === 'multi' && placed.length > 0 && !placed.includes('.gitignore')) placed.unshift('.gitignore');
          for (const ignoreFile of placed) {
            // A multi-name fixture has no BOM: merging would move it into the middle of a file.
            const content = generateIgnoreFile(caseRandom, names);
            files[`${prefix}${ignoreFile}`] = name === 'multi' ? content.replace(/^\uFEFF/, '') : content;
          }
        }
      };
      addDir('', 0);
      return { name, files };
    },
  };
};
