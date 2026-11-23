import { spawnSync } from 'node:child_process';
import nodeFs from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type Options as GlobbyOptions, type GlobEntry, globby } from 'globby';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createIgnoreFileFilter } from '../../../src/core/file/ignoreFileFilter.js';
import { isWindows } from '../../testing/testUtils.js';

// Guards the rule for replacing globby's `gitignore` / `ignoreFiles` options with
// ignoreFileFilter.ts: for every path, the filter's decision either stays what globby decided or
// becomes what git decides. Seeded generated trees and ignore files are searched three ways:
// - OLD: globby with the options fileSearch used to pass (`gitignore`, `ignoreFiles`),
// - NEW: globby with the filter, with its readdir hook and with the post-filter alone, which
//   must agree exactly,
// - GIT: `git ls-files --others` (files) and `git check-ignore` (directories) on a copy of the tree
//   holding the same rules as .gitignore files: the ignore files the filter reads (all three names
//   below the cwd, only .gitignore above it), merged per directory in listing order.
//
// Left out of the generator, because git differs from both OLD and NEW there for reasons
// unrelated to this rule, so a change for one reason can land on the other's answer: ignore files
// below node_modules, coverage, flow-typed or .git (never read), non-ASCII names (macOS git
// precomposes them), names or rules differing only in case (the `ignore` package ignores case,
// git follows core.ignorecase), and `a**` (git before 2.52 matched `a**/x` against `ax`).
//
// REPOMIX_IGNORE_DIFF_CASES and REPOMIX_IGNORE_DIFF_SEED run more cases or another seed.

type Fixture = Record<string, string | null>; // null: an empty directory
type NameMode = '.gitignore' | '.ignore' | '.repomixignore' | 'multi';
type FilterOptions = { useGitignore: boolean; useDotIgnore: boolean };

const IGNORE_FILE_NAMES = ['.gitignore', '.ignore', '.repomixignore'];
const isGitAvailable = spawnSync('git', ['--version'], { stdio: 'ignore' }).status === 0;
const caseCount = Number(process.env.REPOMIX_IGNORE_DIFF_CASES ?? 96);
const seed = Number(process.env.REPOMIX_IGNORE_DIFF_SEED ?? 20251123);
const batchSize = 24;

const optionsFor = (mode: NameMode): FilterOptions => ({
  useGitignore: mode === '.gitignore' || mode === 'multi',
  useDotIgnore: mode === '.ignore' || mode === 'multi',
});
const activeNames = (options: FilterOptions): Set<string> =>
  new Set(
    IGNORE_FILE_NAMES.filter((name) =>
      name === '.gitignore' ? options.useGitignore : name === '.ignore' ? options.useDotIgnore : true,
    ),
  );

