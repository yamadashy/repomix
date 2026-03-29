import type { Stats } from 'node:fs';
import { readdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Options as GlobbyOptions } from 'globby';
import picomatch from 'picomatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitLsFiles } from '../git/gitCommand.js';
import { sortPaths } from './filePathSort.js';

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

// Lazy-load globby (~55ms) and minimatch (~10ms) since they are only needed as a fallback
// when git ls-files is unavailable (non-git repos, gitignore disabled).
// In git repos, the filtered directory walk replaces globby for empty dir search,
// so these modules are never loaded, saving ~65ms from the critical path.
// Cache the import promise (not just the result) to avoid redundant imports
// when multiple concurrent callers (e.g., parallel searchFiles) race on the check.
let _globbyPromise: Promise<typeof import('globby').globby> | undefined;
let _minimatchPromise: Promise<typeof import('minimatch').minimatch> | undefined;

const getGlobby = (): Promise<typeof import('globby').globby> => {
  if (!_globbyPromise) {
    _globbyPromise = import('globby').then((mod) => mod.globby);
  }
  return _globbyPromise;
};

const getMinimatch = (): Promise<typeof import('minimatch').minimatch> => {
  if (!_minimatchPromise) {
    _minimatchPromise = import('minimatch').then((mod) => mod.minimatch);
  }
  return _minimatchPromise;
};

export interface FileSearchResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

/**
 * Recursively walk directories, skipping those matching the isIgnored predicate.
 * Uses synchronous readdirSync for maximum throughput (avoids Promise overhead per directory).
 * Only visits non-ignored directories, so node_modules and other heavy ignored trees are skipped
 * entirely (~37ms for ~300 dirs vs ~74ms for readdir recursive scanning ~1500 dirs).
 */
const walkDirectoriesFiltered = (rootDir: string, isIgnored: (path: string) => boolean): string[] => {
  const result: string[] = [];

  const walk = (relDir: string): void => {
    const fullDir = relDir ? path.join(rootDir, relDir) : rootDir;
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(fullDir, { withFileTypes: true });
    } catch (error) {
      logger.debug(`Failed to read directory ${fullDir}:`, error instanceof Error ? error.message : String(error));
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;

      // Skip ignored directories to avoid traversing heavy trees like node_modules
      if (isIgnored(relPath) || isIgnored(`${relPath}/`)) continue;

      result.push(relPath);
      walk(relPath);
    }
  };

  walk('');
  return result;
};

