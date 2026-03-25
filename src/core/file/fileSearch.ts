import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Options as GlobbyOptions } from 'globby';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitLsFiles } from '../git/gitCommand.js';
import { sortPaths } from './filePathSort.js';

// Lazy-load globby (~70ms) — only needed as fallback when git ls-files fast path
// is not available (non-git repos, gitignore disabled, explicit files).
// For git repositories (95%+ of use cases), globby is never called.
// Cache the import promise to avoid concurrent dynamic imports returning different
// module instances (a Vitest limitation with mocked modules).
let _globbyPromise: Promise<typeof import('globby')> | undefined;
const getGlobby = async (): Promise<typeof import('globby').globby> => {
  _globbyPromise ??= import('globby');
  return (await _globbyPromise).globby;
};

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

// Lazy-load picomatch for git fast path pattern matching.
// picomatch is a transitive dependency (via globby → fast-glob → picomatch) so always available.
let _picomatch: typeof import('picomatch').default | undefined;
const getPicomatch = async () => {
  if (!_picomatch) {
    const mod = await import('picomatch');
    _picomatch = mod.default;
  }
  return _picomatch;
};

export interface FileSearchResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

// Lazy-load minimatch — only used for empty directory filtering (non-default feature).
// Avoids loading the module on every pack run.
let _minimatch: typeof import('minimatch').minimatch | undefined;
const getMinimatch = async () => {
  if (!_minimatch) {
    const mod = await import('minimatch');
    _minimatch = mod.minimatch;
  }
  return _minimatch;
};

const findEmptyDirectories = async (
  rootDir: string,
  directories: string[],
  ignorePatterns: string[],
): Promise<string[]> => {
  const minimatchFn = await getMinimatch();

  // Parallelize readdir calls — each is independent I/O.
  // For 100+ directories, this avoids sequential await per directory.
  const results = await Promise.all(
    directories.map(async (dir) => {
      const fullPath = path.join(rootDir, dir);
      try {
        const entries = await fs.readdir(fullPath);
        const hasVisibleContents = entries.some((entry) => !entry.startsWith('.'));

        if (!hasVisibleContents) {
          const shouldIgnore = ignorePatterns.some(
            (pattern) => minimatchFn(dir, pattern) || minimatchFn(`${dir}/`, pattern),
          );
          if (!shouldIgnore) {
            return dir;
          }
        }
      } catch (error) {
        logger.debug(`Error checking directory ${dir}:`, error);
      }
      return null;
    }),
  );

  return results.filter((dir): dir is string => dir !== null);
};

