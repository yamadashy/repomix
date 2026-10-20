import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { type Options as GlobbyOptions, type GlobEntry, globby } from 'globby';
import { minimatch } from 'minimatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { mapWithConcurrency } from '../../shared/asyncMap.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { redactUrl } from '../../shared/urlRedact.js';
import { sortPaths } from './filePathSort.js';

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

export interface FileSearchResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

// readdir is independent across directories — run with bounded concurrency rather
// than awaiting serially. The cap protects very large repos from EMFILE / file
// descriptor exhaustion that unbounded `Promise.all` could cause.
const EMPTY_DIR_CHECK_CONCURRENCY = 20;
const IGNORE_CONTROL_FILE_NAMES = new Set(['.gitignore', '.ignore', '.repomixignore']);

// No per-directory ignore-pattern check is needed here. The `directories` array
// comes from globby with the same `ignore` patterns (e.g. `dist/**`), which
// excludes both the directory contents AND the directory entry itself.
const findEmptyDirectories = async (rootDir: string, directories: string[]): Promise<string[]> => {
  const results = await mapWithConcurrency(directories, EMPTY_DIR_CHECK_CONCURRENCY, async (dir) => {
    const fullPath = path.join(rootDir, dir);
    try {
      const entries = await fs.readdir(fullPath);
      const hasVisibleContents = entries.some((entry) => !entry.startsWith('.'));
      return hasVisibleContents ? null : dir;
    } catch (error) {
      logger.debug(`Error checking directory ${dir}:`, error);
      return null;
    }
  });
  return results.filter((dir): dir is string => dir !== null);
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
  confineToBaseDir = false,
): Promise<FileSearchResult> => {
  // Check if the path exists and get its type
  let pathStats: Stats;
  try {
    pathStats = await fs.stat(rootDir);
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === 'ENOENT') {
        throw new RepomixError(`Target path does not exist: ${redactUrl(rootDir)}`);
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

    if (config.output.includeEmptyDirectories) {
      // Single traversal returning both files and directories. The previous implementation
      // ran globby twice with identical options (once for files, once for directories),
      // which re-walks the tree and re-parses every .gitignore/.repomixignore, roughly
      // doubling the discovery cost. Using `objectMode: true` lets us partition the entries
      // by their Dirent type in one pass. We use `dirent.isFile()` (not `!isDirectory()`)
      // to match the previous `onlyFiles: true` semantics for symlinks and other non-file
      // non-directory entries (which are excluded in both implementations).
      const entries: GlobEntry[] = await globby(includePatterns, {
        ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
        onlyFiles: false,
        objectMode: true,
      }).catch(handleGlobbyError);

      const files: string[] = [];
      const directories: string[] = [];
      for (const entry of entries) {
        if (entry.dirent.isFile()) {
          files.push(entry.path);
        } else if (entry.dirent.isDirectory()) {
          directories.push(entry.path);
        }
      }
      filePaths = filterDeferredIgnoredFiles(files, deferredIgnorePatterns);

      const globbyElapsedTime = Date.now() - globbyStartTime;
      logger.debug(
        `[globby] Completed in ${globbyElapsedTime}ms, found ${filePaths.length} files and ${directories.length} directories`,
      );

      const filterStartTime = Date.now();
      emptyDirPaths = await findEmptyDirectories(rootDir, directories);
      const filterTime = Date.now() - filterStartTime;
      logger.debug(`[empty dirs] Filtered to ${emptyDirPaths.length} empty directories in ${filterTime}ms`);
    } else {
      filePaths = filterDeferredIgnoredFiles(
        await globby(includePatterns, {
          ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
          onlyFiles: true,
        }).catch(handleGlobbyError),
        deferredIgnorePatterns,
      );

      const globbyElapsedTime = Date.now() - globbyStartTime;
      logger.debug(`[globby] Completed in ${globbyElapsedTime}ms, found ${filePaths.length} files`);
    }

    // Optional security backstop (confineToBaseDir; set by untrusted-agent callers
    // such as the MCP --sandbox): drop any match resolving outside rootDir. Glob
    // patterns (absolute, brace/extglob-expanded, …) can make fast-glob match paths
    // outside rootDir regardless of cwd; this is syntax-agnostic, independent of any
    // caller-side pattern guard. OFF by default so the documented ../ / absolute
    // include-pattern behavior is unchanged for normal CLI and library callers.
    let confinedFilePaths = filePaths;
    let confinedEmptyDirPaths = emptyDirPaths;
    if (confineToBaseDir) {
      const rootAbs = path.resolve(rootDir);
      // Compare realpaths, not the lexical path: a lexically in-root match can still
      // point outside when an intermediate component is a symlink — a glob whose
      // static base names a symlinked dir (e.g. "gateway/x" with gateway -> /etc) is
      // read through by fast-glob even with followSymbolicLinks:false. Canonicalize
      // each match and drop anything outside the canonical root, or that cannot be
      // resolved at all (fail closed — an unresolvable path is never safe to pack).
      const realRoot = await fs.realpath(rootAbs).catch(() => rootAbs);
      // A filesystem/drive root already ends in the separator (POSIX "/", Windows
      // "C:\"), so appending another would make the prefix "//" and reject every
      // child — build it only when the separator is missing.
      const realRootPrefix = realRoot.endsWith(path.sep) ? realRoot : `${realRoot}${path.sep}`;
      const withinRealRoot = async (rel: string): Promise<boolean> => {
        try {
          const real = await fs.realpath(path.resolve(rootAbs, rel));
          return real === realRoot || real.startsWith(realRootPrefix);
        } catch {
          return false;
        }
      };
      const fileKeep = await Promise.all(filePaths.map(withinRealRoot));
      const emptyKeep = await Promise.all(emptyDirPaths.map(withinRealRoot));
      confinedFilePaths = filePaths.filter((_, i) => fileKeep[i]);
      confinedEmptyDirPaths = emptyDirPaths.filter((_, i) => emptyKeep[i]);
      if (confinedFilePaths.length !== filePaths.length) {
        logger.debug(
          `[confine] dropped ${filePaths.length - confinedFilePaths.length} path(s) resolving outside ${realRoot}`,
        );
      }
    }

    logger.debug(
      `[result] Total files: ${confinedFilePaths.length}, empty directories: ${confinedEmptyDirPaths.length}`,
    );
    logger.trace(`Filtered ${confinedFilePaths.length} files`);

    return {
      filePaths: sortPaths(confinedFilePaths),
      emptyDirPaths: sortPaths(confinedEmptyDirPaths),
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

/**
 * Walk up the directory tree from rootDir, collecting patterns from ancestor
 * `.ignore` and `.repomixignore` files. `.gitignore` is intentionally excluded —
 * globby already walks parents for it via its gitignore option.
 *
 * Mirrors git's own behavior: the walk stops at the filesystem root, OR at the
 * git repo boundary if one is found above rootDir (so we don't leak ignore
 * rules from an unrelated repo the user happens to be nested in).
 *
 * Pattern translation (rebased against rootDir):
 *   - "secret.txt" (no slash) — matches at any depth below the file's
 *     directory. Since rootDir is a descendant of that directory, this is
 *     the same as "at any depth below rootDir", so we use a glob of the form '**<slash><pattern>'.
 *   - "/secret.txt" (rooted) — anchored to the file's directory, which is
 *     above rootDir. Targets files outside rootDir's subtree. Skipped.
 *   - "src/secret.txt" (relative) — targets files under the file's
 *     `src/` subdirectory. Mostly outside rootDir's subtree; the only case
 *     where it would apply is when rootDir itself lives under that
 *     subdirectory, which is a niche enough case to skip here — users can
 *     write a more explicit rule for it. Skipped.
 *   - Negation patterns ("!...") are kept and passed through.
 *
 * Files that can't be read are skipped silently — the same way globby
 * handles unreadable .gitignore files.
 */
const collectAncestorIgnoreFilePatterns = async (
  rootDir: string,
  enabledFileNames: ReadonlySet<string>,
): Promise<string[]> => {
  if (enabledFileNames.size === 0) {
    return [];
  }

  const absoluteRoot = path.resolve(rootDir);
  const collected: string[] = [];

  // Walk up to find the git root (if any). We bound the walk there, the same way
  // globby bounds its parent .gitignore search — beyond a repo boundary the
  // .ignore / .repomixignore files belong to a different project.
  let gitRoot: string | undefined;
  let cursor = path.dirname(absoluteRoot);
  while (true) {
    const gitPath = path.join(cursor, '.git');
    try {
      const stat = await fs.stat(gitPath);
      if (stat.isDirectory() || stat.isFile()) {
        gitRoot = cursor;
        break;
      }
    } catch {
      // .git not present here; keep walking
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  const walkRoot = gitRoot ? path.dirname(gitRoot) : path.dirname(path.parse(absoluteRoot).root);
  cursor = path.dirname(absoluteRoot);
  while (cursor.length >= walkRoot.length && cursor !== walkRoot) {
    for (const fileName of enabledFileNames) {
      const filePath = path.join(cursor, fileName);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const patterns = parseIgnoreContent(content);
        for (const pattern of patterns) {
          const translated = translateAncestorPattern(pattern);
          if (translated !== null) {
            collected.push(translated);
          }
        }
      } catch {
        // File doesn't exist or can't be read — skip silently.
      }
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  return collected;
};

/**
 * Translate a single gitignore-style pattern from an ancestor ignore file
 * into a globby-compatible pattern rebased against the current rootDir.
 *
 * Returns null if the pattern targets files outside rootDir's subtree
 * (rooted or relative patterns from an ancestor directory).
 *
 * `base` is the path from rootDir to the directory holding the ignore file,
 * already in POSIX form (may be empty if the file is in rootDir itself).
 */
const translateAncestorPattern = (pattern: string): string | null => {
  const isNegative = pattern.startsWith('!');
  const cleanPattern = isNegative ? pattern.slice(1) : pattern;
  if (!cleanPattern) {
    return null;
  }

  const slashIndex = cleanPattern.indexOf('/');
  const hasNonTrailingSlash = slashIndex !== -1 && slashIndex !== cleanPattern.length - 1;

  let result: string | null;
  if (!hasNonTrailingSlash) {
    // Matches at any depth below the file's directory. Since rootDir is a
    // descendant of that directory, the same set of files matches at any
    // depth below rootDir — so a `<two-asterisks>/<pattern>` glob works for all cases.
    result = `**/${cleanPattern}`;
  } else {
    // Rooted ("/foo") or relative ("src/foo") patterns target files outside
    // rootDir's subtree. Skip them — they're not relevant to this run.
    result = null;
  }

  return result !== null && isNegative ? `!${result}` : result;
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
    // Normalize to POSIX separators: globby matches ignore patterns against
    // forward-slash paths, so a nested output path (e.g. `docs/out.xml`) would
    // stay as `docs\out.xml` on Windows and fail to self-ignore the output file.
    const relativeToTargetPath = toPosixPath(path.relative(rootDir, absoluteOutputPath));

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

  // Add patterns from ancestor .ignore / .repomixignore files. Globby's
  // `ignoreFiles` option does not walk parents, so we collect ancestor
  // patterns here and feed them as globs to globby's `ignore` option.
  // `.gitignore` is excluded — globby handles its ancestor walk via the
  // gitignore option.
  const ancestorFileNames = new Set<string>();
  if (config.ignore.useDotIgnore) {
    ancestorFileNames.add('.ignore');
  }
  ancestorFileNames.add('.repomixignore');
  const ancestorPatterns = await collectAncestorIgnoreFilePatterns(rootDir, ancestorFileNames);
  for (const pattern of ancestorPatterns) {
    ignorePatterns.add(pattern);
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
