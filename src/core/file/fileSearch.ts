import nodeFs, { type Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import fastGlob from 'fast-glob';
import { type Options as GlobbyOptions, type GlobEntry, globby, globbySync } from 'globby';
import gitIgnore from 'ignore';
import { minimatch } from 'minimatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { sortPaths } from './filePathSort.js';

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

export interface FileSearchResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

const IGNORE_CONTROL_FILE_NAMES = new Set(['.gitignore', '.ignore', '.repomixignore']);

// No per-directory ignore-pattern check is needed here. The `directories` array
// comes from globby with the same `ignore` patterns (e.g. `dist/**`), which
// excludes both the directory contents AND the directory entry itself.
//
// Each directory is checked with a single synchronous `readdirSync`. The async
// variant dispatched one `fs.promises.readdir` microtask per directory (bounded
// at 20-wide via `mapWithConcurrency`); for the repomix repo that is ~250
// directories, whose callbacks interleave on the event loop with messages from
// the already-running security-check / metrics worker pools, adding scheduling
// overhead far exceeding the raw readdir cost. The synchronous loop runs the same
// readdir + `.startsWith('.')` filter and produces the identical empty-directory
// set, but as a plain main-thread pass with no microtask churn. Blocking the main
// thread here is harmless: `globbySync` already held it synchronously through the
// preceding traversal, and the worker pools run off-thread throughout.
const findEmptyDirectories = (rootDir: string, directories: string[]): string[] => {
  return directories.filter((dir) => {
    const fullPath = path.join(rootDir, dir);
    try {
      const entries = nodeFs.readdirSync(fullPath);
      const hasVisibleContents = entries.some((entry) => !entry.startsWith('.'));
      return !hasVisibleContents;
    } catch (error) {
      logger.debug(`Error checking directory ${dir}:`, error);
      return false;
    }
  });
};

// Check if a path is a git worktree reference file
const isGitWorktreeRef = async (gitPath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(gitPath);
    if (!stats.isFile()) {
      return false;
    }

    const content = await fs.readFile(gitPath, 'utf8');
    return content.startsWith('gitdir:');
  } catch {
    return false;
  }
};

/**
 * Escapes special characters in glob patterns to handle paths with parentheses.
 * Example: "src/(categories)" -> "src/\\(categories\\)"
 */
export const escapeGlobPattern = (pattern: string): string => {
  // First escape backslashes
  const escapedBackslashes = pattern.replace(/\\/g, '\\\\');
  // Then escape special characters () and [], but NOT {}
  return escapedBackslashes.replace(/[()[\]]/g, '\\$&');
};

/**
 * Normalizes glob patterns by removing trailing slashes and ensuring consistent directory pattern handling.
 * Makes "**\/folder", "**\/folder/", and "**\/folder/**\/*" behave identically.
 *
 * @param pattern The glob pattern to normalize
 * @returns The normalized pattern
 */
export const normalizeGlobPattern = (pattern: string): string => {
  // Remove trailing slash but preserve patterns that end with "**/"
  if (pattern.endsWith('/') && !pattern.endsWith('**/')) {
    return pattern.slice(0, -1);
  }

  // Convert **/folder to **/folder/** for consistent ignore pattern behavior
  if (pattern.startsWith('**/') && !pattern.includes('/**')) {
    return `${pattern}/**`;
  }

  return pattern;
};

// --- Fast path for the default "scan everything" glob ('**/*') -------------------
//
// `globbySync` resolves gitignore by (1) running a SECOND fast-glob traversal to
// discover every ignore file in the tree, then (2) post-filtering each discovered
// entry through a predicate that re-resolves an absolute path (path.resolve +
// path.normalize) per entry before testing it. For a repo of ~1.4k entries that
// extra full walk plus the per-entry path math dominates the file-search phase.
//
// When the include set is the default `['**/*']` (no user `--include`, no stdin
// file list), a single fast-glob traversal already returns every entry — including
// the ignore files themselves — so we can build globby's exact gitignore matcher
// from that one pass and filter on the relative paths fast-glob already produced,
// with no second walk and no per-entry path.resolve. The matcher uses the same
// `ignore` library and the identical base-application rules globby applies
// (gitignore spec §2.22.1), so the surviving file/directory set is identical.
// Non-default include / stdin scans still go through globby unchanged, because
// there globby's ignore-file discovery can read ignore files outside the include
// set and that behavior must be preserved.

