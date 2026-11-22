import nodeFs, { type Dirent, type Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GlobEntry } from 'globby';
import ignore, { type Ignore } from 'ignore';
import { parseIgnoreFileLines, rebaseIgnorePattern } from './ignoreFileRules.js';

// Applies .gitignore / .ignore / .repomixignore the way globby's `gitignore` / `ignoreFiles`
// options did, without globby's cost on large repositories (a second walk to find the ignore
// files, then every result tested against the merged rules of every ignore file in the repo,
// plus a stat per result).
//
// globby rebases a rule from `dir/.gitignore` so that it starts with `dir/`, so it can only ever
// match paths below `dir`. Each directory therefore gets its own matcher holding only the rules
// of its ancestors' ignore files, in globby's order; for any path that gives the same answer as
// globby's merged matcher, at a fraction of the cost.
//
// The filter has two parts:
// - `readdir`, a hook for fast-glob's `fs` option, drops ignored entries while walking, so
//   ignored directories are never entered. It is only an optimisation: fast-glob does not call
//   readdir for static patterns (e.g. `--include secret.txt` or a `--stdin` file list).
// - `filterResults`, applied to every result, is the authoritative check. It builds any missing
//   directory matcher itself, so the result is the same whether the hook ran or not.

// globby never reads ignore files below these directory names (its `defaultIgnoredDirectories`
// for the ignore-file search), so their rules must not be applied either.
const UNREAD_IGNORE_FILE_DIR_NAMES = new Set(['node_modules', 'flow-typed', 'coverage', '.git']);
const GITIGNORE = '.gitignore';

export interface IgnoreFileFilterDeps {
  readdir: (dirPath: string) => Promise<Dirent[]>;
  readFile: (filePath: string, encoding: 'utf8') => Promise<string>;
  stat: (filePath: string) => Promise<Stats>;
  lstat: (filePath: string) => Promise<Stats>;
}

const defaultDeps: IgnoreFileFilterDeps = {
  readdir: (dirPath) => fs.readdir(dirPath, { withFileTypes: true }),
  readFile: fs.readFile,
  stat: fs.stat,
  lstat: fs.lstat,
};

