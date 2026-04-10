import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Options as GlobbyOptions } from 'globby';
import { Minimatch, minimatch } from 'minimatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitLsFiles } from '../git/gitCommand.js';
import { sortPaths } from './filePathSort.js';

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

// Lazy-load globby: the git ls-files fast path (the common case for git repos)
// never uses globby. Deferring the import avoids ~50ms of module loading on
// every CLI invocation. The promise is cached so concurrent callers share it.
let _globbyPromise: Promise<typeof import('globby').globby> | undefined;
const getGlobby = () => {
  _globbyPromise ??= import('globby').then((m) => m.globby);
  return _globbyPromise;
};

// Lazy-load the `ignore` package: cached so the ~15-20ms dynamic import cost
// is paid at most once and can overlap with other async work (e.g., git ls-files).
// biome-ignore lint/suspicious/noExplicitAny: dynamic import type is complex
let _ignorePromise: Promise<any> | undefined;
const getIgnore = () => {
  _ignorePromise ??= import('ignore');
  return _ignorePromise;
};

export interface FileSearchResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

const findEmptyDirectories = async (
  rootDir: string,
  directories: string[],
  ignorePatterns: string[],
): Promise<string[]> => {
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

/**
 * Derives empty directories from a file list without a full globby directory scan.
 * Instead of walking the entire filesystem (~80-120ms), analyzes the git ls-files
 * output to find directories whose only direct children are dot-prefixed entries,
 * then verifies with fs.readdir (~3ms total for typical repos).
 */
const findEmptyDirsFromFilePaths = async (
  rootDir: string,
  filePaths: string[],
  ignorePatterns: string[],
): Promise<string[]> => {
  const allDirs = new Set<string>();
  const dirsWithVisibleChildren = new Set<string>();

  for (const filePath of filePaths) {
    // git ls-files always uses '/' as separator, regardless of OS
    const parts = filePath.split('/');

    // Build directory paths incrementally to avoid repeated slice+join allocations
    let currentDir = '';
    for (let i = 0; i < parts.length; i++) {
      const childName = parts[i];
      const parentDir = currentDir;

      // If this direct child doesn't start with '.', parent has visible content
      if (!childName.startsWith('.')) {
        dirsWithVisibleChildren.add(parentDir);
      }

      // Build the current directory path
      currentDir = currentDir ? `${currentDir}/${childName}` : childName;

      // Track all directories (non-leaf path components)
      if (i < parts.length - 1) {
        allDirs.add(currentDir);
      }
    }
  }

  // Candidate empty dirs: directories with no visible direct children from the file list
  const candidates: string[] = [];
  for (const dir of allDirs) {
    if (!dirsWithVisibleChildren.has(dir)) {
      candidates.push(dir);
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  // Verify candidates against the actual filesystem (handles non-tracked visible entries)
  // and apply ignore patterns, matching the behavior of findEmptyDirectories
  return findEmptyDirectories(rootDir, candidates, ignorePatterns);
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

/**
 * Fast file search using `git ls-files`. Returns null if the fast path cannot be used
 * (not a git repo, git error, or incompatible config). Falls back to globby in the caller.
 *
 * ~40x faster than globby for git repos (~5ms vs ~200ms) because git reads from
 * its pre-built index rather than walking the entire filesystem.
 */
const searchFilesWithGit = async (
  rootDir: string,
  config: RepomixConfigMerged,
  includePatterns: string[],
  rawIgnorePatterns: string[],
  ignoreFilePatterns: string[],
  deps = { execGitLsFiles },
  prefetchedGitFiles?: string[] | null,
): Promise<string[] | null> => {
  // git ls-files --exclude-standard inherently uses .gitignore, so only use this
  // fast path when useGitignore is enabled to maintain consistent behavior.
  if (!config.ignore.useGitignore) return null;

  // Use pre-fetched git files if available (started in parallel with prepareIgnoreContext),
  // otherwise fetch now. The ignore module import also starts early via getIgnore().
  const ignorePromise = getIgnore();

  let gitFiles: string[];
  if (prefetchedGitFiles !== undefined) {
    if (prefetchedGitFiles === null || prefetchedGitFiles.length === 0) return null;
    gitFiles = prefetchedGitFiles;
  } else {
    try {
      gitFiles = await deps.execGitLsFiles(rootDir);
    } catch {
      return null;
    }
    if (gitFiles.length === 0) return null;
  }

  // --- Build ignore filter using the `ignore` package (.gitignore-compatible matching) ---
  // IMPORTANT: Use raw ignore patterns here, NOT the normalizeGlobPattern-adjusted ones.
  // normalizeGlobPattern converts `**/foo` to `**/foo/**` for globby compatibility,
  // but that transformation breaks the `ignore` package's matching (it would treat
  // `**/package-lock.json/**` as a directory pattern instead of a file pattern).
  const { default: ignore } = await ignorePromise;
  const ig = ignore();

  // Add raw ignore patterns (defaultIgnoreList + custom + output file path + git/info/exclude)
  // These are passed from the caller to avoid a redundant getIgnorePatterns call.
  for (const pattern of rawIgnorePatterns) {
    ig.add(pattern);
  }

  // Read and apply ignore files (.repomixignore, .ignore) from the repo.
  // Check both git output (tracked/untracked-non-ignored) and the filesystem
  // (covers root files that might be .gitignored but still present on disk).
  const ignoreFileBasenames = ignoreFilePatterns.map((p) => p.replace('**/', ''));
  const ignoreFileSet = new Set<string>();

  // Find ignore files from git output
  for (const filePath of gitFiles) {
    const basename = path.basename(filePath);
    if (ignoreFileBasenames.includes(basename)) {
      ignoreFileSet.add(filePath);
    }
  }

  // Also check root directory directly (in case the file is .gitignored)
  for (const basename of ignoreFileBasenames) {
    ignoreFileSet.add(basename);
  }

  // Read and apply each ignore file
  for (const ignoreFilePath of ignoreFileSet) {
    const fullPath = path.join(rootDir, ignoreFilePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const dir = path.dirname(ignoreFilePath);

      if (dir === '.') {
        // Root-level ignore file: patterns apply from root
        ig.add(content);
      } else {
        // Nested ignore file: prefix patterns with directory path
        const parsed = parseIgnoreContent(content);
        for (const pattern of parsed) {
          if (pattern.startsWith('!')) {
            ig.add(`!${dir}/${pattern.slice(1)}`);
          } else {
            ig.add(`${dir}/${pattern}`);
          }
        }
      }
    } catch {
      // File doesn't exist on disk (possibly a stale git index entry)
    }
  }

  // --- Build include filter ---
  const isDefaultInclude = includePatterns.length === 1 && includePatterns[0] === '**/*';

  // Pre-compile include matchers for efficient batch matching
  const includeMatchers = isDefaultInclude ? null : includePatterns.map((p) => new Minimatch(p, { dot: true }));

  // --- Filter files ---
  return gitFiles.filter((file) => {
    // Include filter: skip if file doesn't match any include pattern
    if (includeMatchers && !includeMatchers.some((m) => m.match(file))) return false;
    // Ignore filter: skip if file matches any ignore pattern
    return !ig.ignores(file);
  });
};

// Get all file paths considering the config
export const searchFiles = async (
  rootDir: string,
  config: RepomixConfigMerged,
  explicitFiles?: string[],
): Promise<FileSearchResult> => {
  // Eagerly start loading the `ignore` module so it resolves during
  // the stat/permission checks below (~5ms), giving the dynamic import
  // (~15-20ms) a head start before searchFilesWithGit needs it.
  if (config.ignore.useGitignore) {
    getIgnore();
  }

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
    // Start git ls-files early so it runs in parallel with prepareIgnoreContext.
    // git ls-files spawns a subprocess (~40ms) that only needs rootDir; the ignore
    // patterns are applied afterward during filtering. This overlaps the subprocess
    // spawn with ignore context preparation (~5ms) and include pattern computation.
    const earlyGitFilesPromise =
      !explicitFiles && config.ignore.useGitignore ? execGitLsFiles(rootDir).catch((): null => null) : undefined;

    const { rawIgnorePatterns, adjustedIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(
      rootDir,
      config,
    );

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

    // Try git ls-files fast path for git repositories.
    // This is ~40x faster than globby because it reads from the git index
    // rather than walking the entire filesystem. Falls back to globby on failure.
    if (!explicitFiles) {
      const gitStartTime = Date.now();
      // Await the pre-fetched git files (started before prepareIgnoreContext)
      const prefetchedGitFiles = earlyGitFilesPromise !== undefined ? await earlyGitFilesPromise : undefined;
      const gitResult = await searchFilesWithGit(
        rootDir,
        config,
        includePatterns,
        rawIgnorePatterns,
        ignoreFilePatterns,
        undefined,
        prefetchedGitFiles,
      );

      if (gitResult !== null) {
        const gitElapsedTime = Date.now() - gitStartTime;
        logger.debug(`[git-ls-files] Completed in ${gitElapsedTime}ms, found ${gitResult.length} files`);

        // Derive empty directories from the file list instead of running a full
        // globby directory scan (~80-120ms). By analyzing direct children of each
        // directory from the git output, we identify candidates without any visible
        // (non-dot-prefixed) entries, then verify with fs.readdir (~3ms total).
        let emptyDirPaths: string[] = [];
        if (config.output.includeEmptyDirectories) {
          emptyDirPaths = await findEmptyDirsFromFilePaths(rootDir, gitResult, adjustedIgnorePatterns);
        }

        return {
          filePaths: sortPaths(gitResult),
          emptyDirPaths: sortPaths(emptyDirPaths),
        };
      }
    }

    logger.trace('Include patterns with explicit files:', includePatterns);
    logger.trace('Ignore patterns:', adjustedIgnorePatterns);
    logger.trace('Ignore file patterns (for globby):', ignoreFilePatterns);

    logger.debug('[globby] Starting file search...');
    const globbyStartTime = Date.now();

    const globby = await getGlobby();
    const filePaths = await globby(includePatterns, {
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

    let emptyDirPaths: string[] = [];
    if (config.output.includeEmptyDirectories) {
      logger.debug('[empty dirs] Searching for empty directories...');
      const emptyDirStartTime = Date.now();

      const globbyForDirs = await getGlobby();
      const directories = await globbyForDirs(includePatterns, {
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
): Promise<{ rawIgnorePatterns: string[]; adjustedIgnorePatterns: string[]; ignoreFilePatterns: string[] }> => {
  const [ignorePatterns, ignoreFilePatterns] = await Promise.all([
    getIgnorePatterns(rootDir, config),
    getIgnoreFilePatterns(config),
  ]);

  // Keep raw patterns for the git fast path (which uses the `ignore` package
  // and needs patterns without the globby-specific normalizeGlobPattern transform).
  const rawIgnorePatterns = [...ignorePatterns];

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

  return { rawIgnorePatterns, adjustedIgnorePatterns, ignoreFilePatterns };
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