const isNegativeGitignorePattern = (pattern: string): boolean => pattern[0] === '!';

// Mirrors globby's `applyBaseToPattern` (gitignore spec §2.22.1): rewrites a single
// ignore-file pattern so it is anchored relative to the directory the ignore file
// lives in (`base`, posix, relative to the search root; empty for the root file).
const applyBaseToGitignorePattern = (pattern: string, base: string): string => {
  if (!base) {
    return pattern;
  }
  const negative = isNegativeGitignorePattern(pattern);
  const clean = negative ? pattern.slice(1) : pattern;
  const slashIndex = clean.indexOf('/');
  const hasNonTrailingSlash = slashIndex !== -1 && slashIndex !== clean.length - 1;
  let result: string;
  if (!hasNonTrailingSlash) {
    // No separator (or only a trailing one): may match at any depth below base.
    result = path.posix.join(base, '**', clean);
  } else if (clean.startsWith('/')) {
    // Leading separator: anchored to the ignore file's directory.
    result = path.posix.join(base, clean.slice(1));
  } else {
    // Mid-pattern separator: relative to the ignore file's directory.
    result = path.posix.join(base, clean);
  }
  return negative ? `!${result}` : result;
};

// Returns true when the git root is a PROPER ancestor of rootDir — i.e. rootDir is a
// subdirectory inside a git repo rather than the repo root itself. In that case
// globby's `gitignore: true` walks up to the git root and reads every parent
// `.gitignore` (via findGitRootSync + getParentGitignorePaths) — files the
// single-traversal fast path, which only sees entries under rootDir, cannot discover.
// The caller must then stay on the globby path. Mirrors globby's findGitRootSync walk:
// a `.git` directory OR worktree file marks the root, and the closest one at-or-above
// rootDir wins (so a `.git` directly at rootDir means there are no parents to read).
const gitRootIsProperAncestor = (rootDir: string): boolean => {
  const resolvedRoot = path.resolve(rootDir);
  const isGitRoot = (dir: string): boolean => {
    try {
      const stats = nodeFs.statSync(path.join(dir, '.git'));
      return stats.isDirectory() || stats.isFile();
    } catch {
      return false;
    }
  };

  // A `.git` directly at rootDir makes rootDir the git root: globby reads no parents.
  if (isGitRoot(resolvedRoot)) {
    return false;
  }

  const { root } = path.parse(resolvedRoot);
  let current = resolvedRoot;
  while (current !== root) {
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
    if (isGitRoot(current)) {
      return true;
    }
  }
  return false;
};

interface FastGlobDirentEntry {
  path: string;
  dirent: { isFile(): boolean; isDirectory(): boolean };
}

