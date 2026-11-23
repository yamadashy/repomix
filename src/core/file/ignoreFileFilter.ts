import nodeFs, { type Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GlobEntry } from 'globby';
import ignore, { type Ignore } from 'ignore';
import { isCaseInsensitiveDirectory } from './caseInsensitiveDirectory.js';
import { parseIgnoreFileLines, rebaseIgnorePattern } from './ignoreFileRules.js';

// Applies .gitignore / .ignore / .repomixignore with git's semantics: `.ignore` and
// `.repomixignore` behave as if they were further `.gitignore` files in the same directory.
//
// A rule from `dir/.gitignore` is rebased so that it starts with `dir/` (ignoreFileRules.ts), so
// it can only ever match paths below `dir`. Each directory therefore gets its own matcher holding
// only the rules of its ancestors' ignore files and its own, deeper directories last so that their
// rules override shallower ones, as in git.
//
// The filter has two parts:
// - `readdir`, a hook for fast-glob's `fs` option, drops ignored entries while walking, so
//   ignored directories are never entered. It is only an optimisation: fast-glob does not call
//   readdir for static patterns (e.g. `--include secret.txt` or a `--stdin` file list).
// - `filterResults`, applied to every result, is the authoritative check. It builds any missing
//   directory matcher itself, so the result is the same whether the hook ran or not.

// Git never looks inside `.git`, so ignore files there are not read.
const GIT_DIR_NAME = '.git';
const GITIGNORE = '.gitignore';
// The order in which the ignore files of one directory are applied, later ones overriding
// earlier ones, independent of the order the filesystem lists them in.
const IGNORE_FILE_PRECEDENCE = [GITIGNORE, '.ignore', '.repomixignore'];

interface RuleNode {
  patterns: string[];
  matcher: Ignore | undefined;
  // false below a symlinked directory or `.git`: git never reads ignore files there (it does
  // not follow symlinked directories).
  readsIgnoreFiles: boolean;
}

type ReaddirCallback = (error: NodeJS.ErrnoException | null, entries?: Dirent[]) => void;

export interface IgnoreFileFilter {
  readdir: (dirPath: string, options: unknown, callback: ReaddirCallback) => void;
  filterResults: <T extends string | GlobEntry>(
    results: T[],
    kind: 'files' | 'directories' | 'entries',
  ) => Promise<T[]>;
}

const toPosix = (value: string): string => (path.sep === '\\' ? value.replace(/\\/g, '/') : value);

const isOutside = (relativePath: string): boolean =>
  relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath);