interface RuleNode {
  patterns: string[];
  matcher: Ignore | undefined;
  // false below a symlinked directory: globby's ignore-file search did not follow symlinks.
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

const createMatcher = (patterns: string[]): Ignore | undefined =>
  patterns.length > 0 ? ignore().add(patterns) : undefined;

export const createIgnoreFileFilter = (
  rootDir: string,
  options: { useGitignore: boolean; useDotIgnore: boolean },
  deps: IgnoreFileFilterDeps = defaultDeps,
): IgnoreFileFilter => {
  const cwd = path.resolve(rootDir);
  const ignoreFileNames = new Set(['.repomixignore']);
  if (options.useDotIgnore) ignoreFileNames.add('.ignore');
  if (options.useGitignore) ignoreFileNames.add(GITIGNORE);

  const readIgnoreFile = async (filePath: string): Promise<string | undefined> => {
    try {
      return await deps.readFile(filePath, 'utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        return undefined;
      }
      throw new Error(`Failed to read ignore file at ${filePath}: ${(error as Error).message}`, { cause: error });
    }
  };

  // Same lookup as globby's findGitRoot: the nearest ancestor holding a `.git` file or directory.
  const findGitRoot = async (): Promise<string | undefined> => {
    for (let dir = cwd; ; dir = path.dirname(dir)) {
      try {
        const stats = await deps.stat(path.join(dir, '.git'));
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
  let setupPromise: Promise<{ baseDir: string; knownNode: RuleNode }> | undefined;
  const setup = () => {
    setupPromise ??= (async () => {
      const gitRoot = options.useGitignore ? await findGitRoot() : undefined;
      const baseDir = gitRoot ?? cwd;
      // globby reads the `.gitignore` files from the git root down to the cwd first (only
      // `.gitignore`, never `.ignore` / `.repomixignore`, and only regular files), or just the
      // cwd's `.gitignore` when there is no git root.
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
          const isFile = await deps.lstat(filePath).then(
            (stats) => stats.isFile(),
            () => false,
          );
          return isFile ? readIgnoreFile(filePath) : undefined;
        }),
      );
      const patterns = chain.flatMap((dir, index) =>
        toPatterns([contents[index]], toPosix(path.relative(baseDir, dir))),
      );
      return { baseDir, knownNode: { patterns, matcher: createMatcher(patterns), readsIgnoreFiles: true } };
    })();
    return setupPromise;
  };

  // Directory matchers, keyed by absolute directory path inside the cwd.
  const nodes = new Map<string, Promise<RuleNode>>();
  // Directories the walk has seen as real (non-symlink) directories, to skip an lstat for them.
  const knownRealDirs = new Set<string>();

  const buildNode = async (dir: string, dirents: Dirent[] | undefined): Promise<RuleNode> => {
    const { baseDir, knownNode } = await setup();
    const parentDir = path.dirname(dir);
    // `parentDir === dir` is the filesystem root: never look further up than that.
    const parent = dir === cwd || parentDir === dir ? knownNode : await getNode(parentDir, undefined);
    if (!parent.readsIgnoreFiles) return parent;
    if (dir !== cwd) {
      if (UNREAD_IGNORE_FILE_DIR_NAMES.has(path.basename(dir))) return { ...parent, readsIgnoreFiles: false };
      if (!knownRealDirs.has(dir)) {
        const isRealDir = await deps.lstat(dir).then(
          (stats) => stats.isDirectory(),
          () => false,
        );
        if (!isRealDir) return { ...parent, readsIgnoreFiles: false };
      }
    }
    const entries = dirents ?? (await deps.readdir(dir).catch(() => [] as Dirent[]));
    // Several ignore files in one directory are applied in directory listing order, as globby's
    // ignore-file search returned them. The cwd's `.gitignore` was already read with the chain.
    const ignoreFiles = entries.filter(
      (entry) => ignoreFileNames.has(entry.name) && entry.isFile() && !(dir === cwd && entry.name === GITIGNORE),
    );
    if (ignoreFiles.length === 0) return parent;
    const contents = await Promise.all(ignoreFiles.map((entry) => readIgnoreFile(path.join(dir, entry.name))));
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
  // there can be ignored (globby's matcher never ignored paths outside its base directory).
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
    const dirs = new Map<string, { dir: string; resolved: Awaited<ReturnType<typeof resolveDir>> }>();
    await Promise.all(
      [...new Set(splitPaths.map(({ dirKey }) => dirKey))].map(async (dirKey) => {
        const dir = path.resolve(cwd, dirKey);
        dirs.set(dirKey, { dir, resolved: await resolveDir(dir) });
      }),
    );
    // Directory-ness as globby's filter saw it: a stat, which follows symlinks. Only objectMode
    // results can be symlinks; onlyFiles / onlyDirectories never return one.
    const isDirectory = (result: string | GlobEntry, absPath: () => string): boolean | Promise<boolean> => {
      if (kind !== 'entries') return kind === 'directories';
      const { dirent } = result as GlobEntry;
      if (!dirent.isSymbolicLink()) return dirent.isDirectory();
      return deps.stat(absPath()).then(
        (stats) => stats.isDirectory(),
        () => false,
      );
    };
    const decide = (result: string | GlobEntry, index: number): boolean | Promise<boolean> => {
      const { dirKey, name } = splitPaths[index];
      const { dir, resolved } = dirs.get(dirKey) ?? {};
      if (!resolved || !dir) return true;
      const rel = resolved.prefix + name;
      if (resolved.matcher.ignores(rel)) return false;
      const directory = isDirectory(result, () => path.join(dir, name));
      const keepDirectory = (isDir: boolean) => !(isDir && resolved.matcher.ignores(`${rel}/`));
      return typeof directory === 'boolean' ? keepDirectory(directory) : directory.then(keepDirectory);
    };
    // Only objectMode results may need a stat; keep the common case free of per-result promises.
    const keep = kind === 'entries' ? await Promise.all(results.map(decide)) : results.map(decide);
    return results.filter((_, index) => keep[index]);
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
