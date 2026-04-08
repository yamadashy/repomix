import { execFile } from 'node:child_process';
import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Options as GlobbyOptions } from 'globby';
import picomatch from 'picomatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { sortPaths } from './filePathSort.js';

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

// Lazy-load globby to avoid its ~55ms import cost on the common git fast path
// where it's not needed. Only loaded when falling back to globby-based search
// or when listing directories/files for includeFullDirectoryStructure.
let globbyCache: typeof import('globby')['globby'] | undefined;
const getGlobby = async () => {
  if (!globbyCache) {
    const mod = await import('globby');
    globbyCache = mod.globby;
  }
  return globbyCache;
};

const execFileAsync = promisify(execFile);

/**
 * Builds a single combined RegExp from an array of glob patterns by extracting
 * each pattern's regex source via picomatch.makeRe() and joining with alternation.
 * This is ~2x faster than picomatch's default arrayMatcher for large pattern sets
 * (100+ patterns) because it performs a single regex test per string instead of
 * testing each pattern's regex individually.
 */
const buildCombinedRegex = (patterns: string[], options: picomatch.PicomatchOptions): RegExp => {
  const regexes = patterns.map((p) => picomatch.makeRe(p, options));
  const sources = regexes.map((r) => r.source);
  return new RegExp(sources.join('|'), regexes[0].flags);
};

/**
 * Extracts all unique parent directories from a list of file paths,
 * then discovers any child directories that exist on the filesystem
 * but don't contain tracked files (e.g., completely empty directories).
 *
 * This replaces the globby directory scan on the git fast path, avoiding
 * both the globby import (~55ms) and its filesystem traversal (~63ms).
 */
