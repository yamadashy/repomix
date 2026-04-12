import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import ignoreLib from 'ignore';
import { minimatch } from 'minimatch';
import { glob as tinyGlob } from 'tinyglobby';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { sortPaths } from './filePathSort.js';

import { checkDirectoryPermissions, PermissionError } from './permissionCheck.js';

// Lazy-load globby — only needed for listDirectories/listFiles (full-tree mode).
// searchFiles uses tinyglobby instead, which is ~3-4× faster because fdir
// (tinyglobby's directory walker) is significantly faster than fast-glob's walker.
let globbyModule: typeof import('globby') | undefined;
const getGlobby = async () => {
  if (!globbyModule) {
    globbyModule = await import('globby');
  }
  return globbyModule.globby;
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
  // Dispatch all readdirs concurrently via libuv's thread pool; this turns the
  // O(N) sequential stat-per-directory scan (~0.1ms each) into a single round
  // of parallel I/O, which is meaningful on repos with hundreds of directories.
  // Preserves the input order of `directories` since the for-loop below walks
  // the results in the same order as the input array.
  const readdirResults = await Promise.all(
    directories.map((dir) =>
      fs
        .readdir(path.join(rootDir, dir))
        .then((entries) => ({ dir, entries }))
        .catch((error: unknown) => {
          logger.debug(`Error checking directory ${dir}:`, error);
          return { dir, entries: null as string[] | null };
        }),
    ),
  );

  const emptyDirs: string[] = [];
  for (const { dir, entries } of readdirResults) {
    if (entries === null) continue;
    const hasVisibleContents = entries.some((entry) => !entry.startsWith('.'));
    if (hasVisibleContents) continue;

    // This checks if the directory itself matches any ignore patterns
    const shouldIgnore = ignorePatterns.some((pattern) => minimatch(dir, pattern) || minimatch(`${dir}/`, pattern));
    if (!shouldIgnore) {
      emptyDirs.push(dir);
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
 * Builds a filter function from nested gitignore/repomixignore/dotignore files.
 *
 * Discovers ignore files via a separate tinyglobby traversal that is independent
 * of the user's include patterns. This ensures that ignore files are always found
 * even when the include patterns would not match them (e.g. --include with .ts
 * patterns would not find .gitignore files). The traversal is fast because fdir
 * skips already-ignored directories and the FS cache is warm from the main traversal.
 */
const buildIgnoreFilter = async (
  rootDir: string,
  ignorePatterns: string[],
  config: RepomixConfigMerged,
): Promise<((filePath: string) => boolean) | null> => {
  // Build glob patterns for the ignore files we need to discover
  const ignoreFileGlobs: string[] = [];
  ignoreFileGlobs.push('**/.repomixignore');
  if (config.ignore.useGitignore) {
    ignoreFileGlobs.push('**/.gitignore');
  }
  if (config.ignore.useDotIgnore) {
    ignoreFileGlobs.push('**/.ignore');
  }

  // Discover ignore files via a separate traversal that is independent of the
  // user's include patterns. This is critical: `--include '**/*.ts'` must still
  // respect .gitignore rules, but tinyglobby only returns files matching the
  // include patterns. This dedicated traversal finds all ignore files regardless.
  const ignoreFilePaths = await tinyGlob(ignoreFileGlobs, {
    cwd: rootDir,
    ignore: ignorePatterns,
    onlyFiles: true,
    dot: true,
    absolute: false,
    followSymbolicLinks: false,
  });

  // Read discovered ignore files in parallel.
  // Note: .git/info/exclude is NOT read here because its patterns are already
  // included in adjustedIgnorePatterns (via getIgnorePatterns) and applied at
  // the tinyglobby traversal level. Reading it again would be redundant.
  const readPromises: Promise<{ dir: string; content: string } | null>[] = ignoreFilePaths.map((fp) =>
    fs
      .readFile(path.join(rootDir, fp), 'utf8')
      .then((content) => (content ? { dir: path.dirname(fp), content } : null))
      .catch(() => null),
  );

  const results = (await Promise.all(readPromises)).filter((r): r is { dir: string; content: string } => r !== null);

  if (results.length === 0) return null;

  // Build per-directory ignore instances
  const dirIgnores = new Map<string, ReturnType<typeof ignoreLib>>();
  for (const { dir, content } of results) {
    const key = dir === '.' ? '' : dir;
    if (!dirIgnores.has(key)) {
      dirIgnores.set(key, ignoreLib());
    }
    dirIgnores.get(key)!.add(content);
  }

  return (filePath: string) => {
    if (!filePath) return false;

    // Check root ignore patterns
    const rootIg = dirIgnores.get('');
    if (rootIg && rootIg.ignores(filePath)) return true;

    // Check nested ignore patterns scoped to their directories
    const segments = filePath.split('/');
    let currentDir = '';
    for (let i = 0; i < segments.length - 1; i++) {
      currentDir = currentDir ? `${currentDir}/${segments[i]}` : segments[i];
      const ig = dirIgnores.get(currentDir);
      if (ig) {
        const relativePath = segments.slice(i + 1).join('/');
        if (relativePath && ig.ignores(relativePath)) return true;
      }
    }

    return false;
  };
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
    logger.trace('Ignore file patterns:', ignoreFilePatterns);

    logger.debug('[search] Starting file search...');
    const searchStartTime = Date.now();

    // Use tinyglobby for all search paths. tinyglobby uses fdir for directory
    // walking, which is ~3-4× faster than globby's fast-glob walker.
    // Gitignore/repomixignore/dotignore patterns are handled via the `ignore`
    // npm package as a post-filter instead of globby's built-in gitignore
    // support. This is correct because the `ignore` package implements the
    // full gitignore spec (directory patterns, negation, scoping).
    const needDirectoryEntries = config.output.includeEmptyDirectories;
    let filePaths: string[];
    const directories: string[] = [];

    const tinyGlobOptions = {
      cwd: rootDir,
      ignore: adjustedIgnorePatterns,
      dot: true,
      absolute: false,
      followSymbolicLinks: false,
    };

    try {
      // Build the gitignore/repomixignore/dotignore filter first. This runs a
      // separate tinyglobby traversal for ignore files (e.g. **/.gitignore)
      // independent of the user's include patterns, so `--include '**/*.ts'`
      // still respects .gitignore rules even though .gitignore doesn't match
      // '**/*.ts'. The traversal is fast (~2-5ms) because fdir skips ignored
      // directories and the FS cache is warm from subsequent main traversals.
      const ignoreFilter = await buildIgnoreFilter(rootDir, adjustedIgnorePatterns, config);

      if (needDirectoryEntries) {
        // Run file and directory searches in parallel — two tinyglobby traversals
        // are still faster than one globby objectMode traversal because fdir's
        // walker is ~3-4× faster, and the FS cache is warm for the second call.
        const [rawFiles, rawDirs] = await Promise.all([
          tinyGlob(includePatterns, { ...tinyGlobOptions, onlyFiles: true }),
          tinyGlob(includePatterns, { ...tinyGlobOptions, onlyDirectories: true }),
        ]);

        if (ignoreFilter) {
          filePaths = rawFiles.filter((fp) => !ignoreFilter(fp));
          for (const fp of rawDirs) {
            if (!ignoreFilter(fp)) directories.push(fp);
          }
        } else {
          filePaths = rawFiles;
          directories.push(...rawDirs);
        }
      } else {
        // Simple file-only search
        const rawFiles = await tinyGlob(includePatterns, { ...tinyGlobOptions, onlyFiles: true });
        filePaths = ignoreFilter ? rawFiles.filter((fp) => !ignoreFilter(fp)) : rawFiles;
      }
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException | { code?: string })?.code;
      if (code === 'EPERM' || code === 'EACCES') {
        throw new PermissionError(
          `Permission denied while scanning directory. Please check folder access permissions for your terminal app. path: ${rootDir}`,
          rootDir,
        );
      }
      throw error;
    }

    const searchElapsedTime = Date.now() - searchStartTime;
    logger.debug(
      `[search] Completed in ${searchElapsedTime}ms, found ${filePaths.length} files` +
        (needDirectoryEntries ? ` and ${directories.length} directories` : ''),
    );

    let emptyDirPaths: string[] = [];
    if (needDirectoryEntries) {
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
 * Only used for listDirectories/listFiles (full-tree mode, non-default path).
 */
const createBaseGlobbyOptions = (
  rootDir: string,
  config: RepomixConfigMerged,
  ignorePatterns: string[],
  ignoreFilePatterns: string[],
) => ({
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