describe.skipIf(!isGitAvailable)('ignoreFileFilter: every change from globby moves to git', () => {
  let tempDir: string;
  let gitDir: string;
  let gitEnv: NodeJS.ProcessEnv;
  let counter = 0;

  const runGit = (args: string[], cwd: string, input?: string): string => {
    const result = spawnSync('git', ['-c', 'core.excludesFile=', '--git-dir', gitDir, '--work-tree', cwd, ...args], {
      cwd,
      env: gitEnv,
      input,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    // check-ignore exits with 1 when no path is ignored.
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
    return result.stdout;
  };

  beforeAll(async () => {
    tempDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-ignore-diff-')));
    // Independent of the developer's git setup: no global or system config, no GIT_* variables.
    gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    gitEnv.GIT_CONFIG_GLOBAL = path.join(tempDir, 'no-global-gitconfig');
    gitEnv.GIT_CONFIG_NOSYSTEM = '1';
    // One repository serves every tree through --work-tree; its index stays empty.
    const repoDir = path.join(tempDir, 'repo');
    const init = spawnSync('git', ['init', '--quiet', repoDir], { env: gitEnv });
    if (init.status !== 0) throw new Error(`git init failed: ${init.stderr}`);
    gitDir = path.join(repoDir, '.git');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    // Removing the trees of a large REPOMIX_IGNORE_DIFF_CASES run takes longer than the default.
  }, 600_000);

  const writeTree = async (fixture: Fixture, withGitDir: boolean): Promise<string> => {
    const dir = path.join(tempDir, `t${counter++}`);
    const entries = Object.entries(fixture);
    const dirs = new Set([dir, ...(withGitDir ? [path.join(dir, '.git')] : [])]);
    for (const [entry, content] of entries) {
      dirs.add(path.dirname(path.join(dir, entry)));
      if (content === null) dirs.add(path.join(dir, entry));
    }
    for (const target of [...dirs].sort()) await fs.mkdir(target, { recursive: true });
    await Promise.all(
      entries.flatMap(([entry, content]) => (content === null ? [] : [fs.writeFile(path.join(dir, entry), content)])),
    );
    return dir;
  };

  // One walk for files and directories (as searchFiles does for empty directories); a directory
  // is returned with a trailing slash.
  const search = async (
    cwd: string,
    options: FilterOptions,
    mode: 'old' | 'hook' | 'post-filter only',
  ): Promise<Set<string>> => {
    const base: GlobbyOptions & { objectMode: true } = {
      cwd,
      dot: true,
      followSymbolicLinks: false,
      absolute: false,
      onlyFiles: false,
      objectMode: true,
    };
    let entries: GlobEntry[];
    if (mode === 'old') {
      const ignoreFiles = [...(options.useDotIgnore ? ['**/.ignore'] : []), '**/.repomixignore'];
      entries = await globby(['**/*'], { ...base, gitignore: options.useGitignore, ignoreFiles });
    } else {
      const filter = createIgnoreFileFilter(cwd, options);
      const fsOption = { ...nodeFs, readdir: filter.readdir } as unknown as GlobbyOptions['fs'];
      entries = await filter.filterResults(
        await globby(['**/*'], mode === 'hook' ? { ...base, fs: fsOption } : base),
        'entries',
      );
    }
    return new Set(entries.map((entry) => (entry.dirent.isDirectory() ? `${entry.path}/` : entry.path)));
  };

  // The tree git is asked about: the rules the filter reads, as .gitignore files. Returns the
  // view and its directories.
  const writeGitView = async (root: string, cwdRel: string, options: FilterOptions) => {
    const view = path.join(tempDir, `t${counter++}`);
    const names = activeNames(options);
    const dirs: string[] = [];
    const copy = async (rel: string): Promise<void> => {
      await fs.mkdir(path.join(view, rel), { recursive: true });
      const entries = (await fs.readdir(path.join(root, rel), { withFileTypes: true })).filter(
        (entry) => entry.name !== '.git',
      );
      const belowCwd = cwdRel === '' || rel === cwdRel || rel.startsWith(`${cwdRel}/`);
      const contents = await Promise.all(
        entries.map(async (entry) => {
          const childRel = rel ? `${rel}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            dirs.push(childRel);
            await copy(childRel);
            return undefined;
          }
          const content = await fs.readFile(path.join(root, childRel), 'utf8');
          if (entry.name !== '.gitignore') await fs.writeFile(path.join(view, childRel), content);
          return content;
        }),
      );
      // A directory's rules in listing order, as the filter applies them.
      const rules: string[] = [];
      entries.forEach((entry, index) => {
        const content = contents[index];
        if (content === undefined) return;
        if (!(belowCwd ? names.has(entry.name) : entry.name === '.gitignore' && options.useGitignore)) return;
        // Each file keeps its own first-line BOM handling and line ending.
        const rule = rules.length > 0 ? content.replace(/^\uFEFF/, '') : content;
        rules.push(rule.endsWith('\n') || rule === '' ? rule : `${rule}\n`);
      });
      // A .gitignore that is not read is still a file to decide on.
      if (rules.length > 0 || entries.some((entry) => entry.name === '.gitignore' && entry.isFile())) {
        await fs.writeFile(path.join(view, rel, '.gitignore'), rules.join(''));
      }
    };
    await copy('');
    return { view, dirs };
  };

  // Git's decision for each path below `cwdRel`, relative to it: true when git keeps it. Every file
  // is untracked and there are no nested repositories, so a file git does not list is ignored.
  const gitDecisions = (view: string, cwdRel: string, dirs: string[]): Map<string, boolean> => {
    const decisions = new Map<string, boolean>();
    const prefix = cwdRel ? `${cwdRel}/` : '';
    const put = (entry: string, kept: boolean) => {
      if (entry.startsWith(prefix)) decisions.set(entry.slice(prefix.length), kept);
    };
    const files = runGit(['ls-files', '--others', '-z', '--exclude-per-directory=.gitignore'], view);
    for (const file of files.split('\0').filter(Boolean)) put(file, true);
    if (dirs.length > 0) {
      const output = runGit(['check-ignore', '--no-index', '--stdin', '-z', '-v', '-n'], view, `${dirs.join('\0')}\0`);
      const fields = output.split('\0');
      for (let index = 0; index + 3 < fields.length; index += 4) {
        const [source, , pattern, entry] = fields.slice(index, index + 4);
        put(`${entry}/`, source === '' || pattern.startsWith('!'));
      }
    }
    return decisions;
  };

  const check = async (root: string, cwdRel: string, options: FilterOptions, label: string) => {
    const cwd = path.join(root, cwdRel);
    const { view, dirs } = await writeGitView(root, cwdRel, options);
    const git = gitDecisions(view, cwdRel, dirs);
    const failures: string[] = [];
    const failing: string[] = [];
    const old = await search(cwd, options, 'old');
    const hook = await search(cwd, options, 'hook');
    const post = await search(cwd, options, 'post-filter only');
    expect([...post].sort(), `${label}: with and without the readdir hook`).toEqual([...hook].sort());
    for (const entry of new Set([...old, ...hook])) {
      const kept = hook.has(entry);
      // The repository's own .git directory is no path git decides on.
      if (kept === old.has(entry) || entry.startsWith('.git/')) continue;
      const gitKept = git.get(entry) ?? (entry.endsWith('/') ? undefined : false);
      if (gitKept !== kept) {
        failing.push(path.posix.join(cwdRel, entry));
        failures.push(
          `${entry}: new ${kept ? 'keeps' : 'drops'}, old ${old.has(entry) ? 'keeps' : 'drops'}, git ${gitKept === undefined ? 'has no answer' : gitKept ? 'keeps' : 'drops'}`,
        );
      }
    }
    if (failures.length > 0) {
      // Name the ignore files that can affect the failing paths, rather than the whole tree.
      const relevant: string[] = [];
      for (const entry of new Set(
        failing.flatMap((failed) => failed.split('/').map((_, index, parts) => parts.slice(0, index).join('/'))),
      )) {
        for (const name of IGNORE_FILE_NAMES) {
          const file = path.join(root, entry, name);
          const content = await fs.readFile(file, 'utf8').catch(() => undefined);
          if (content !== undefined) relevant.push(`${path.posix.join(entry, name)}: ${JSON.stringify(content)}`);
        }
      }
      expect.fail(`${label}: changed away from globby but not to git\n${[...failures, ...relevant].join('\n')}`);
    }
  };

  const random = createRandom(seed);
  const cases = Array.from({ length: caseCount }, () => generateCase(random));

  for (let start = 0; start < cases.length; start += batchSize) {
    const batch = cases.slice(start, start + batchSize);
    test(`cases ${start + 1}-${start + batch.length} (seed ${seed})`, async () => {
      for (const mode of ['.gitignore', '.ignore', '.repomixignore', 'multi'] as const) {
        const fixture: Fixture = {};
        batch.forEach((generated, index) => {
          for (const [entry, content] of Object.entries(generated.build(mode))) fixture[`c${index}/${entry}`] = content;
        });
        // Side by side below the repository root, every rule goes through rebasing.
        const root = await writeTree(fixture, true);
        await check(root, '', optionsFor(mode), `${mode} at the root`);
        // Searched from inside a case, the rules above the cwd come from the parent chain.
        const nested = batch.findIndex((generated) => generated.subdir);
        if (nested >= 0) {
          await check(
            root,
            `c${nested}/${batch[nested].subdir}`,
            optionsFor(mode),
            `${mode} from c${nested}/${batch[nested].subdir}`,
          );
        }
      }
    });
  }
});

// mulberry32: a small deterministic PRNG.
const createRandom = (initialSeed: number) => {
  let state = initialSeed >>> 0;
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
  'build',
  'lib',
  'out',
  'keep',
  'thing',
  'sub',
  '.hidden',
  '-dash',
  'a.b.c',
  // Shapes common in real ignore files (editor backups, compiled files, cache directories).
  'x.pyc',
  'q.Cache',
  'b~',
  '.#a',
  '_.swp',
  'report.1.json',
];
// Gitignore syntax in names; the ones Windows cannot hold only elsewhere.
const PORTABLE_SPECIAL_NAMES = ['sp[1]', 'sp1', '!b', '#h', 'd e', '..a'];
const POSIX_SPECIAL_NAMES = ['a*b', 'axb', 'q?', 'qz', 'b\\s', 'tab\tname', 'x.', 'trail '];
const NAMES = [...PLAIN_NAMES, ...PORTABLE_SPECIAL_NAMES, ...(isWindows ? [] : POSIX_SPECIAL_NAMES)];
const GLOB_SEGMENTS = [
  '*',
  '*',
  '?',
  '**',
  '**',
  '*.txt',
  '*.log',
  'b*',
  '[ab]',
  '[a-c]',
  '[!a]',
  '.*',
  'k*',
  '*[!.]*',
  // Seen in real ignore files: several classes in one segment, ranges, members of three or more.
  '*.py[cod]',
  '*.[Cc]ache',
  '[._]*.s[a-v][a-z]',
  'report.[0-9]*.json',
  '*~',
  '.#*',
];
const LEADS = ['', '', '', '', '!', '!', '!', '/', '/', '**/', './', '../', '\\!', '\\#', '!/', '!**/'];
const TRAILS = ['', '', '', '', '/', '/', '/', ' ', '\\ ', '\t', '/..', '/.', '//', '/**', '/*', '/**/*'];
const ODD_LINES = ['', '#comment', '   ', '!', '/', '!/', '\\', '*', '!*', '**', '.', '..', '!../', '\uFEFFb'];

const escapeName = (name: string): string =>
  name
    .replace(/[\\*?[\]]/g, '\\$&')
    .replace(/^[!#]/, '\\$&')
    .replace(/ $/, '\\ ');

const generateRule = (random: Random, below: string[]): string => {
  let body: string;
  if (below.length > 0 && random.chance(0.3)) {
    // A real path below the ignore file's directory, with some segments turned into wildcards.
    body = random
      .pick(below)
      .split('/')
      .map((segment) => (random.chance(0.2) ? random.pick(['*', '**', '?*']) : escapeName(segment)))
      .join('/');
  } else {
    const segment = () => (random.chance(0.5) ? escapeName(random.pick(NAMES)) : random.pick(GLOB_SEGMENTS));
    body = Array.from({ length: random.pick([1, 1, 2, 2, 3, 4]) }, segment).join('/');
  }
  // No `a**` (see above).
  return `${random.pick(LEADS)}${body}${random.pick(TRAILS)}`.replace(/([^/*])\*\*/g, '$1*');
};

const generateIgnoreFile = (random: Random, below: string[]): string => {
  const lines: string[] = [];
  for (let count = random.int(1, 5); count > 0; count--) {
    if (random.chance(0.1)) lines.push(random.pick(ODD_LINES));
    else if (lines.length > 0 && random.chance(0.05)) lines.push(random.pick(lines));
    else lines.push(generateRule(random, below));
  }
  const eol = random.chance(0.15) ? '\r\n' : '\n';
  return (random.chance(0.08) ? '\uFEFF' : '') + lines.join(eol) + (random.chance(0.8) ? eol : '');
};

interface GeneratedCase {
  // A directory of the case to search from, if it has one.
  subdir: string | undefined;
  build: (mode: NameMode) => Fixture;
}

// A case is kept as the seed of its own PRNG, so it can be built with any ignore-file names.
const generateCase = (random: Random): GeneratedCase => {
  const caseSeed = Math.floor(random.next() * 2 ** 32);
  const shape = createRandom(caseSeed);
  const entries: Fixture = {};
  const dirs: string[] = [''];
  const addDir = (dir: string, depth: number) => {
    const used = new Set<string>();
    for (let count = shape.int(depth === 0 ? 2 : 0, 4); count > 0; count--) {
      const name = shape.pick(NAMES);
      if (used.has(name)) continue;
      used.add(name);
      const entry = dir ? `${dir}/${name}` : name;
      if (depth < 3 && shape.chance(0.45)) {
        dirs.push(entry);
        entries[entry] = null;
        addDir(entry, depth + 1);
      } else {
        entries[entry] = '';
      }
    }
  };
  addDir('', 0);
  // globby cannot search from a cwd with a backslash in it.
  const subdirs = dirs.filter((dir) => dir && !dir.includes('\\'));
  const subdir = subdirs.length > 0 && shape.chance(0.5) ? shape.pick(subdirs) : undefined;
  return {
    subdir,
    build: (mode) => {
      const rules = createRandom(caseSeed ^ 0x9e3779b9);
      const fixture: Fixture = { ...entries };
      for (const dir of dirs) {
        if (!rules.chance(dir ? 0.45 : 0.85)) continue;
        const prefix = dir ? `${dir}/` : '';
        const below = Object.keys(entries)
          .filter((entry) => entry.startsWith(prefix) && entry !== dir)
          .map((entry) => entry.slice(prefix.length));
        const names = mode === 'multi' ? IGNORE_FILE_NAMES.filter(() => rules.chance(0.6)) : [mode];
        for (const name of names) {
          // Now and then a .gitignore that is a directory, which is never read.
          const isDirectory = mode === '.gitignore' && rules.chance(0.03);
          fixture[`${prefix}${name}`] = isDirectory ? null : generateIgnoreFile(rules, below);
        }
      }
      return fixture;
    },
  };
};