// Single-traversal replacement for globby's gitignore handling. Returns the same
// file/directory split globby would produce for the default `['**/*']` include set.
const searchViaSingleTraversal = (
  rootDir: string,
  includePatterns: string[],
  adjustedIgnorePatterns: string[],
  config: RepomixConfigMerged,
): { files: string[]; directories: string[] } => {
  const entries = fastGlob.sync(includePatterns, {
    cwd: rootDir,
    ignore: adjustedIgnorePatterns,
    dot: true,
    followSymbolicLinks: false,
    onlyFiles: false,
    objectMode: true,
  }) as unknown as FastGlobDirentEntry[];

  // Ignore-file basenames that participate, matching searchFiles' globby config:
  // .gitignore via the `gitignore` option, .ignore/.repomixignore via `ignoreFiles`.
  const ignoreBasenames = new Set<string>(['.repomixignore']);
  if (config.ignore.useGitignore) {
    ignoreBasenames.add('.gitignore');
  }
  if (config.ignore.useDotIgnore) {
    ignoreBasenames.add('.ignore');
  }

  // Collect ignore files from the single traversal, ordered shallow -> deep so that
  // patterns from deeper directories are added last and therefore win (git's "more
  // specific gitignore takes precedence"), matching globby + git semantics.
  const ignoreFileEntries = entries
    .filter((entry) => entry.dirent.isFile() && ignoreBasenames.has(path.posix.basename(entry.path)))
    .sort((a, b) => {
      const depthDiff = a.path.split('/').length - b.path.split('/').length;
      if (depthDiff !== 0) {
        return depthDiff;
      }
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    });

  const patterns: string[] = [];
  for (const entry of ignoreFileEntries) {
    let content: string;
    try {
      content = nodeFs.readFileSync(path.join(rootDir, entry.path), 'utf8');
    } catch {
      // Missing/unreadable ignore file: skip, matching globby's suppressed read errors.
      continue;
    }
    const dir = path.posix.dirname(entry.path);
    const base = dir === '.' ? '' : dir;
    for (const line of content.split(/\r?\n/)) {
      // globby keeps non-empty, non-comment lines verbatim (no trimming) before
      // applying the base; the `ignore` library handles the rest.
      if (line && !line.startsWith('#')) {
        patterns.push(applyBaseToGitignorePattern(line, base));
      }
    }
  }

  const matcher = gitIgnore().add(patterns);
  const files: string[] = [];
  const directories: string[] = [];
  for (const entry of entries) {
    const relPath = entry.path;
    // File-form test, matching globby's predicate on the raw entry path.
    if (matcher.ignores(relPath)) {
      continue;
    }
    if (entry.dirent.isDirectory()) {
      // Directory-form test: globby re-tests directory entries with a trailing
      // separator so directory-only patterns (e.g. `build/`) match the dir entry.
      if (matcher.ignores(`${relPath}/`)) {
        continue;
      }
      directories.push(relPath);
    } else if (entry.dirent.isFile()) {
      files.push(relPath);
    }
  }
  return { files, directories };
};

const toPosixPath = (value: string): string => value.replace(/\\/g, '/');

// Canonical posix form of a deferred ignore pattern: forward slashes and no
// trailing slash. Detection (isIgnoreControlFilePattern) and post-filtering
// (filterDeferredIgnoredFiles) must share this so a pattern that is deferred is
// also matched by the filter. Otherwise e.g. `**/.gitignore/` would be deferred
// (dropped from globby's ignore) yet never matched here, leaking the file.
const toPosixIgnorePattern = (pattern: string): string => toPosixPath(pattern).replace(/\/+$/, '');

const isIgnoreControlFilePattern = (pattern: string): boolean => {
  const normalizedPattern = toPosixIgnorePattern(pattern);
  if (normalizedPattern.startsWith('!')) {
    return false;
  }
  return IGNORE_CONTROL_FILE_NAMES.has(path.posix.basename(normalizedPattern));
};

const filterDeferredIgnoredFiles = (filePaths: string[], deferredIgnorePatterns: string[]): string[] => {
  if (deferredIgnorePatterns.length === 0) {
    return filePaths;
  }
  const posixPatterns = deferredIgnorePatterns.map(toPosixIgnorePattern);
  return filePaths.filter((filePath) => {
    const normalizedPath = toPosixPath(filePath);
    // Match the control file itself, and — for the pathological case of a
    // directory literally named `.gitignore` — its descendants too. globby
    // previously normalized `**/.gitignore` to `**/.gitignore/**` (which excludes
    // both), so matching `${pattern}/**` here preserves that behavior.
    return !posixPatterns.some(
      (pattern) =>
        minimatch(normalizedPath, pattern, { dot: true }) || minimatch(normalizedPath, `${pattern}/**`, { dot: true }),
    );
  });
};