export const createIgnoreFileFilter = (
  rootDir: string,
  options: { useGitignore: boolean; useDotIgnore: boolean },
): IgnoreFileFilter => {
  const cwd = path.resolve(rootDir);
  const ignoreFileNames = new Set(['.repomixignore']);
  if (options.useDotIgnore) ignoreFileNames.add('.ignore');
  if (options.useGitignore) ignoreFileNames.add(GITIGNORE);

  const readIgnoreFile = async (filePath: string): Promise<string | undefined> => {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        return undefined;
      }
      throw new Error(`Failed to read ignore file at ${filePath}: ${(error as Error).message}`, { cause: error });
    }
  };

  // The nearest ancestor holding a `.git` directory, or a `.git` file as in worktrees and
  // submodules: the top of the repository whose .gitignore files apply.
  const findGitRoot = async (): Promise<string | undefined> => {
    for (let dir = cwd; ; dir = path.dirname(dir)) {
      try {
        const stats = await fs.stat(path.join(dir, '.git'));
        if (stats.isDirectory() || stats.isFile()) return dir;
      } catch {
        // Not here; keep looking upwards.
      }
      if (path.dirname(dir) === dir) return undefined;
    }
  };

  const toPatterns = (contents: (string | undefined)[], base: string): string[] =>
    contents.flatMap((content) =>
      content === undefined ? [] : parseIgnoreFileLines(content).map((line) => rebaseIgnorePattern(line, base)),
    );

  // Lazily initialised so that a mocked walker returning nothing never touches the filesystem.
  let setupPromise:
    | Promise<{ baseDir: string; knownNode: RuleNode; createMatcher: (patterns: string[]) => Ignore | undefined }>
    | undefined;
  const setup = () => {
    setupPromise ??= (async () => {
      const [gitRoot, ignoreCase] = await Promise.all([
        options.useGitignore ? findGitRoot() : undefined,
        isCaseInsensitiveDirectory(cwd),
      ]);
      const createMatcher = (patterns: string[]): Ignore | undefined =>
        patterns.length > 0 ? ignore({ ignorecase: ignoreCase }).add(patterns) : undefined;
      const baseDir = gitRoot ?? cwd;
      // The `.gitignore` files from the git root down to the cwd apply, as they do in git when it
      // runs in a subdirectory, or just the cwd's own when there is no git root. `.ignore` and
      // `.repomixignore` are only read from the cwd down. Like git, a symlinked ignore file is
      // not read.
      const chain: string[] = [];
      if (options.useGitignore) {
        for (let dir = cwd; ; dir = path.dirname(dir)) {
          chain.unshift(dir);
          if (dir === baseDir || path.dirname(dir) === dir) break;
        }
      }
      const contents = await Promise.all(
        chain.map(async (dir) => {
          const filePath = path.join(dir, GITIGNORE);
          const isFile = await fs.lstat(filePath).then(
            (stats) => stats.isFile(),
            () => false,
          );
          return isFile ? readIgnoreFile(filePath) : undefined;
        }),
      );
      const patterns = chain.flatMap((dir, index) =>
        toPatterns([contents[index]], toPosix(path.relative(baseDir, dir))),
      );
      return {
        baseDir,
        createMatcher,
        knownNode: { patterns, matcher: createMatcher(patterns), readsIgnoreFiles: true },
      };
    })();
    return setupPromise;
  };

  // Directory matchers, keyed by absolute directory path inside the cwd.
  const nodes = new Map<string, Promise<RuleNode>>();
  // Directories the walk has seen as real (non-symlink) directories, to skip an lstat for them.
  const knownRealDirs = new Set<string>();

  const buildNode = async (dir: string, dirents: Dirent[] | undefined): Promise<RuleNode> => {
    const { baseDir, knownNode, createMatcher } = await setup();
    const parentDir = path.dirname(dir);
    // `parentDir === dir` is the filesystem root: never look further up than that.
    const parent = dir === cwd || parentDir === dir ? knownNode : await getNode(parentDir, undefined);
    if (!parent.readsIgnoreFiles) return parent;
    if (dir !== cwd) {
      if (path.basename(dir) === GIT_DIR_NAME) return { ...parent, readsIgnoreFiles: false };
      if (!knownRealDirs.has(dir)) {
        const isRealDir = await fs.lstat(dir).then(
          (stats) => stats.isDirectory(),
          () => false,
        );
        if (!isRealDir) return { ...parent, readsIgnoreFiles: false };
      }
    }
    const entries = dirents ?? (await fs.readdir(dir, { withFileTypes: true }).catch(() => [] as Dirent[]));
    // Only regular files are read: git does not follow a symlinked ignore file. The cwd's
    // `.gitignore` was already read with the chain.
    const present = new Set(
      entries
        .filter((entry) => ignoreFileNames.has(entry.name) && entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => !(dir === cwd && name === GITIGNORE)),
    );
    if (present.size === 0) return parent;
    const ignoreFiles = IGNORE_FILE_PRECEDENCE.filter((name) => present.has(name));
    const contents = await Promise.all(ignoreFiles.map((name) => readIgnoreFile(path.join(dir, name))));
    const added = toPatterns(contents, toPosix(path.relative(baseDir, dir)));
    if (added.length === 0) return parent;
    const patterns = [...parent.patterns, ...added];
    return { patterns, matcher: createMatcher(patterns), readsIgnoreFiles: true };
  };

  const getNode = (dir: string, dirents: Dirent[] | undefined): Promise<RuleNode> => {
    let node = nodes.get(dir);
    if (!node) {
      node = buildNode(dir, dirents);
      nodes.set(dir, node);
    }
    return node;
  };

  // The matcher and base-relative prefix for the entries of `dir`, or undefined when nothing
  // there can be ignored (no ignore file applies outside the git root, or the cwd without one).
  const resolveDir = async (
    dir: string,
    dirents?: Dirent[],
  ): Promise<{ matcher: Ignore; prefix: string } | undefined> => {
    const { baseDir, knownNode } = await setup();
    const relBase = path.relative(baseDir, dir);
    if (isOutside(relBase)) return undefined;
    // Inside the git root but outside the cwd only the parent-chain .gitignore rules apply.
    // Inside the cwd, the directory is rebuilt from the cwd's own spelling: on Windows a result
    // may spell the cwd differently (`c:\` for `C:\`), and the walk up from a directory has to
    // arrive at `cwd` itself.
    const relCwd = path.relative(cwd, dir);
    const node = isOutside(relCwd) ? knownNode : await getNode(relCwd ? path.join(cwd, relCwd) : cwd, dirents);
    if (!node.matcher) return undefined;
    return { matcher: node.matcher, prefix: relBase ? `${toPosix(relBase)}/` : '' };
  };

  const filterDirents = async (dir: string, dirents: Dirent[]): Promise<Dirent[]> => {
    for (const entry of dirents) {
      if (entry.isDirectory()) knownRealDirs.add(path.join(dir, entry.name));
    }
    const resolved = await resolveDir(dir, dirents);
    if (!resolved) return dirents;
    const { matcher, prefix } = resolved;
    // Only drop what filterResults would drop too. An ignored `dir/` ignores everything below it
    // (the `ignore` package checks parents first), so such a directory is not walked at all.
    // A directory matched only without the slash is kept so its children are still tested.
    return dirents.filter(
      (entry) =>
        !(entry.isDirectory() ? matcher.ignores(`${prefix}${entry.name}/`) : matcher.ignores(prefix + entry.name)),
    );
  };

  const filterResults: IgnoreFileFilter['filterResults'] = async (results, kind) => {
    // fast-glob returns '/'-separated paths, relative to the cwd (absolute for absolute patterns).
    const splitPaths = results.map((result) => {
      const resultPath = typeof result === 'string' ? result : result.path;
      const slashIndex = resultPath.lastIndexOf('/');
      return {
        // The slash is kept so that a file in a root resolves to that root (`/`, `C:/`).
        dirKey: slashIndex < 0 ? '.' : resultPath.slice(0, slashIndex + 1),
        name: resultPath.slice(slashIndex + 1),
      };
    });
    const dirs = new Map<string, Awaited<ReturnType<typeof resolveDir>>>();
    await Promise.all(
      [...new Set(splitPaths.map(({ dirKey }) => dirKey))].map(async (dirKey) => {
        dirs.set(dirKey, await resolveDir(path.resolve(cwd, dirKey)));
      }),
    );
    // A symlink counts as a file, as in the readdir hook and in git, so a directory-only rule
    // does not match it. Only objectMode returns symlinks, and fileSearch drops them from its
    // results either way.
    const isDirectory = (result: string | GlobEntry): boolean =>
      typeof result === 'string' ? kind === 'directories' : result.dirent.isDirectory();
    return results.filter((result, index) => {
      const { dirKey, name } = splitPaths[index];
      const resolved = dirs.get(dirKey);
      if (!resolved) return true;
      const rel = resolved.prefix + name;
      if (resolved.matcher.ignores(rel)) return false;
      // A directory is also tested with a trailing slash so directory-only rules apply.
      return !(isDirectory(result) && resolved.matcher.ignores(`${rel}/`));
    });
  };

  return {
    readdir: (dirPath, readdirOptions, callback) => {
      if ((readdirOptions as { withFileTypes?: boolean } | undefined)?.withFileTypes !== true) {
        // fast-glob only reads without file types when `stats: true`, which repomix never sets.
        nodeFs.readdir(dirPath, readdirOptions as never, callback as never);
        return;
      }
      nodeFs.readdir(dirPath, { withFileTypes: true }, (error, dirents) => {
        if (error) {
          callback(error);
          return;
        }
        filterDirents(path.resolve(dirPath), dirents).then(
          (kept) => callback(null, kept),
          (filterError: NodeJS.ErrnoException) => callback(filterError),
        );
      });
    },
    filterResults,
  };
};