const discoverDirectories = async (rootDir: string, filePaths: string[]): Promise<string[]> => {
  // Phase 1: Extract all unique parent directories from file paths
  const knownDirs = new Set<string>();
  for (const filePath of filePaths) {
    let dir = path.dirname(filePath);
    while (dir !== '.') {
      if (knownDirs.has(dir)) break;
      knownDirs.add(dir);
      dir = path.dirname(dir);
    }
  }

  // Phase 2: Discover child directories not containing tracked files.
  // For each known directory, check for subdirectories that aren't in our set.
  // This catches completely empty directories (no files at all) that git doesn't track.
  const discoveredDirs = new Set<string>();
  const dirsToCheck = [...knownDirs];

  while (dirsToCheck.length > 0) {
    const batch = dirsToCheck.splice(0, dirsToCheck.length);
    const childResults = await Promise.all(
      batch.map(async (dir) => {
        const fullPath = path.join(rootDir, dir);
        try {
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          const newDirs: string[] = [];
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subDir = `${dir}/${entry.name}`;
              if (!knownDirs.has(subDir) && !discoveredDirs.has(subDir)) {
                discoveredDirs.add(subDir);
                newDirs.push(subDir);
              }
            }
          }
          return newDirs;
        } catch {
          return [];
        }
      }),
    );
    // Recursively check newly discovered directories for nested empty dirs
    for (const newDirs of childResults) {
      dirsToCheck.push(...newDirs);
    }
  }

  return [...knownDirs, ...discoveredDirs];
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
  // Lazy-load minimatch to avoid its ~9ms import cost on the common path
  // where includeEmptyDirectories is disabled (the default).
  const { minimatch } = await import('minimatch');

  // Check all directories in parallel to avoid sequential readdir waterfall.
  // For repos with 200+ directories, this reduces ~22ms sequential I/O to ~6ms.
  const results = await Promise.all(
    directories.map(async (dir) => {
      const fullPath = path.join(rootDir, dir);
      try {
        const entries = await fs.readdir(fullPath);
        const hasVisibleContents = entries.some((entry) => !entry.startsWith('.'));

        if (!hasVisibleContents) {
          // This checks if the directory itself matches any ignore patterns
          const shouldIgnore = ignorePatterns.some(
            (pattern) => minimatch(dir, pattern) || minimatch(`${dir}/`, pattern),
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
 * Normalizes a gitignore-style pattern from an ignore file to a glob pattern.
 * Per gitignore spec, a bare name without slashes (e.g., "dist") matches at any
 * depth in the tree. Names with slashes are anchored to the ignore file's directory.
 * Patterns with glob metacharacters are left as-is.
 */
const normalizeIgnoreFilePattern = (pattern: string): string[] => {
  // If pattern already contains glob metacharacters, use as-is
  if (pattern.includes('*') || pattern.includes('?') || pattern.includes('{')) {
    return [pattern];
  }
  // If pattern contains a slash, it's anchored — match the entry and its contents
  if (pattern.includes('/')) {
    return [pattern, `${pattern}/**`];
  }
  // Bare name (no slash): match at any depth, mimicking gitignore behavior
  return [pattern, `${pattern}/**`, `**/${pattern}`, `**/${pattern}/**`];
};

/**
 * Fast file search using `git ls-files` to avoid globby's expensive .gitignore traversal.
 * Falls back to null if git is unavailable or the directory is not a git repo.
 *
 * `git ls-files --cached --others --exclude-standard` returns:
 * - Tracked files (--cached)
 * - Untracked but not ignored files (--others --exclude-standard)
 * This natively respects .gitignore, .git/info/exclude, and core.excludesFile.
 */
const searchFilesWithGit = async (
  rootDir: string,
  includePatterns: string[],
  ignorePatterns: string[],
  ignoreFilePatterns: string[],
  deps = { execFileAsync },
): Promise<string[] | null> => {
  try {
    // Run all three git commands in parallel:
    // 1. List all tracked + untracked non-ignored files
    // 2. List staged files with modes (to identify symlinks/submodules)
    // 3. List deleted-but-not-staged files (to exclude from results)
    const gitMaxBuffer = { cwd: rootDir, maxBuffer: 50 * 1024 * 1024 };
    const [result, stageResult, deletedResult] = await Promise.all([
      deps.execFileAsync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], gitMaxBuffer),
      deps.execFileAsync('git', ['ls-files', '--cached', '-s', '-z'], gitMaxBuffer),
      deps.execFileAsync('git', ['ls-files', '--deleted', '-z'], gitMaxBuffer),
    ]);

    // -z flag uses NUL separators for safe handling of special characters in filenames
    let files = result.stdout.split('\0').filter(Boolean);

    logger.debug(`[git ls-files] Found ${files.length} files`);

    // Filter out symlinks (mode 120000) and submodules (mode 160000).
    // git ls-files returns them as regular entries, but globby skips symlinks
    // (followSymbolicLinks:false) and submodules aren't regular files.
    // Also filter deleted-but-not-staged files that exist in the git index
    // but not on disk, matching globby's filesystem-based behavior.
    try {
      const excludePaths = new Set<string>();

      // Exclude symlinks and submodules by mode
      for (const entry of stageResult.stdout.split('\0')) {
        // Format: "mode hash stage\tpath"
        if (entry.startsWith('120000 ') || entry.startsWith('160000 ')) {
          const tabIndex = entry.indexOf('\t');
          if (tabIndex !== -1) {
            excludePaths.add(entry.slice(tabIndex + 1));
          }
        }
      }

      // Exclude deleted-but-not-staged files
      for (const deletedFile of deletedResult.stdout.split('\0')) {
        if (deletedFile) {
          excludePaths.add(deletedFile);
        }
      }

      if (excludePaths.size > 0) {
        files = files.filter((file) => !excludePaths.has(file));
      }
    } catch {
      // If git commands fail, skip filtering (minor correctness trade-off)
    }

    const picoOpts = { dot: true };

    // Build ignore matcher from ignorePatterns (defaultIgnore + custom patterns).
    // normalizeGlobPattern may have appended "/**" to file patterns like
    // "**/package-lock.json" → "**/package-lock.json/**". Include both forms
    // so file paths still match.
    // picomatch compiles all patterns into a single efficient regex for batch matching.
    const allIgnorePatterns: string[] = [];
    for (const pattern of ignorePatterns) {
      allIgnorePatterns.push(pattern);
      if (pattern.endsWith('/**')) {
        allIgnorePatterns.push(pattern.slice(0, -3));
      }
    }

    // Read and apply per-directory ignore files (.repomixignore, .ignore)
    // These files are not handled by git and need manual application.
    const isIgnoreFile = picomatch(ignoreFilePatterns, picoOpts);
    const ignoreFileSet = new Set<string>();
    for (const file of files) {
      if (isIgnoreFile(file)) {
        ignoreFileSet.add(file);
      }
    }

    if (ignoreFileSet.size > 0) {
      const ignoreRules: Array<{ dir: string; isIgnored: (path: string) => boolean }> = [];
      for (const ignoreFile of ignoreFileSet) {
        try {
          const content = await fs.readFile(path.join(rootDir, ignoreFile), 'utf8');
          const rawPatterns = parseIgnoreContent(content);
          const patterns = rawPatterns.flatMap(normalizeIgnoreFilePattern);
          if (patterns.length > 0) {
            ignoreRules.push({ dir: path.dirname(ignoreFile), isIgnored: picomatch(patterns, picoOpts) });
          }
        } catch {
          // Ignore files that can't be read
        }
      }

      if (ignoreRules.length > 0) {
        files = files.filter((file) => {
          for (const rule of ignoreRules) {
            const relativeToIgnoreDir =
              rule.dir === '.' ? file : file.startsWith(`${rule.dir}/`) ? file.slice(rule.dir.length + 1) : null;
            if (relativeToIgnoreDir === null) continue;
            if (rule.isIgnored(relativeToIgnoreDir)) return false;
          }
          return true;
        });
      }
    }

    // Apply ignore patterns using a single combined regex for faster matching.
    // picomatch(array) creates an arrayMatcher that tests each pattern individually,
    // requiring up to N regex tests per file (N = number of patterns). By extracting
    // each pattern's regex source via makeRe() and joining with alternation, we get
    // a single regex test per file — ~2x faster for the typical 130+ ignore patterns.
    if (allIgnorePatterns.length > 0) {
      const combinedIgnoreRegex = buildCombinedRegex(allIgnorePatterns, picoOpts);
      files = files.filter((file) => !combinedIgnoreRegex.test(file));
    }

    // Apply include patterns (filter to only matching files)
    const isDefaultInclude = includePatterns.length === 1 && includePatterns[0] === '**/*';
    if (!isDefaultInclude && includePatterns.length > 0) {
      const combinedIncludeRegex = buildCombinedRegex(includePatterns, picoOpts);
      files = files.filter((file) => combinedIncludeRegex.test(file));
    }

    logger.debug(`[git ls-files] After filtering: ${files.length} files`);
    return files;
  } catch (error) {
    logger.debug('[git ls-files] Failed, falling back to globby:', (error as Error).message);
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
    const { adjustedIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(rootDir, config);

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

    const searchStartTime = Date.now();

    // Fast path: use `git ls-files` to avoid globby's expensive .gitignore traversal (~100ms).
    // git ls-files reads from the git index which is much faster than a filesystem scan.
    // Only used when gitignore handling is needed; falls back to globby on failure.
    let filePaths: string[] | null = null;
    if (config.ignore.useGitignore) {
      filePaths = await searchFilesWithGit(rootDir, includePatterns, adjustedIgnorePatterns, ignoreFilePatterns);
    }

    let emptyDirPaths: string[] = [];

    if (filePaths !== null) {
      // Git fast path succeeded
      const gitElapsedTime = Date.now() - searchStartTime;
      logger.debug(`[git ls-files] Completed in ${gitElapsedTime}ms, found ${filePaths.length} files`);

      // Discover directories from file paths instead of running a separate globby scan.
      // This avoids globby's expensive filesystem traversal + gitignore parsing (~63ms)
      // by reusing the file paths already obtained from git ls-files, then doing a
      // lightweight recursive check for subdirectories that might be completely empty.
      if (config.output.includeEmptyDirectories) {
        const directories = await discoverDirectories(rootDir, filePaths);
        logger.debug(`[empty dirs] Discovered ${directories.length} directories from file paths`);
        emptyDirPaths = await findEmptyDirectories(rootDir, directories, adjustedIgnorePatterns);
      }
    } else {
      // Fallback: use globby with gitignore traversal
      logger.debug('[globby] Starting file search...');

      const baseGlobbyOptions = createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns);

      // Run file search and directory search in parallel when includeEmptyDirectories is enabled.
      // Both globby calls traverse the same directory tree with identical ignore patterns,
      // so running them concurrently lets them share the OS filesystem cache.
      const globby = await getGlobby();

      const fileSearchPromise = globby(includePatterns, {
        ...baseGlobbyOptions,
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

      const emptyDirSearchPromise = config.output.includeEmptyDirectories
        ? globby(includePatterns, {
            ...baseGlobbyOptions,
            onlyDirectories: true,
          }).then((directories) => {
            logger.debug(`[empty dirs] Found ${directories.length} directories`);
            return findEmptyDirectories(rootDir, directories, adjustedIgnorePatterns);
          })
        : Promise.resolve([] as string[]);

      const [globbyFilePaths, globbyEmptyDirPaths] = await Promise.all([fileSearchPromise, emptyDirSearchPromise]);
      filePaths = globbyFilePaths;
      emptyDirPaths = globbyEmptyDirPaths;

      const globbyElapsedTime = Date.now() - searchStartTime;
      logger.debug(
        `[globby] Completed in ${globbyElapsedTime}ms, found ${filePaths.length} files, ${emptyDirPaths.length} empty dirs`,
      );
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