const findEmptyDirectories = async (
  rootDir: string,
  directories: string[],
  ignorePatterns: string[],
): Promise<string[]> => {
  const minimatch = await getMinimatch();
  const emptyDirs: string[] = [];

  for (const dir of directories) {
    const fullPath = path.join(rootDir, dir);
    try {
      const entries = await fs.readdir(fullPath);
      const hasVisibleContents = entries.some((entry) => !entry.startsWith('.'));

      if (!hasVisibleContents) {
        // This checks if the directory itself matches any ignore patterns
        const shouldIgnore = ignorePatterns.some((pattern) => minimatch(dir, pattern) || minimatch(`${dir}/`, pattern));

        if (!shouldIgnore) {
          emptyDirs.push(dir);
        }
      }
    } catch (error) {
      logger.debug(`Error checking directory ${dir}:`, error);
    }
  }

  return emptyDirs;
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

interface GitLsFilesResult {
  filePaths: string[];
  isIncluded: (path: string) => boolean;
  isIgnored: (path: string) => boolean;
}

/**
 * Fast file search using `git ls-files` for git repositories.
 * git ls-files reads the git index directly (~7ms) instead of walking the filesystem
 * with .gitignore parsing (~200ms via globby). Remaining ignore/include patterns
 * are applied via picomatch (compiled glob→regex, ~27ms for 1000 files × 87 patterns).
 *
 * Returns the file paths and compiled picomatch matchers (reusable for empty dir filtering),
 * or null if the fast path cannot be used (not a git repo, errors, etc.).
 */
const tryGitLsFilesSearch = async (
  rootDir: string,
  config: RepomixConfigMerged,
  includePatterns: string[],
  ignorePatterns: string[],
  ignoreFilePatterns: string[],
): Promise<GitLsFilesResult | null> => {
  // Only use fast path when gitignore is enabled (the primary source of globby slowness)
  if (!config.ignore.useGitignore) {
    return null;
  }

  try {
    const startTime = Date.now();

    // Start git subprocess immediately, then prepare patterns while it runs.
    // execGitLsFiles (~15ms) overlaps with ignore file reads + picomatch compilation (~25ms).
    const gitFilesPromise = execGitLsFiles(rootDir);

    // Read root-level ignore files and build the full pattern list while git runs.
    const allIgnorePatterns = [...ignorePatterns];
    for (const ignoreFileGlob of ignoreFilePatterns) {
      const ignoreFileName = path.basename(ignoreFileGlob);
      const ignoreFilePath = path.join(rootDir, ignoreFileName);
      try {
        const content = await fs.readFile(ignoreFilePath, 'utf-8');
        allIgnorePatterns.push(...parseIgnoreContent(content));
      } catch {
        // Ignore file doesn't exist - skip
      }
    }

    // Compile patterns once via picomatch (glob→regex) for O(files) matching
    // instead of O(files × patterns) with per-call minimatch.
    // Expand each pattern with a /**  variant so directory patterns (e.g.,
    // "node_modules") also match files inside (e.g., "node_modules/foo/bar.js"),
    // mimicking gitignore-style directory matching.
    const normalizedIgnores = allIgnorePatterns.map(normalizeGlobPattern);
    const expandedIgnores = normalizedIgnores.flatMap((p) => [p, `${p}/**`]);
    const isIncluded = picomatch(includePatterns, { dot: true });
    const isIgnored = picomatch(expandedIgnores, { dot: true });

    // Await git results (likely already complete since pattern compilation took ~25ms)
    const gitFiles = await gitFilesPromise;
    const gitElapsedTime = Date.now() - startTime;
    logger.debug(`[git ls-files] Completed in ${gitElapsedTime}ms, found ${gitFiles.length} files`);

    const filtered = gitFiles.filter((file) => isIncluded(file) && !isIgnored(file));

    const totalElapsedTime = Date.now() - startTime;
    logger.debug(`[git ls-files] Filtered to ${filtered.length} files in ${totalElapsedTime}ms total`);
    return { filePaths: filtered, isIncluded, isIgnored };
  } catch {
    // git ls-files failed (not a git repo, git not installed, etc.)
    logger.debug('[git ls-files] Failed, falling back to globby');
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

  // Run permission check and ignore context preparation in parallel since they are independent.
  // Both need the rootDir to exist (verified above) but don't depend on each other.
  const [permissionCheck, { adjustedIgnorePatterns, ignoreFilePatterns }] = await Promise.all([
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

    // Fast path: use git ls-files when available (handles .gitignore natively, ~7ms vs ~200ms)
    const gitLsFilesResult = await tryGitLsFilesSearch(
      rootDir,
      config,
      includePatterns,
      adjustedIgnorePatterns,
      ignoreFilePatterns,
    );

    let filePaths: string[];
    let emptyDirPaths: string[] = [];

    if (gitLsFilesResult !== null) {
      filePaths = gitLsFilesResult.filePaths;

      // For empty directory search in git repos, use a filtered recursive walk + picomatch
      // instead of globby. This reuses the compiled picomatch matchers from git ls-files search,
      // avoiding the ~55ms globby module load + ~114ms globby directory scan entirely.
      // Filtered walk (~37ms) skips ignored directories (node_modules, .git, etc.) during
      // traversal, making it faster than both globby (~169ms) and unfiltered readdir (~74ms).
      if (config.output.includeEmptyDirectories) {
        logger.debug('[empty dirs] Using filtered walk + picomatch for empty directory search...');
        const emptyDirStartTime = Date.now();

        const allDirs = walkDirectoriesFiltered(rootDir, gitLsFilesResult.isIgnored);
        // Apply include patterns to match globby behavior (e.g., only dirs under src/**)
        const matchedDirs = allDirs.filter((d) => gitLsFilesResult.isIncluded(d));

        const emptyDirElapsedTime = Date.now() - emptyDirStartTime;
        logger.debug(`[empty dirs] Found ${matchedDirs.length} directories in ${emptyDirElapsedTime}ms`);

        const filterStartTime = Date.now();
        emptyDirPaths = await findEmptyDirectories(rootDir, matchedDirs, adjustedIgnorePatterns);
        const filterTime = Date.now() - filterStartTime;
        logger.debug(`[empty dirs] Filtered to ${emptyDirPaths.length} empty directories in ${filterTime}ms`);
      }
    } else {
      logger.debug('[globby] Starting file search...');
      const globbyStartTime = Date.now();
      const globby = await getGlobby();

      filePaths = await globby(includePatterns, {
        ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
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
      });

      const globbyElapsedTime = Date.now() - globbyStartTime;
      logger.debug(`[globby] Completed in ${globbyElapsedTime}ms, found ${filePaths.length} files`);

      if (config.output.includeEmptyDirectories) {
        logger.debug('[empty dirs] Searching for empty directories...');
        const emptyDirStartTime = Date.now();

        const directories = await globby(includePatterns, {
          ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
          onlyDirectories: true,
        });

        const emptyDirElapsedTime = Date.now() - emptyDirStartTime;
        logger.debug(`[empty dirs] Found ${directories.length} directories in ${emptyDirElapsedTime}ms`);

        const filterStartTime = Date.now();
        emptyDirPaths = await findEmptyDirectories(rootDir, directories, adjustedIgnorePatterns);
        const filterTime = Date.now() - filterStartTime;
        logger.debug(`[empty dirs] Filtered to ${emptyDirPaths.length} empty directories in ${filterTime}ms`);
      }
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
): Promise<{ adjustedIgnorePatterns: string[]; ignoreFilePatterns: string[] }> => {
  const [ignorePatterns, ignoreFilePatterns] = await Promise.all([
    getIgnorePatterns(rootDir, config),
    getIgnoreFilePatterns(config),
  ]);

  // Normalize ignore patterns to handle trailing slashes consistently
  const normalizedIgnorePatterns = ignorePatterns.map(normalizeGlobPattern);

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
  const globby = await getGlobby();

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
  const { adjustedIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(rootDir, config);
  const globby = await getGlobby();

  const files = await globby(['**/*'], {
    ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
    onlyFiles: true,
  });

  return sortPaths(files);
};
