/**
 * Builds a synchronous ignore-file filter (`.gitignore` / `.repomixignore` /
 * `.ignore`) that replaces globby's `gitignore: true` + `ignoreFiles` options.
 *
 * Why: with `gitignore: true`, globby filters every matched path through an
 * async predicate (`Promise.all` over one promise per path, plus a promisified
 * stat each). For a ~1,100-file repo that costs tens of milliseconds of
 * microtask churn per search. Discovering and parsing the ignore files
 * ourselves yields a synchronous predicate applied as a plain `Array.filter`,
 * plus the same fast-glob `ignore` pattern injection globby uses to prune
 * ignored directories during traversal (the no-negations fast path).
 *
 * Equivalence contract: this module replicates globby v16's behavior —
 * discovery via the same fast-glob options as `globIgnoreFiles`, parent
 * `.gitignore` collection up to the git root, identical pattern anchoring and
 * matching (see gitignoreParse.ts), and identical pruning-pattern derivation.
 * Output must remain byte-identical with the globby path it replaces.
 */

import fs from 'node:fs/promises';
import nodePath from 'node:path';
import fastGlob from 'fast-glob';
import type { Options as GlobbyOptions } from 'globby';
import ignore from 'ignore';
import {
  convertPatternsForFastGlob,
  createIgnoreMatcher,
  type IgnoreFileRecord,
  parseIgnoreFile,
} from './gitignoreParse.js';

/**
 * Directories globby always excludes from ignore-file discovery
 * (`defaultIgnoredDirectories` in globby's ignore.js).
 */
const DISCOVERY_DEFAULT_IGNORED_DIRECTORIES = ['**/node_modules', '**/flow-typed', '**/coverage', '**/.git'];

const GITIGNORE_FILES_PATTERN = '**/.gitignore';

export interface IgnoreFileFilter {
  /**
   * Returns true when a path should be excluded by the discovered ignore-file
   * rules. `relativePath` is relative to the scan root. `isDirectory` enables
   * the trailing-separator test that directory-only rules (`dir/`) require,
   * mirroring globby's filter which stats each path for the same purpose.
   */
  isIgnored: (relativePath: string, isDirectory: boolean) => boolean;

  /**
   * Patterns derived from the ignore files that are safe to add to fast-glob's
   * `ignore` option so ignored directories are pruned during traversal. Empty
   * when negations are present or when patterns are anchored to a git root
   * above the scan root (globby behaves identically in both cases).
   */
  patternsForFastGlob: string[];
}

/**
 * Walks upward from `cwd` to the filesystem root looking for a `.git` entry.
 * A regular file qualifies too (git worktrees and submodules use a `.git`
 * file). Replicates globby's `findGitRoot`.
 */
const findGitRoot = async (cwd: string): Promise<string | undefined> => {
  let currentPath = nodePath.resolve(cwd);
  const { root } = nodePath.parse(currentPath);

  while (true) {
    try {
      const stats = await fs.stat(nodePath.join(currentPath, '.git'));
      if (stats.isDirectory() || stats.isFile()) {
        return currentPath;
      }
    } catch {
      // Not found here; keep walking up.
    }
    if (currentPath === root) {
      break;
    }
    const parentPath = nodePath.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
  }

  return undefined;
};

/**
 * `.gitignore` paths for every directory from `gitRoot` down to `cwd`
 * (inclusive), ordered root → cwd so deeper files take precedence when the
 * patterns are concatenated. Replicates globby's `getParentGitignorePaths`.
 */
const getParentGitignorePaths = (gitRoot: string, cwd: string): string[] => {
  const resolvedGitRoot = nodePath.resolve(gitRoot);
  const resolvedCwd = nodePath.resolve(cwd);

  const relativePath = nodePath.relative(resolvedGitRoot, resolvedCwd);
  const isWithinGitRoot = resolvedCwd === resolvedGitRoot || (Boolean(relativePath) && !relativePath.startsWith('..'));
  if (!isWithinGitRoot) {
    return [];
  }

  const chain: string[] = [];
  let currentPath = resolvedCwd;
  chain.push(currentPath);
  while (currentPath !== resolvedGitRoot) {
    const parentPath = nodePath.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    chain.push(parentPath);
    currentPath = parentPath;
  }

  return chain.reverse().map((directory) => nodePath.join(directory, '.gitignore'));
};

