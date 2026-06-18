import type { Dirent, Stats } from 'node:fs';
import fsCallback from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { type Options as GlobbyOptions, type GlobEntry, globby } from 'globby';
import { minimatch } from 'minimatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { mapWithConcurrency } from '../../shared/asyncMap.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { sortPaths } from './filePathSort.js';
import { buildIgnoreFileFilter, type IgnoreFileFilter } from './gitignoreFilter.js';

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

    // The adapter is shared between the ignore-file discovery walk and the main
    // scan so the directory tree is read once per search.
    const fsAdapter = createGlobbyFsAdapter();
    const ignoreFileFilter = await buildIgnoreFileFilter(
      rootDir,
      config.ignore.useGitignore,
      ignoreFilePatterns,
      adjustedIgnorePatterns,
      fsAdapter,
    ).catch(handleGlobbyError);

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
        ...createBaseGlobbyOptions(rootDir, adjustedIgnorePatterns, ignoreFileFilter, fsAdapter),
        onlyFiles: false,
        objectMode: true,
      }).catch(handleGlobbyError);

      const files: string[] = [];
      const directories: string[] = [];
      for (const entry of entries) {
        if (entry.dirent.isFile()) {
          if (!ignoreFileFilter.isIgnored(entry.path, false)) {
            files.push(entry.path);
          }
        } else if (entry.dirent.isDirectory()) {
          if (!ignoreFileFilter.isIgnored(entry.path, true)) {
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
      emptyDirPaths = await findEmptyDirectories(rootDir, directories);
      const filterTime = Date.now() - filterStartTime;
      logger.debug(`[empty dirs] Filtered to ${emptyDirPaths.length} empty directories in ${filterTime}ms`);
    } else {
      const files = await globby(includePatterns, {
        ...createBaseGlobbyOptions(rootDir, adjustedIgnorePatterns, ignoreFileFilter, fsAdapter),
        onlyFiles: true,
      }).catch(handleGlobbyError);
      filePaths = filterDeferredIgnoredFiles(
        files.filter((filePath) => !ignoreFileFilter.isIgnored(filePath, false)),
        deferredIgnorePatterns,
      );

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

/**
 * Creates an fs adapter shared between the ignore-file discovery walk
 * (buildIgnoreFileFilter) and the main scan, serving the second walk's readdir
 * calls from the first walk's results and answering stat calls from
 * directory-entry types already learned during traversal.
 *
 * Each search walks the tree twice — once to discover ignore files
 * (.gitignore/.repomixignore/.ignore) and once for the main scan — issuing a second
 * readdir(withFileTypes) for every directory. Successful results from the first walk
 * are replayed from memory on the second, halving the readdir syscalls per search.
 * Errors are never cached, so a directory that failed transiently is retried. Both
 * walks therefore see one consistent snapshot per search; previously a directory
 * changing between the two walks could be listed differently by each.
 *
 * The stat interception predates the in-repo ignore-file filter: globby's
 * `gitignore: true` machinery statted every matched path to decide whether
 * trailing-slash ignore rules (`dir/`) applied. The filter now answers that from
 * dirent types directly, but the interception is kept — it is free and still
 * serves any stat a glob implementation issues. Symlinks and other special
 * entries are never recorded (stat follows links, so the dirent type may not
 * match) and fall through to a real stat, as does any path not seen during
 * traversal. The adapter is created per search, so the cache cannot go stale.
 *
 * Cache keys are built with `path.join`, which normalizes separators to the native one —
 * exactly like the `path.normalize` + `path.resolve` chain globby applies before calling
 * `stat`, so the keys match on Windows too despite fast-glob's walker joining segments
 * with `/`. Do not posix-normalize the keys instead: a blanket `\` → `/` rewrite could
 * collide two distinct POSIX paths (where `\` is a legal filename character) and serve a
 * wrong type, whereas a separator mismatch merely falls through to a real stat.
 */
const createGlobbyFsAdapter = (): GlobbyOptions['fs'] => {
  const isDirectoryByPath = new Map<string, boolean>();
  const readdirEntriesByPath = new Map<string, Dirent[]>();

  const readdir = (dirPath: string, options: unknown, callback?: unknown): void => {
    if (
      typeof options === 'object' &&
      options !== null &&
      (options as { withFileTypes?: boolean }).withFileTypes === true &&
      typeof callback === 'function'
    ) {
      const onEntries = callback as (error: NodeJS.ErrnoException | null, entries: Dirent[]) => void;
      const cachedEntries = readdirEntriesByPath.get(dirPath);
      if (cachedEntries !== undefined) {
        // Replay via nextTick to keep the callback asynchronous, as fast-glob expects.
        // The walker only reads the cached Dirent objects (it wraps them in its own
        // entry objects), so sharing one array across traversals is safe.
        process.nextTick(onEntries, null, cachedEntries);
        return;
      }
      fsCallback.readdir(dirPath, options as { withFileTypes: true }, (error, entries) => {
        if (!error) {
          readdirEntriesByPath.set(dirPath, entries);
          for (const entry of entries) {
            if (entry.isDirectory() || entry.isFile()) {
              isDirectoryByPath.set(path.join(dirPath, entry.name), entry.isDirectory());
            }
          }
        }
        onEntries(error, entries);
      });
      return;
    }
    // Pass through any other call shape (e.g. plain readdir without withFileTypes) unchanged.
    (fsCallback.readdir as (p: string, o: unknown, c?: unknown) => void)(dirPath, options, callback);
  };

  const stat = (statPath: string, callback: (error: NodeJS.ErrnoException | null, stats: Stats) => void): void => {
    const isDirectory = isDirectoryByPath.get(statPath);
    if (isDirectory === undefined) {
      fsCallback.stat(statPath, callback);
      return;
    }
    // The ignore filter consults only isDirectory()/isFile(); other Stats fields are not accessed.
    callback(null, { isDirectory: () => isDirectory, isFile: () => !isDirectory } as unknown as Stats);
  };

  return {
    lstat: fsCallback.lstat,
    lstatSync: fsCallback.lstatSync,
    statSync: fsCallback.statSync,
    readdirSync: fsCallback.readdirSync,
    readdir: readdir as typeof fsCallback.readdir,
    stat: stat as typeof fsCallback.stat,
  };
};

/**
 * Creates base globby options with common ignore patterns.
 * Returns options that can be extended with specific settings like onlyFiles or onlyDirectories.
 *
 * Ignore files (.gitignore/.repomixignore/.ignore) are handled by repomix's own
 * filter (see buildIgnoreFileFilter) instead of globby's `gitignore`/`ignoreFiles`
 * options: the filter's pruning patterns are merged into `ignore` here and its
 * predicate is applied synchronously to the results, which avoids globby's
 * one-Promise-per-matched-path async filter. The fs adapter is shared with the
 * filter's discovery walk so the main scan replays its readdir results.
 */
const createBaseGlobbyOptions = (
  rootDir: string,
  ignorePatterns: string[],
  ignoreFileFilter: IgnoreFileFilter,
  fsAdapter: GlobbyOptions['fs'],
): Omit<GlobbyOptions, 'onlyFiles' | 'onlyDirectories'> => ({
  cwd: rootDir,
  ignore: [...ignorePatterns, ...ignoreFileFilter.patternsForFastGlob],
  gitignore: false,
  ignoreFiles: [],
  absolute: false,
  dot: true,
  followSymbolicLinks: false,
  fs: fsAdapter,
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
  // .gitignore files are handled separately by buildIgnoreFileFilter (which also
  // collects parent directory .gitignore files up to the git root, matching
  // Git's behavior), so they are not part of these patterns.

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

  const fsAdapter = createGlobbyFsAdapter();
  const ignoreFileFilter = await buildIgnoreFileFilter(
    rootDir,
    config.ignore.useGitignore,
    ignoreFilePatterns,
    adjustedIgnorePatterns,
    fsAdapter,
  );

  const directories = await globby(['**/*'], {
    ...createBaseGlobbyOptions(rootDir, adjustedIgnorePatterns, ignoreFileFilter, fsAdapter),
    onlyDirectories: true,
  });

  return sortPaths(directories.filter((directory) => !ignoreFileFilter.isIgnored(directory, true)));
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

  const fsAdapter = createGlobbyFsAdapter();
  const ignoreFileFilter = await buildIgnoreFileFilter(
    rootDir,
    config.ignore.useGitignore,
    ignoreFilePatterns,
    adjustedIgnorePatterns,
    fsAdapter,
  );

  const files = await globby(['**/*'], {
    ...createBaseGlobbyOptions(rootDir, adjustedIgnorePatterns, ignoreFileFilter, fsAdapter),
    onlyFiles: true,
  });

  return sortPaths(
    filterDeferredIgnoredFiles(
      files.filter((filePath) => !ignoreFileFilter.isIgnored(filePath, false)),
      deferredIgnorePatterns,
    ),
  );
};
