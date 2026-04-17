import { execFile } from 'node:child_process';
import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Options as GlobbyOptions } from 'globby';
import type ignore from 'ignore';

const execFileAsync = promisify(execFile);

import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { sortPaths } from './filePathSort.js';

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

// Lazy-load globby: its 23-package transitive closure (~20-35ms cold, ~8-15ms warm)
// is never needed when the git ls-files fast path runs (~90% of invocations).
let _globbyPromise: Promise<typeof import('globby')> | null = null;
const getGlobby = (): Promise<typeof import('globby')> => {
  _globbyPromise ??= import('globby');
  return _globbyPromise;
};

// Lazy-load the `ignore` package (~10ms parse) so its cost is absorbed into
// the git ls-files I/O wait rather than blocking the module import chain.
let _ignorePromise: Promise<typeof ignore> | null = null;
const getIgnore = (): Promise<typeof ignore> => {
  _ignorePromise ??= import('ignore').then((m) => m.default);
  return _ignorePromise;
};

export interface FileSearchResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

export interface SearchFilesOptions {
  onPreFilterCandidates?: (candidates: string[]) => void;
}

// No per-directory ignore-pattern check is needed here. The `directories` array
// comes from globby with the same `ignore` patterns (e.g. `dist/**`), which
// excludes both the directory contents AND the directory entry itself.
const findEmptyDirectories = async (rootDir: string, directories: string[]): Promise<string[]> => {
  const emptyDirs: string[] = [];

  for (const dir of directories) {
    const fullPath = path.join(rootDir, dir);
    try {
      const entries = await fs.readdir(fullPath);
      const hasVisibleContents = entries.some((entry) => !entry.startsWith('.'));

      if (!hasVisibleContents) {
        emptyDirs.push(dir);
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

/**
 * Skip ignore patterns that cannot match any file in the git ls-files output.
 * Since git already applies .gitignore, most default patterns are redundant.
 */
const preFilterIgnorePatterns = (patterns: string[], files: string[]): string[] => {
  const pathSegments = new Set<string>();
  const fileExtensions = new Set<string>();
  for (const f of files) {
    for (const p of f.split('/')) {
      pathSegments.add(p);
    }
    const fileName = f.slice(f.lastIndexOf('/') + 1);
    const dotIdx = fileName.lastIndexOf('.');
    if (dotIdx >= 0) {
      fileExtensions.add(fileName.slice(dotIdx + 1));
    }
  }

  return patterns.filter((pattern) => {
    if (pattern.startsWith('!')) return true;

    // Simple extension globs like **/*.log or *.pid → O(1) set check
    const extMatch = pattern.match(/^(?:\*\*\/)?\*\.([a-zA-Z0-9]+)$/);
    if (extMatch) {
      return fileExtensions.has(extMatch[1]);
    }

    // Extract literal path segments (skip wildcards, char classes, braces)
    const cleaned = pattern
      .replace(/^\*\*\//, '')
      .replace(/\/\*\*$/, '')
      .replace(/\/\*\*\//g, '/');
    const segments = cleaned
      .split('/')
      .filter((s) => !s.includes('*') && !s.includes('[') && !s.includes('{') && s.length > 0);

    if (segments.length === 0) return true;
    return segments.some((s) => pathSegments.has(s));
  });
};

interface GitLsFilesResult {
  /** Regular files (mode 100644/100755) from the git index — already verified, no lstat needed. */
  trackedFiles: string[];
  /** Untracked files — still need lstat to verify they are regular files. */
  untrackedFiles: string[];
}

/**
 * Fast file enumeration via two concurrent git commands: `--cached --stage`
 * (tracked files with mode bits) and `--others --exclude-standard` (untracked).
 * Mode bits let us filter symlinks/submodules without lstat syscalls.
 * Returns `null` on failure, signalling the caller to fall back to globby.
 */
const runGitLsFiles = async (rootDir: string): Promise<GitLsFilesResult | null> => {
  try {
    const execOpts = { cwd: rootDir, maxBuffer: 100 * 1024 * 1024, encoding: 'utf-8' as const };
    const [stagedResult, untrackedResult] = await Promise.all([
      execFileAsync('git', ['ls-files', '--cached', '--stage', '-z'], execOpts),
      execFileAsync('git', ['ls-files', '--others', '--exclude-standard', '-z'], execOpts),
    ]);

    const trackedFiles: string[] = [];
    for (const entry of stagedResult.stdout.split('\0')) {
      if (!entry) continue;
      const tabIdx = entry.indexOf('\t');
      if (tabIdx === -1) continue;
      const mode = entry.slice(0, 6);
      if (mode === '100644' || mode === '100755') {
        trackedFiles.push(entry.slice(tabIdx + 1));
      }
    }

    const untrackedFiles = untrackedResult.stdout.split('\0').filter(Boolean);

    return { trackedFiles, untrackedFiles };
  } catch {
    logger.trace('git ls-files failed, falling back to globby');
    return null;
  }
};

// Preload cache for git ls-files results. Allows the CLI to start the git
// subprocess before migration + config loading, so the I/O overlaps with
// the sequential startup work. Each entry is consumed once by searchFiles.
const _gitLsFilesCache = new Map<string, Promise<GitLsFilesResult | null>>();

export const preloadGitLsFiles = (rootDir: string): void => {
  const resolved = path.resolve(rootDir);
  if (!_gitLsFilesCache.has(resolved)) {
    _gitLsFilesCache.set(
      resolved,
      runGitLsFiles(resolved).catch((): null => null),
    );
  }
};

const lstatFilterFiles = async (rootDir: string, files: string[]): Promise<boolean[]> => {
  const LSTAT_BATCH = 512;
  const isFileResults: boolean[] = [];
  for (let i = 0; i < files.length; i += LSTAT_BATCH) {
    const batch = files.slice(i, i + LSTAT_BATCH);
    const results = await Promise.all(
      batch.map(async (f) => {
        try {
          const stat = await fs.lstat(path.join(rootDir, f));
          return stat.isFile();
        } catch {
          return false;
        }
      }),
    );
    isFileResults.push(...results);
  }
  return isFileResults;
};

const buildIgnoreInstance = async (
  rootDir: string,
  files: string[],
  adjustedIgnorePatterns: string[],
  ignoreFilePatterns: string[],
) => {
  const relevantPatterns = preFilterIgnorePatterns(adjustedIgnorePatterns, files);
  const ignoreFactory = await getIgnore();
  const ig = ignoreFactory();
  ig.add(relevantPatterns);

  for (const filePattern of ignoreFilePatterns) {
    const fileName = filePattern.replace(/^\*\*\//, '');
    const matchingFiles = files.filter((f) => f === fileName || f.endsWith(`/${fileName}`));

    for (const ignoreFile of matchingFiles) {
      try {
        const content = await fs.readFile(path.join(rootDir, ignoreFile), 'utf-8');
        const patterns = parseIgnoreContent(content);
        const dir = path.dirname(ignoreFile);

        if (dir === '.') {
          ig.add(patterns);
        } else {
          ig.add(
            patterns.map((p) => {
              if (p.startsWith('!')) return `!${dir}/${p.slice(1)}`;
              if (p.startsWith('/')) return `${dir}${p}`;
              return `${dir}/${p}`;
            }),
          );
        }
      } catch {
        logger.trace(`Could not read ignore file: ${ignoreFile}`);
      }
    }
  }

  return ig;
};

const processGitOutput = async (
  rootDir: string,
  gitResult: GitLsFilesResult,
  includePatterns: string[],
  adjustedIgnorePatterns: string[],
  ignoreFilePatterns: string[],
): Promise<string[]> => {
  // Tracked and untracked are mutually exclusive by git definition — no dedup needed.
  let files = [...gitResult.trackedFiles, ...gitResult.untrackedFiles];
  logger.trace(`git ls-files returned ${files.length} files`);

  const [untrackedIsFile, ig] = await Promise.all([
    lstatFilterFiles(rootDir, gitResult.untrackedFiles),
    buildIgnoreInstance(rootDir, files, adjustedIgnorePatterns, ignoreFilePatterns),
  ]);

  const excludedUntracked = new Set(gitResult.untrackedFiles.filter((_, i) => !untrackedIsFile[i]));
  if (excludedUntracked.size > 0) {
    files = files.filter((f) => !excludedUntracked.has(f));
  }
  files = ig.filter(files);

  const isDefaultInclude = includePatterns.length === 1 && includePatterns[0] === '**/*';
  if (!isDefaultInclude && includePatterns.length > 0) {
    const { Minimatch } = await import('minimatch');
    const matchers = includePatterns.map((p) => new Minimatch(p, { dot: true }));
    files = files.filter((f) => matchers.some((m) => m.match(f)));
  }

  return files;
};

// Get all file paths considering the config
export const searchFiles = async (
  rootDir: string,
  config: RepomixConfigMerged,
  explicitFiles?: string[],
  options?: SearchFilesOptions,
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

  // Start loading the `ignore` package during the git I/O wait below.
  getIgnore();

  // Run permission check, ignore context preparation, and git ls-files concurrently.
  // These are independent I/O operations that were previously sequential (~100-200ms
  // of avoidable wait). Git ls-files reads the pre-built index (~113ms) while
  // prepareIgnoreContext reads .git/info/exclude and checks for worktrees (~50-100ms).
  const canUseGitFastPath = config.ignore.useGitignore && !explicitFiles;
  const resolvedRoot = path.resolve(rootDir);
  const preloaded = _gitLsFilesCache.get(resolvedRoot);
  _gitLsFilesCache.delete(resolvedRoot);
  const [permissionCheck, ignoreContext, gitResult] = await Promise.all([
    checkDirectoryPermissions(rootDir),
    prepareIgnoreContext(rootDir, config),
    canUseGitFastPath ? (preloaded ?? runGitLsFiles(rootDir)) : Promise.resolve(null),
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
    const { adjustedIgnorePatterns, rawIgnorePatterns, ignoreFilePatterns } = ignoreContext;

    logger.trace('Ignore patterns:', adjustedIgnorePatterns);
    logger.trace('Ignore file patterns:', ignoreFilePatterns);

    let includePatterns = config.include.map((pattern) => escapeGlobPattern(pattern));

    if (explicitFiles) {
      if (explicitFiles.length === 0) {
        logger.warn('[stdin mode] No files received from stdin. Will search all files matching include patterns.');
      } else {
        logger.debug(`[stdin mode] Processing ${explicitFiles.length} explicit files`);
        logger.trace('[stdin mode] Explicit files (absolute):', explicitFiles);

        const relativePaths = explicitFiles.map((filePath) => {
          const relativePath = path.relative(rootDir, filePath);
          return escapeGlobPattern(relativePath);
        });

        logger.trace('[stdin mode] Explicit files (relative, escaped):', relativePaths);
        logger.trace('[stdin mode] Include patterns before merge:', includePatterns);

        includePatterns = [...includePatterns, ...relativePaths];

        logger.debug(`[stdin mode] Total include patterns after merge: ${includePatterns.length}`);
      }
    }

    if (includePatterns.length === 0) {
      includePatterns = ['**/*'];
    }

    logger.trace('Include patterns with explicit files:', includePatterns);
    logger.trace('Ignore patterns:', adjustedIgnorePatterns);
    logger.trace('Ignore file patterns (for globby):', ignoreFilePatterns);

    let filePaths: string[] | null = null;

    if (gitResult !== null) {
      // Fires before ignore/include filtering — callers must intersect with the final filePaths.
      if (options?.onPreFilterCandidates) {
        options.onPreFilterCandidates([...gitResult.trackedFiles, ...gitResult.untrackedFiles]);
      }

      const gitStartTime = Date.now();
      const rawIncludePatterns = config.include.length > 0 ? config.include : ['**/*'];
      filePaths = await processGitOutput(rootDir, gitResult, rawIncludePatterns, rawIgnorePatterns, ignoreFilePatterns);
      if (filePaths !== null) {
        const gitElapsedTime = Date.now() - gitStartTime;
        logger.debug(`[git ls-files] Completed in ${gitElapsedTime}ms, found ${filePaths.length} files`);
      }
    }

    if (filePaths === null) {
      logger.debug('[globby] Starting file search...');
      const globbyStartTime = Date.now();

      const { globby } = await getGlobby();
      filePaths = await globby(includePatterns, {
        ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
        onlyFiles: true,
      }).catch((error: unknown) => {
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
    }

    let emptyDirPaths: string[] = [];
    if (config.output.includeEmptyDirectories) {
      logger.debug('[empty dirs] Searching for empty directories...');
      const emptyDirStartTime = Date.now();

      const { globby } = await getGlobby();
      const directories = await globby(includePatterns, {
        ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
        onlyDirectories: true,
      });

      const emptyDirElapsedTime = Date.now() - emptyDirStartTime;
      logger.debug(`[empty dirs] Found ${directories.length} directories in ${emptyDirElapsedTime}ms`);

      const filterStartTime = Date.now();
      emptyDirPaths = await findEmptyDirectories(rootDir, directories);
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
): Promise<{
  adjustedIgnorePatterns: string[];
  rawIgnorePatterns: string[];
  ignoreFilePatterns: string[];
}> => {
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

  // Raw (un-normalized) patterns are used by the git fast path where
  // the `ignore` package applies gitignore semantics directly. The
  // normalizeGlobPattern transform (e.g., `**/foo` → `**/foo/**`) is
  // designed for globby and would break `ignore`-based matching for
  // file-level patterns like `**/package-lock.json`.
  const rawIgnorePatterns = [...ignorePatterns];
  if (isWorktree) {
    const gitIndex = rawIgnorePatterns.indexOf('.git/**');
    if (gitIndex !== -1) {
      rawIgnorePatterns.splice(gitIndex, 1);
      rawIgnorePatterns.push('.git');
    }
  }

  return { adjustedIgnorePatterns, rawIgnorePatterns, ignoreFilePatterns };
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

  const { globby } = await getGlobby();
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

  const { globby } = await getGlobby();
  const files = await globby(['**/*'], {
    ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
    onlyFiles: true,
  });

  return sortPaths(files);
};

/**
 * Searches for empty directories in the given root directory.
 * Intended to be called separately from searchFiles so the caller can run it
 * concurrently with file collection, keeping the empty-dir globby scan off the
 * critical path of the main pipeline.
 *
 * Uses a lightweight recursive fs.readdir walk with the `ignore` package
 * instead of globby. This avoids loading globby's 23-package module graph
 * (~35ms cold import) and the slower fast-glob filesystem walk, reducing
 * wall time from ~140ms to ~20ms for a 1000-file repository.
 *
 * Falls back to globby when include patterns are specified (non-default),
 * since glob matching for include patterns requires picomatch/minimatch
 * semantics that `ignore` doesn't provide for positive matching.
 */
export const searchEmptyDirectories = async (rootDir: string, config: RepomixConfigMerged): Promise<string[]> => {
  const { adjustedIgnorePatterns, rawIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(rootDir, config);

  // Fall back to globby when include patterns are specified, since the fast
  // path only handles the default "all files" case.
  const hasIncludePatterns = config.include.length > 0;
  if (hasIncludePatterns) {
    const includePatterns = config.include.map((pattern) => escapeGlobPattern(pattern));
    const { globby } = await getGlobby();
    const directories = await globby(includePatterns, {
      ...createBaseGlobbyOptions(rootDir, config, adjustedIgnorePatterns, ignoreFilePatterns),
      onlyDirectories: true,
    });
    return findEmptyDirectories(rootDir, directories);
  }

  // Build the list of ignore file names to read during the walk.
  // When useGitignore is enabled, also read .gitignore files so the fast
  // path matches globby's gitignore enforcement (globby reads .gitignore
  // via its `gitignore: true` option, which the fast path doesn't use).
  const walkIgnoreFileNames = ignoreFilePatterns.map((p) => p.replace(/^\*\*\//, ''));
  if (config.ignore.useGitignore) {
    walkIgnoreFileNames.push('.gitignore');
  }

  return searchEmptyDirectoriesFast(rootDir, rawIgnorePatterns, walkIgnoreFileNames);
};

/**
 * Fast empty directory scan using recursive fs.readdir + the `ignore` package.
 *
 * Walks the directory tree in parallel (Promise.all at each level), skipping
 * ignored directories. At each directory, checks if any entry is non-hidden
 * (same logic as findEmptyDirectories). Reads .gitignore / .repomixignore /
 * .ignore files encountered during the walk and adds their patterns scoped
 * to the directory, matching globby's ignore file semantics.
 */
const searchEmptyDirectoriesFast = async (
  rootDir: string,
  ignorePatterns: string[],
  ignoreFileNames: string[],
): Promise<string[]> => {
  const ignoreFactory = await getIgnore();
  const ig = ignoreFactory();
  ig.add(ignorePatterns);

  const emptyDirs: string[] = [];

  const walkDir = async (relPath: string): Promise<void> => {
    // Check if this directory path is ignored
    if (relPath && ig.ignores(`${relPath}/`)) return;

    const fullPath = relPath ? path.join(rootDir, relPath) : rootDir;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(fullPath, { withFileTypes: true });
    } catch {
      return;
    }

    // Read any ignore files (.repomixignore, .ignore) present in this directory
    // and add their patterns scoped to this directory path.
    for (const ignoreFileName of ignoreFileNames) {
      if (entries.some((e) => e.name === ignoreFileName && !e.isDirectory())) {
        try {
          const content = await fs.readFile(path.join(fullPath, ignoreFileName), 'utf-8');
          const patterns = parseIgnoreContent(content);
          if (patterns.length > 0) {
            if (!relPath) {
              // Root-level ignore file: patterns apply from root
              ig.add(patterns);
            } else {
              // Nested ignore file: scope patterns to its directory
              ig.add(
                patterns.map((p) => {
                  const isNegated = p.startsWith('!');
                  const pattern = isNegated ? p.slice(1) : p;
                  const prefix = isNegated ? '!' : '';
                  if (pattern.startsWith('/')) return `${prefix}${relPath}${pattern}`;
                  return `${prefix}${relPath}/${pattern}`;
                }),
              );
            }
          }
        } catch {
          // Ignore file unreadable — skip silently
        }
      }
    }

    // A directory is "empty" if it has no non-hidden entries
    const hasVisibleContent = entries.some((e) => !e.name.startsWith('.'));
    if (!hasVisibleContent && relPath) {
      emptyDirs.push(relPath);
    }

    // Recurse into subdirectories in parallel.
    // Include hidden directories (e.g., .claude/) since they may contain
    // empty subdirectories that should appear in the tree.
    const subdirPromises: Promise<void>[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childPath = relPath ? `${relPath}/${entry.name}` : entry.name;
        subdirPromises.push(walkDir(childPath));
      }
    }
    if (subdirPromises.length > 0) {
      await Promise.all(subdirPromises);
    }
  };

  await walkDir('');
  return emptyDirs.sort();
};