/** Reads an ignore file, skipping ENOENT/ENOTDIR like globby's safe reader. */
const readIgnoreFileSafely = async (filePath: string): Promise<IgnoreFileRecord | undefined> => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { filePath, content };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return undefined;
    }
    throw new Error(
      `Failed to read ignore file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
};

const dedupePaths = (paths: string[]): string[] => {
  const seen = new Set<string>();
  return paths.filter((filePath) => {
    if (seen.has(filePath)) {
      return false;
    }
    seen.add(filePath);
    return true;
  });
};

/**
 * Discovers and parses ignore files, returning the synchronous predicate and
 * the fast-glob pruning patterns.
 *
 * @param cwd                Scan root.
 * @param useGitignore       Include `.gitignore` files (plus parent ones up to
 *                           the git root), like globby's `gitignore: true`.
 * @param ignoreFilePatterns Globs for additional ignore files (globby's
 *                           `ignoreFiles` option), e.g. `['**\/.repomixignore']`.
 * @param ignorePatterns     Repomix's ignore patterns; the discovery walk skips
 *                           paths they match, exactly as globby's internal
 *                           discovery inherits the caller's `ignore` option.
 * @param fsAdapter          Shared fs adapter passed to the subsequent main
 *                           scan, so the readdir results cached during
 *                           discovery are replayed there (one walk's syscalls
 *                           for both, as with globby's internal double walk).
 */
export const buildIgnoreFileFilter = async (
  cwd: string,
  useGitignore: boolean,
  ignoreFilePatterns: string[],
  ignorePatterns: string[],
  fsAdapter: GlobbyOptions['fs'],
): Promise<IgnoreFileFilter> => {
  const ignoreFileGlobs = [...ignoreFilePatterns, ...(useGitignore ? [GITIGNORE_FILES_PATTERN] : [])];

  if (ignoreFileGlobs.length === 0) {
    return { isIgnored: () => false, patternsForFastGlob: [] };
  }

  // Discovery walk — same options globby's globIgnoreFiles derives for it.
  const childPaths = await fastGlob(ignoreFileGlobs, {
    cwd,
    ignore: [...ignorePatterns, ...DISCOVERY_DEFAULT_IGNORED_DIRECTORIES],
    absolute: true,
    dot: true,
    followSymbolicLinks: false,
    throwErrorOnBrokenSymbolicLink: false,
    suppressErrors: false,
    fs: fsAdapter,
  });

  // Parent .gitignore files (git root → cwd) come first so deeper files'
  // patterns are appended later and take precedence, matching globby.
  const gitRoot = useGitignore ? await findGitRoot(cwd) : undefined;
  const allPaths = gitRoot ? dedupePaths([...getParentGitignorePaths(gitRoot, cwd), ...childPaths]) : childPaths;

  const files = (await Promise.all(allPaths.map(readIgnoreFileSafely))).filter(
    (record): record is IgnoreFileRecord => record !== undefined,
  );

  const baseDir = gitRoot || cwd;
  const patterns = files.flatMap((file) => parseIgnoreFile(file, baseDir));
  const usingGitRoot = Boolean(gitRoot && gitRoot !== cwd);

  const matcher = createIgnoreMatcher(patterns, cwd, baseDir);
  const resolvedCwd = nodePath.resolve(cwd);
  const patternsForFastGlob = convertPatternsForFastGlob(patterns, usingGitRoot);

  // Fast path for the strings fast-glob actually emits: clean, slash-separated
  // paths relative to the scan root. For those, the baseDir-relative form the
  // `ignore` package expects is a constant prefix (scan root's path below the
  // git root, empty when they coincide) plus the input — no per-path
  // resolve/normalize/relative calls. Routing every tested path through
  // `createIgnoreMatcher` instead cost several path operations per call
  // (doubled for directories), which dominated the post-scan filter (~15ms
  // per search on this repo's ~1,400 tested file and directory paths).
  const ig = ignore().add(patterns);
  const cwdFromBase = nodePath.relative(nodePath.resolve(baseDir), resolvedCwd).replace(/\\/g, '/');
  const baseRelativePrefix = cwdFromBase ? `${cwdFromBase}/` : '';

  // Inputs the fast path cannot take: empty, `.`/`..` segments, backslashes,
  // doubled or trailing slashes (all of which path normalization would have
  // rewritten), plus absolute paths. fast-glob never produces these, but the
  // legacy matcher resolves them exactly as globby did, so fall back for them.
  const needsLegacyResolution = /(?:^|\/)\.\.?(?:\/|$)|\\|\/\/|\/$/;

  return {
    isIgnored: (relativePath: string, isDirectory: boolean): boolean => {
      if (relativePath === '' || needsLegacyResolution.test(relativePath) || nodePath.isAbsolute(relativePath)) {
        const absolutePath = nodePath.resolve(resolvedCwd, nodePath.normalize(relativePath));
        if (matcher(absolutePath).ignored) {
          return true;
        }
        return isDirectory && matcher(absolutePath + nodePath.sep).ignored;
      }

      const baseRelativePath = baseRelativePrefix + relativePath;
      if (ig.ignores(baseRelativePath)) {
        return true;
      }
      // Directory-only rules (`dir/`) only match when the tested path carries a
      // trailing separator, mirroring the legacy matcher's second test.
      return isDirectory && ig.ignores(`${baseRelativePath}/`);
    },
    patternsForFastGlob,
  };
};