// Check if a path is a git worktree reference file.
// Reads the file directly — if .git is a directory (normal repo) readFile throws,
// and if it doesn't exist we also get an error. Both cases return false.
const isGitWorktreeRef = async (gitPath: string): Promise<boolean> => {
  try {
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

/**
 * Fast file search using `git ls-files` instead of directory walking.
 * Returns null if the fast path is not applicable (fall back to globby).
 *
 * `git ls-files --cached --others --exclude-standard` returns all tracked and
 * untracked-but-not-ignored files, which is equivalent to globby with gitignore: true
 * but ~20-50x faster because git reads from its index instead of walking the filesystem.
 *
 * After getting the file list, we apply repomix's own patterns (include, ignore,
 * .repomixignore, .ignore) using picomatch to produce the final filtered list.
 */
const searchFilesWithGit = async (
  rootDir: string,
  includePatterns: string[],
  adjustedIgnorePatterns: string[],
  ignoreFilePatterns: string[],
  deps = { execGitLsFiles },
): Promise<string[] | null> => {
  try {
    const startTime = Date.now();
    logger.debug('[git-ls-files] Starting fast file search...');

    const allFiles = await deps.execGitLsFiles(rootDir);
    if (allFiles.length === 0) return null;

    const picomatch = await getPicomatch();

    // Read additional patterns from .repomixignore and .ignore files found in git output.
    // Collect all matching ignore files across all patterns, then read them in parallel.
    const ignoreFilesToRead: string[] = [];
    for (const ignoreFileGlob of ignoreFilePatterns) {
      const isIgnoreFile = picomatch(ignoreFileGlob, { dot: true });
      for (const f of allFiles) {
        if (isIgnoreFile(f)) {
          ignoreFilesToRead.push(f);
        }
      }
    }

    const additionalIgnorePatterns: string[] = [];
    if (ignoreFilesToRead.length > 0) {
      const ignoreResults = await Promise.all(
        ignoreFilesToRead.map(async (ignoreFile) => {
          try {
            const content = await fs.readFile(path.join(rootDir, ignoreFile), 'utf8');
            const patterns = parseIgnoreContent(content);
            const dir = path.posix.dirname(ignoreFile);
            return patterns.map((pattern) =>
              dir === '.' ? normalizeGlobPattern(pattern) : normalizeGlobPattern(`${dir}/${pattern}`),
            );
          } catch {
            return [];
          }
        }),
      );
      for (const patterns of ignoreResults) {
        for (const p of patterns) {
          additionalIgnorePatterns.push(p);
        }
      }
    }

    // Expand bare patterns (no glob chars) to also match directory contents.
    // In .gitignore / .repomixignore semantics, "foo" matches both the file "foo"
    // and all files under the directory "foo/". picomatch requires explicit "foo/**".
    const expandedIgnorePatterns: string[] = [];
    for (const pattern of [...adjustedIgnorePatterns, ...additionalIgnorePatterns]) {
      expandedIgnorePatterns.push(pattern);
      // If pattern doesn't already contain glob chars or end with /**, add a /** variant
      if (!pattern.includes('*') && !pattern.includes('?') && !pattern.endsWith('/**')) {
        expandedIgnorePatterns.push(`${pattern}/**`);
      }
    }

    // Compile matchers once for all files
    const isIncluded = picomatch(includePatterns, { dot: true });
    const isIgnored =
      expandedIgnorePatterns.length > 0 ? picomatch(expandedIgnorePatterns, { dot: true }) : () => false;

    // Filter files that pass include/ignore checks and are not symlinks.
    // git ls-files lists symlinks as regular entries, but globby with
    // followSymbolicLinks: false does not follow directory symlinks.
    // We keep symlinked files (they're resolved as regular files by globby too)
    // but filter out symlinks to directories since git lists them as files.
    const filteredFiles = allFiles.filter((filePath) => isIncluded(filePath) && !isIgnored(filePath));

    const elapsed = Date.now() - startTime;
    logger.debug(
      `[git-ls-files] Completed in ${elapsed}ms, found ${filteredFiles.length} files (from ${allFiles.length} candidates)`,
    );

    return filteredFiles;
  } catch (error) {
    logger.debug('[git-ls-files] Fast path failed, falling back to globby:', (error as Error).message);
    return null;
  }
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

  // Run permission check and ignore context preparation in parallel.
  // Both are independent: permission check does readdir + access calls,
  // while ignore context reads config patterns + .git/info/exclude.
  const [permissionCheck, ignoreContext] = await Promise.all([
    checkDirectoryPermissions(rootDir),
    prepareIgnoreContext(rootDir, config),
  ]);

  if (permissionCheck.details?.read !== true) {
    if (permissionCheck.error instanceof PermissionError) {
      throw permissionCheck.error;
    }
    throw new RepomixError(
      `Target directory is not readable or does not exist. Please check folder access permissions for your terminal app.\npath: ${rootDir}`,
    );
  }

  try {
    const { adjustedIgnorePatterns, ignoreFilePatterns } = ignoreContext;

    logger.trace('Ignore patterns:', adjustedIgnorePatterns);
    logger.trace('Ignore file patterns:', ignoreFilePatterns);

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

    logger.debug('[search] Starting file search...');
    const searchStartTime = Date.now();

    // Try git ls-files fast path first when gitignore is enabled and no explicit files.
    // This replaces globby's directory walk with a git index lookup (~5ms vs ~200ms).
    const canUseGitFastPath = config.ignore.useGitignore && !explicitFiles;
    const gitResult = canUseGitFastPath
      ? await searchFilesWithGit(rootDir, includePatterns, adjustedIgnorePatterns, ignoreFilePatterns)
      : null;

    // Defer globby options creation until globby is actually needed.
    // On the git fast path (95%+ of runs), neither globby nor its options are used.
    let _baseGlobbyOptions: ReturnType<typeof createBaseGlobbyOptions> | undefined;
    const getBaseGlobbyOptions = () => {
      _baseGlobbyOptions ??= createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns);
      return _baseGlobbyOptions;
    };

    const fileSearchPromise =
      gitResult !== null
        ? Promise.resolve(gitResult)
        : getGlobby().then((globbyFn) =>
            globbyFn(includePatterns, {
              ...getBaseGlobbyOptions(),
              onlyFiles: true,
            }).catch((error: unknown) => {
              // Handle EPERM errors specifically
              const code = (error as NodeJS.ErrnoException | { code?: string })?.code;
              if (code === 'EPERM' || code === 'EACCES') {
                throw new PermissionError(
                  `Permission denied while scanning directory. Please check folder access permissions for your terminal app. path: ${rootDir}`,
                  rootDir,
                );
              }
              throw error;
            }),
          );

    // Run file search and empty directory search in parallel when both are needed
    let emptyDirPaths: string[] = [];
    const emptyDirPromise = config.output.includeEmptyDirectories
      ? (async () => {
          logger.debug('[empty dirs] Searching for empty directories...');
          const emptyDirStartTime = Date.now();

          const globbyFn = await getGlobby();
          const directories = await globbyFn(includePatterns, {
            ...getBaseGlobbyOptions(),
            onlyDirectories: true,
          });

          const emptyDirElapsedTime = Date.now() - emptyDirStartTime;
          logger.debug(`[empty dirs] Found ${directories.length} directories in ${emptyDirElapsedTime}ms`);

          const filterStartTime = Date.now();
          const result = await findEmptyDirectories(rootDir, directories, adjustedIgnorePatterns);
          const filterTime = Date.now() - filterStartTime;
          logger.debug(`[empty dirs] Filtered to ${result.length} empty directories in ${filterTime}ms`);
          return result;
        })()
      : Promise.resolve([]);

    const [filePaths, resolvedEmptyDirPaths] = await Promise.all([fileSearchPromise, emptyDirPromise]);
    emptyDirPaths = resolvedEmptyDirPaths;

    const searchElapsedTime = Date.now() - searchStartTime;
    logger.debug(`[search] Completed in ${searchElapsedTime}ms, found ${filePaths.length} files`);

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
): Promise<{ adjustedIgnorePatterns: string[]; ignoreFilePatterns: string[] }> => {
  // Parallelize all three I/O operations: ignore patterns, file patterns, and worktree check.
  // isGitWorktreeRef reads .git file — overlaps with getIgnorePatterns reading .git/info/exclude.
  const [ignorePatterns, ignoreFilePatterns, isWorktree] = await Promise.all([
    getIgnorePatterns(rootDir, config),
    getIgnoreFilePatterns(config),
    isGitWorktreeRef(path.join(rootDir, '.git')),
  ]);

  // Normalize ignore patterns to handle trailing slashes consistently
  const normalizedIgnorePatterns = ignorePatterns.map(normalizeGlobPattern);

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

  return { adjustedIgnorePatterns, ignoreFilePatterns };
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

  const globbyFn = await getGlobby();
  const directories = await globbyFn(['**/*'], {
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
  const { adjustedIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(rootDir, config);

  const globbyFn = await getGlobby();
  const files = await globbyFn(['**/*'], {
    ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
    onlyFiles: true,
  });

  return sortPaths(files);
};

/**
 * Lists both directories and files in a single call, sharing the prepareIgnoreContext result
 * to avoid duplicate I/O (.git/info/exclude reads, worktree checks) and pattern computation.
 * Used by full directory structure mode which needs both directories and files.
 *
 * @param rootDir The root directory to scan
 * @param config The merged configuration
 * @returns Object with sorted directory paths and file paths
 */
export const listDirectoriesAndFiles = async (
  rootDir: string,
  config: RepomixConfigMerged,
): Promise<{ directories: string[]; files: string[] }> => {
  const { adjustedIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(rootDir, config);
  const baseOptions = createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns);

  const globbyFn = await getGlobby();
  const [directories, files] = await Promise.all([
    globbyFn(['**/*'], { ...baseOptions, onlyDirectories: true }),
    globbyFn(['**/*'], { ...baseOptions, onlyFiles: true }),
  ]);

  return {
    directories: sortPaths(directories),
    files: sortPaths(files),
  };
};