// Get all file paths considering the config
export const searchFiles = async (
  rootDir: string,
  config: RepomixConfigMerged,
  explicitFiles?: string[],
): Promise<FileSearchResult> => {
  // Check if the path exists and get its type
  let pathStats: Stats;
  try {
    pathStats = await fs.stat(rootDir);
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === 'ENOENT') {
        throw new RepomixError(`Target path does not exist: ${rootDir}`);
      }
      if (errorCode === 'EPERM' || errorCode === 'EACCES') {
        throw new PermissionError(
          `Permission denied while accessing path. Please check folder access permissions for your terminal app. path: ${rootDir}`,
          rootDir,
          errorCode,
        );
      }
      // Handle other specific error codes with more context
      throw new RepomixError(`Failed to access path: ${rootDir}. Error code: ${errorCode}. ${error.message}`);
    }
    // Preserve original error stack trace for debugging
    const repomixError = new RepomixError(
      `Failed to access path: ${rootDir}. Reason: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
    );
    repomixError.cause = error;
    throw repomixError;
  }

  // Check if the path is a directory
  if (!pathStats.isDirectory()) {
    throw new RepomixError(
      `Target path is not a directory: ${rootDir}. Please specify a directory path, not a file path.`,
    );
  }

  // Now check directory permissions
  const permissionCheck = await checkDirectoryPermissions(rootDir);

  if (permissionCheck.details?.read !== true) {
    if (permissionCheck.error instanceof PermissionError) {
      throw permissionCheck.error;
    }
    throw new RepomixError(
      `Target directory is not readable or does not exist. Please check folder access permissions for your terminal app.\npath: ${rootDir}`,
    );
  }

  try {
    const { adjustedIgnorePatterns, ignoreFilePatterns, deferredIgnorePatterns } = await prepareIgnoreContext(
      rootDir,
      config,
    );

    logger.trace('Ignore patterns:', adjustedIgnorePatterns);
    logger.trace('Ignore file patterns:', ignoreFilePatterns);
    logger.trace('Deferred ignore patterns:', deferredIgnorePatterns);

    // Start with configured include patterns
    let includePatterns = config.include.map((pattern) => escapeGlobPattern(pattern));

    // If explicit files are provided, add them to include patterns
    if (explicitFiles) {
      if (explicitFiles.length === 0) {
        logger.warn('[stdin mode] No files received from stdin. Will search all files matching include patterns.');
      } else {
        logger.debug(`[stdin mode] Processing ${explicitFiles.length} explicit files`);
        logger.trace('[stdin mode] Explicit files (absolute):', explicitFiles);

        const relativePaths = explicitFiles.map((filePath) => {
          const relativePath = path.relative(rootDir, filePath);
          // Escape the path to handle special characters
          return escapeGlobPattern(relativePath);
        });

        logger.trace('[stdin mode] Explicit files (relative, escaped):', relativePaths);
        logger.trace('[stdin mode] Include patterns before merge:', includePatterns);

        includePatterns = [...includePatterns, ...relativePaths];

        logger.debug(`[stdin mode] Total include patterns after merge: ${includePatterns.length}`);
      }
    }

    // If no include patterns at all, default to all files
    if (includePatterns.length === 0) {
      includePatterns = ['**/*'];
    }

    logger.trace('Include patterns with explicit files:', includePatterns);
    logger.trace('Ignore patterns:', adjustedIgnorePatterns);
    logger.trace('Ignore file patterns (for globby):', ignoreFilePatterns);

    const handleGlobbyError = (error: unknown): never => {
      // Handle EPERM errors specifically
      const code = (error as NodeJS.ErrnoException | { code?: string })?.code;
      if (code === 'EPERM' || code === 'EACCES') {
        throw new PermissionError(
          `Permission denied while scanning directory. Please check folder access permissions for your terminal app. path: ${rootDir}`,
          rootDir,
        );
      }
      throw error;
    };

    logger.debug('[globby] Starting file search...');
    const globbyStartTime = Date.now();

    let filePaths: string[];
    let emptyDirPaths: string[] = [];

    // Take the single-traversal fast path only when globby would not pull ignore files
    // from OUTSIDE the traversal root. Two cases keep us on the globby path:
    //  1. A non-default include set (user `--include` or stdin file list): globby's
    //     separate ignore-file discovery can read ignore files outside the include set.
    //  2. rootDir is a subdirectory of a git repo with `useGitignore` on: globby walks
    //     up to the git root and applies every parent `.gitignore`, which the fast path
    //     (only seeing entries under rootDir) cannot. The git-root walk runs only for
    //     the otherwise-eligible default scan, and resolves to a single statSync when
    //     rootDir is itself the repo root — the dominant, perf-critical case.
    const includesEverything = includePatterns.length === 1 && includePatterns[0] === '**/*';
    const isDefaultScan = includesEverything && !(config.ignore.useGitignore && gitRootIsProperAncestor(rootDir));

    if (config.output.includeEmptyDirectories) {
      // Single traversal returning both files and directories. The previous implementation
      // ran globby twice with identical options (once for files, once for directories),
      // which re-walks the tree and re-parses every .gitignore/.repomixignore, roughly
      // doubling the discovery cost. Using `objectMode: true` lets us partition the entries
      // by their Dirent type in one pass. We use `dirent.isFile()` (not `!isDirectory()`)
      // to match the previous `onlyFiles: true` semantics for symlinks and other non-file
      // non-directory entries (which are excluded in both implementations).
      // Use the synchronous globby variant: when a discovered .gitignore/.repomixignore
      // carries a negation pattern, globby routes every traversed entry through a
      // post-traversal predicate. The async path dispatches that predicate as one
      // microtask per entry (Promise.all over ~1.3k entries) on top of the per-entry
      // stat; globbySync runs the same filter as a plain synchronous loop, dropping
      // the microtask-queue overhead. fast-glob's sync traversal yields the identical
      // entry set (paths and Dirent types) and globby applies the identical `ignore`
      // filter, so the discovered file/directory split is byte-identical. Blocking the
      // main thread here is harmless: the security/metrics worker warmups and the git
      // prefetch all run off-thread, and globby already dominated the main thread for
      // this whole window. globbySync throws synchronously, so the previous
      // `.catch(handleGlobbyError)` becomes a try/catch that re-throws via the same
      // never-returning handler (preserving EPERM/EACCES → PermissionError promotion).
      let files: string[];
      let directories: string[];
      if (isDefaultScan) {
        try {
          ({ files, directories } = searchViaSingleTraversal(rootDir, includePatterns, adjustedIgnorePatterns, config));
        } catch (error) {
          throw handleGlobbyError(error);
        }
      } else {
        let entries: GlobEntry[];
        try {
          entries = globbySync(includePatterns, {
            ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
            onlyFiles: false,
            objectMode: true,
          });
        } catch (error) {
          throw handleGlobbyError(error);
        }

        files = [];
        directories = [];
        for (const entry of entries) {
          if (entry.dirent.isFile()) {
            files.push(entry.path);
          } else if (entry.dirent.isDirectory()) {
            directories.push(entry.path);
          }
        }
      }
      filePaths = filterDeferredIgnoredFiles(files, deferredIgnorePatterns);

      const globbyElapsedTime = Date.now() - globbyStartTime;
      logger.debug(
        `[globby] Completed in ${globbyElapsedTime}ms, found ${filePaths.length} files and ${directories.length} directories`,
      );

      const filterStartTime = Date.now();
      emptyDirPaths = findEmptyDirectories(rootDir, directories);
      const filterTime = Date.now() - filterStartTime;
      logger.debug(`[empty dirs] Filtered to ${emptyDirPaths.length} empty directories in ${filterTime}ms`);
    } else if (isDefaultScan) {
      // Same single-traversal fast path, files only (directories are not needed here).
      try {
        filePaths = filterDeferredIgnoredFiles(
          searchViaSingleTraversal(rootDir, includePatterns, adjustedIgnorePatterns, config).files,
          deferredIgnorePatterns,
        );
      } catch (error) {
        throw handleGlobbyError(error);
      }

      const globbyElapsedTime = Date.now() - globbyStartTime;
      logger.debug(`[globby] Completed in ${globbyElapsedTime}ms, found ${filePaths.length} files`);
    } else {
      // Synchronous variant — same rationale as the objectMode branch above:
      // eliminates globby's per-entry filter microtasks while returning the
      // identical file set.
      try {
        filePaths = filterDeferredIgnoredFiles(
          globbySync(includePatterns, {
            ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
            onlyFiles: true,
          }),
          deferredIgnorePatterns,
        );
      } catch (error) {
        throw handleGlobbyError(error);
      }

      const globbyElapsedTime = Date.now() - globbyStartTime;
      logger.debug(`[globby] Completed in ${globbyElapsedTime}ms, found ${filePaths.length} files`);
    }

    logger.debug(`[result] Total files: ${filePaths.length}, empty directories: ${emptyDirPaths.length}`);
    logger.trace(`Filtered ${filePaths.length} files`);

    return {
      filePaths: sortPaths(filePaths),
      emptyDirPaths: sortPaths(emptyDirPaths),
    };
  } catch (error: unknown) {
    // Re-throw PermissionError as is
    if (error instanceof PermissionError) {
      throw error;
    }

    if (error instanceof Error) {
      logger.error('Error filtering files:', error.message);
      throw new Error(`Failed to filter files in directory ${rootDir}. Reason: ${error.message}`);
    }

    logger.error('An unexpected error occurred:', error);
    throw new Error('An unexpected error occurred while filtering files.');
  }
};

export const parseIgnoreContent = (content: string): string[] => {
  if (!content) return [];

  return content.split('\n').reduce<string[]>((acc, line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      acc.push(trimmedLine);
    }
    return acc;
  }, []);
};

/**
 * Prepares ignore context including patterns and file patterns with git worktree handling.
 * This logic is shared across searchFiles, listDirectories, and listFiles.
 *
 * @param rootDir The root directory to search
 * @param config The merged configuration
 * @returns Object containing adjusted ignore patterns and ignore file patterns
 */
const prepareIgnoreContext = async (
  rootDir: string,
  config: RepomixConfigMerged,
): Promise<{ adjustedIgnorePatterns: string[]; ignoreFilePatterns: string[]; deferredIgnorePatterns: string[] }> => {
  const [ignorePatterns, ignoreFilePatterns] = await Promise.all([
    getIgnorePatterns(rootDir, config),
    getIgnoreFilePatterns(config),
  ]);

  // Keep ignore-control files visible to globby so their rules are loaded, then filter them from final file lists.
  const deferredIgnorePatterns: string[] = [];
  const globbyIgnorePatterns: string[] = [];
  for (const pattern of ignorePatterns) {
    if (isIgnoreControlFilePattern(pattern)) {
      deferredIgnorePatterns.push(pattern);
    } else {
      globbyIgnorePatterns.push(pattern);
    }
  }

  // Normalize ignore patterns to handle trailing slashes consistently
  const normalizedIgnorePatterns = globbyIgnorePatterns.map(normalizeGlobPattern);

  // Check if .git is a worktree reference
  const gitPath = path.join(rootDir, '.git');
  const isWorktree = await isGitWorktreeRef(gitPath);

  // Modify ignore patterns for git worktree
  const adjustedIgnorePatterns = [...normalizedIgnorePatterns];
  if (isWorktree) {
    // Remove '.git/**' pattern and add '.git' to ignore the reference file
    const gitIndex = adjustedIgnorePatterns.indexOf('.git/**');
    if (gitIndex !== -1) {
      adjustedIgnorePatterns.splice(gitIndex, 1);
      adjustedIgnorePatterns.push('.git');
    }
  }

  return { adjustedIgnorePatterns, ignoreFilePatterns, deferredIgnorePatterns };
};

// A node:fs adapter whose only difference from the real module is that
// `promises.stat` is served synchronously via `statSync`.
//
// When any discovered .gitignore/.repomixignore contains a negation pattern (or
// a parent .gitignore is present), globby disables fast-glob's native `ignore`
// and instead filters every discovered entry through a post-traversal predicate.
// For each non-ignored entry that predicate awaits an `fs.promises.stat` call to
// learn whether the entry is a directory (to apply directory-form gitignore
// rules) — thousands of awaited stats, even though objectMode already carries the
// dirent. fast-glob's own traversal uses the callback-style fs methods (it never
// touches `fs.promises`), so overriding only `promises.stat` leaves traversal and
// results byte-identical while removing the libuv thread-pool round-trip per file.
// `statSync` returns an identical Stats object (same isDirectory()/isFile()), so
// every filtering decision is unchanged; this is purely a dispatch-cost
// optimization. Any unexpected throw is caught by globby's existing try/catch
// exactly as the async path's rejection was.
//
// NOTE: `searchFiles` (the hot path) now calls `globbySync`, which uses `statSync`
// directly and ignores this `promises.stat` override. This adapter therefore only
// affects the remaining async `globby` callers — `listFiles` / `listDirectories`,
// used by the MCP server — which still benefit from the synchronous stat.
const globbyFs = {
  ...nodeFs,
  promises: {
    ...nodeFs.promises,
    stat: (statPath: nodeFs.PathLike, options?: nodeFs.StatOptions) => nodeFs.statSync(statPath, options),
  },
} as unknown as GlobbyOptions['fs'];

/**
 * Creates base globby options with common ignore patterns.
 * Returns options that can be extended with specific settings like onlyFiles or onlyDirectories.
 */
const createBaseGlobbyOptions = (
  rootDir: string,
  config: RepomixConfigMerged,
  ignorePatterns: string[],
  ignoreFilePatterns: string[],
): Omit<GlobbyOptions, 'onlyFiles' | 'onlyDirectories'> => ({
  cwd: rootDir,
  ignore: ignorePatterns,
  gitignore: config.ignore.useGitignore,
  ignoreFiles: ignoreFilePatterns,
  absolute: false,
  dot: true,
  followSymbolicLinks: false,
  fs: globbyFs,
});

export const getIgnoreFilePatterns = async (config: RepomixConfigMerged): Promise<string[]> => {
  const ignoreFilePatterns: string[] = [];

  // Note: When ignore files are found in nested directories, files in deeper
  // directories have higher priority, following the behavior of ripgrep and fd.
  // For example, `src/.ignore` patterns override `./.ignore` patterns.
  //
  // Multiple ignore files in the same directory (.gitignore, .ignore, .repomixignore)
  // are all merged together. The order in this array does not affect priority.
  //
  // .gitignore files are handled by globby's gitignore option (not ignoreFiles)
  // to properly respect parent directory .gitignore files, matching Git's behavior.

  if (config.ignore.useDotIgnore) {
    ignoreFilePatterns.push('**/.ignore');
  }

  ignoreFilePatterns.push('**/.repomixignore');

  return ignoreFilePatterns;
};

export const getIgnorePatterns = async (rootDir: string, config: RepomixConfigMerged): Promise<string[]> => {
  const ignorePatterns = new Set<string>();

  // Add default ignore patterns
  if (config.ignore.useDefaultPatterns) {
    logger.trace('Adding default ignore patterns');
    for (const pattern of defaultIgnoreList) {
      ignorePatterns.add(pattern);
    }
  }

  // Add repomix output file
  if (config.output.filePath) {
    const absoluteOutputPath = path.resolve(config.cwd, config.output.filePath);
    const relativeToTargetPath = path.relative(rootDir, absoluteOutputPath);

    logger.trace('Adding output file to ignore patterns:', relativeToTargetPath);

    ignorePatterns.add(relativeToTargetPath);
  }

  // Add custom ignore patterns
  if (config.ignore.customPatterns) {
    logger.trace('Adding custom ignore patterns:', config.ignore.customPatterns);
    for (const pattern of config.ignore.customPatterns) {
      ignorePatterns.add(pattern);
    }
  }

  // Add patterns from .git/info/exclude if useGitignore is enabled
  if (config.ignore.useGitignore) {
    // Read .git/info/exclude file
    const excludeFilePath = path.join(rootDir, '.git', 'info', 'exclude');
    try {
      const excludeFileContent = await fs.readFile(excludeFilePath, 'utf8');
      const excludePatterns = parseIgnoreContent(excludeFileContent);

      for (const pattern of excludePatterns) {
        ignorePatterns.add(pattern);
      }
    } catch (error) {
      // File might not exist or might not be accessible, which is fine
      logger.trace('Could not read .git/info/exclude file:', error instanceof Error ? error.message : String(error));
    }
  }

  return Array.from(ignorePatterns);
};

/**
 * Lists all directories in the given root directory, respecting ignore patterns.
 * This function does not apply include patterns - it returns the full directory set subject to ignore rules.
 *
 * @param rootDir The root directory to scan
 * @param config The merged configuration
 * @returns Array of directory paths relative to rootDir
 */
export const listDirectories = async (rootDir: string, config: RepomixConfigMerged): Promise<string[]> => {
  const { adjustedIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(rootDir, config);

  const directories = await globby(['**/*'], {
    ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
    onlyDirectories: true,
  });

  return sortPaths(directories);
};

/**
 * Lists all files in the given root directory, respecting ignore patterns.
 * This function does not apply include patterns - it returns the full file set subject to ignore rules.
 *
 * @param rootDir The root directory to scan
 * @param config The merged configuration
 * @returns Array of file paths relative to rootDir
 */
export const listFiles = async (rootDir: string, config: RepomixConfigMerged): Promise<string[]> => {
  const { adjustedIgnorePatterns, ignoreFilePatterns, deferredIgnorePatterns } = await prepareIgnoreContext(
    rootDir,
    config,
  );

  const files = await globby(['**/*'], {
    ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
    onlyFiles: true,
  });

  return sortPaths(filterDeferredIgnoredFiles(files, deferredIgnorePatterns));
};
