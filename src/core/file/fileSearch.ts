import { execFileSync } from 'node:child_process';
import type { Stats } from 'node:fs';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type ignoreType from 'ignore';
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

// Lazy-load tinyglobby (~10ms) and ignore (~4ms). These are only used inside
// searchFiles/buildIgnoreFilter which run during pack(), not at module load time.
// Deferring them removes ~14ms from the defaultAction.ts import chain.
// Cache the Promise (not the resolved value) to ensure only one dynamic import
// is initiated even when multiple concurrent callers (e.g., multi-root
// Promise.all in searchFiles) race on the first invocation.
let _tinyGlobPromise: Promise<typeof import('tinyglobby').glob> | undefined;
const getTinyGlob = () => {
  if (!_tinyGlobPromise) {
    _tinyGlobPromise = import('tinyglobby').then((m) => m.glob);
  }
  return _tinyGlobPromise;
};

let _ignoreLibPromise: Promise<typeof ignoreType> | undefined;
const getIgnoreLib = () => {
  if (!_ignoreLibPromise) {
    _ignoreLibPromise = import('ignore').then((m) => m.default);
  }
  return _ignoreLibPromise;
};

export interface FileSearchResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

const findEmptyDirectories = async (rootDir: string, directories: string[]): Promise<string[]> => {
  // Dispatch all readdirs concurrently via libuv's thread pool; this turns the
  // O(N) sequential stat-per-directory scan (~0.1ms each) into a single round
  // of parallel I/O, which is meaningful on repos with hundreds of directories.
  // Preserves the input order of `directories` since the for-loop below walks
  // the results in the same order as the input array.
  //
  // No per-directory ignore-pattern re-check is needed here. The `directories`
  // array was already filtered by both tinyglobby's `ignore` option (which uses
  // the same adjustedIgnorePatterns) and the .gitignore/.repomixignore post-filter.
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
    if (!hasVisibleContents) {
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
 * Determine which ignore-file basenames to look for given the current config.
 */
const getIgnoreFileBaseNames = (config: RepomixConfigMerged): Set<string> => {
  const names = new Set<string>(['.repomixignore']);
  if (config.ignore.useGitignore) names.add('.gitignore');
  if (config.ignore.useDotIgnore) names.add('.ignore');
  return names;
};

/**
 * Extract ignore-file paths from an already-discovered file list.
 * This is an O(n) string scan, replacing a separate tinyglobby traversal
 * (~15-20 ms) when the main glob already matched ignore files (i.e. when
 * include patterns are the default `['**​/*']`).
 */
const extractIgnoreFilePaths = (allFiles: string[], baseNames: Set<string>): string[] => {
  const result: string[] = [];
  for (const fp of allFiles) {
    // Fast basename extraction without path.basename overhead
    const lastSlash = fp.lastIndexOf('/');
    const base = lastSlash === -1 ? fp : fp.slice(lastSlash + 1);
    if (baseNames.has(base)) {
      result.push(fp);
    }
  }
  return result;
};

const buildIgnoreFilter = async (
  rootDir: string,
  ignorePatterns: string[],
  config: RepomixConfigMerged,
  preDiscoveredFiles?: string[],
): Promise<((filePath: string) => boolean) | null> => {
  let ignoreFilePaths: string[];

  if (preDiscoveredFiles) {
    // Fast path: extract ignore files from the main glob results (~0.1 ms)
    // instead of running a separate tinyglobby traversal (~15-20 ms).
    ignoreFilePaths = extractIgnoreFilePaths(preDiscoveredFiles, getIgnoreFileBaseNames(config));
  } else {
    // Slow path: custom include patterns may not match ignore files, so we
    // need a dedicated traversal. This is critical: `--include '**/*.ts'`
    // must still respect .gitignore rules, but tinyglobby only returns files
    // matching the include patterns.
    const ignoreFileGlobs: string[] = [];
    ignoreFileGlobs.push('**/.repomixignore');
    if (config.ignore.useGitignore) {
      ignoreFileGlobs.push('**/.gitignore');
    }
    if (config.ignore.useDotIgnore) {
      ignoreFileGlobs.push('**/.ignore');
    }

    const tinyGlob = await getTinyGlob();
    ignoreFilePaths = await tinyGlob(ignoreFileGlobs, {
      cwd: rootDir,
      ignore: ignorePatterns,
      onlyFiles: true,
      dot: true,
      absolute: false,
      followSymbolicLinks: false,
    });
  }

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
  const ignoreLib = await getIgnoreLib();
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

/**
 * Fast path: use `git ls-files` to enumerate files instead of directory traversal.
 *
 * `git ls-files --cached --others --exclude-standard` reads from the git index
 * (a single pre-built file) and respects all .gitignore rules, which is ~5ms vs
 * ~80-160ms for fdir directory traversal + picomatch ignore matching. Repomix
 * ignore patterns (defaultIgnoreList, custom patterns, .repomixignore) are applied
 * as a post-filter since git doesn't know about them.
 *
 * The `--stage` flag provides file modes, allowing symlinks (120000) and gitlinks
 * (160000) to be filtered without per-file lstat calls. Untracked files (from
 * `--others`) lack mode info and are checked with lstatSync.
 *
 * Returns null when git is not available or the fast path is not applicable,
 * signalling the caller to fall back to the tinyglobby traversal.
 */
const tryGitLsFilesFastPath = (rootDir: string, rawIgnorePatterns: string[]): string[] | null => {
  try {
    const gitOutput = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--stage', '-z'], {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const entries = gitOutput.split('\0');
    const filePaths: string[] = [];

    for (const entry of entries) {
      if (!entry) continue;

      const tabIdx = entry.indexOf('\t');
      if (tabIdx === -1) {
        // Untracked file (from --others): no mode info, check with lstat
        try {
          if (fsSync.lstatSync(path.join(rootDir, entry)).isFile()) {
            filePaths.push(entry);
          }
        } catch {
          // skip inaccessible files
        }
      } else {
        // Tracked file: mode is first 6 chars
        // 100644/100755 = regular file, 120000 = symlink, 160000 = gitlink
        const mode = entry.substring(0, 6);
        if (mode === '100644' || mode === '100755') {
          filePaths.push(entry.substring(tabIdx + 1));
        }
      }
    }

    // Apply repomix ignore patterns as a post-filter.
    // splitIgnorePatterns separates patterns into directory patterns (picomatch)
    // and file-level patterns (Set lookups), matching the tinyglobby code path.
    const { directoryPatterns, fileFilter: fileIgnoreFilter } = splitIgnorePatterns(rawIgnorePatterns);

    // picomatch is already loaded by tinyglobby's fdir dependency, so this
    // require resolves from the module cache without any I/O or parsing cost.
    const cjsRequire = createRequire(import.meta.url);
    const picomatchFn = cjsRequire('picomatch') as (
      patterns: string[],
      options?: Record<string, unknown>,
    ) => (str: string) => boolean;
    const normalizedDirPatterns = directoryPatterns.map(normalizeGlobPattern);
    const dirMatcher = picomatchFn(normalizedDirPatterns, { dot: true });

    let filtered = filePaths.filter((f) => !dirMatcher(f));
    if (fileIgnoreFilter) {
      filtered = filtered.filter((f) => !fileIgnoreFilter(f));
    }

    // Apply .repomixignore patterns (root-level only — the common case).
    // Nested .repomixignore files are rare; if present, the tinyglobby path
    // handles them via buildIgnoreFilter. For the fast path, root-level
    // coverage is sufficient because the vast majority of repos only have
    // a root .repomixignore.
    try {
      const repomixIgnoreContent = fsSync.readFileSync(path.join(rootDir, '.repomixignore'), 'utf8');
      if (repomixIgnoreContent) {
        const ignoreFactory = (cjsRequire('ignore') as { default: typeof ignoreType }).default;
        const ig = ignoreFactory();
        ig.add(repomixIgnoreContent);
        filtered = filtered.filter((f) => !ig.ignores(f));
      }
    } catch {
      // No .repomixignore — nothing to filter
    }

    logger.debug(`[search] git ls-files fast path: ${filePaths.length} entries → ${filtered.length} files`);
    return filtered;
  } catch {
    // git not available or not a git repo — fall back to tinyglobby
    logger.debug('[search] git ls-files fast path unavailable, falling back to directory traversal');
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
    const { adjustedIgnorePatterns, rawIgnorePatterns, ignoreFilePatterns } = await prepareIgnoreContext(
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

    logger.trace('Include patterns with explicit files:', includePatterns);
    logger.trace('Ignore patterns:', adjustedIgnorePatterns);
    logger.trace('Ignore file patterns:', ignoreFilePatterns);

    logger.debug('[search] Starting file search...');
    const searchStartTime = Date.now();

    // Fast path: use `git ls-files` when possible. Reading the git index is
    // ~5ms vs ~80-160ms for fdir directory traversal, because git maintains a
    // pre-built sorted list of tracked files and handles .gitignore natively
    // in C. The fast path is used when:
    //  - include patterns are the default wildcard (no custom --include)
    //  - no explicit files from stdin
    //  - useGitignore is enabled (git ls-files --exclude-standard applies
    //    .gitignore; if disabled, we need tinyglobby to include gitignored files)
    //  - useDotIgnore is disabled (the fast path does not read .ignore files)
    // These conditions cover the vast majority of CLI invocations.
    const isDefaultInclude = includePatterns.length === 1 && includePatterns[0] === '**/*';
    const needDirectoryEntries = config.output.includeEmptyDirectories;
    const canUseGitFastPath =
      isDefaultInclude &&
      !explicitFiles &&
      config.ignore.useGitignore !== false &&
      !config.ignore.useDotIgnore;
    if (canUseGitFastPath) {
      const gitFiles = tryGitLsFilesFastPath(rootDir, rawIgnorePatterns);
      if (gitFiles !== null) {
        let emptyDirPaths: string[] = [];
        if (needDirectoryEntries) {
          // Extract all directories from the git file paths and run the
          // empty-directory check. This avoids a separate tinyglobby directory
          // traversal (~60ms) by deriving directories from the already-known
          // file list in O(n) time (~1ms for 1000 files).
          const dirSet = new Set<string>();
          for (const f of gitFiles) {
            let idx = f.indexOf('/');
            while (idx !== -1) {
              dirSet.add(f.substring(0, idx));
              idx = f.indexOf('/', idx + 1);
            }
          }
          const directories = Array.from(dirSet);
          emptyDirPaths = await findEmptyDirectories(rootDir, directories);
        }

        const searchElapsedTime = Date.now() - searchStartTime;
        logger.debug(
          `[search] Completed via git ls-files in ${searchElapsedTime}ms, found ${gitFiles.length} files` +
            (needDirectoryEntries ? ` and ${emptyDirPaths.length} empty directories` : ''),
        );
        return {
          filePaths: sortPaths(gitFiles),
          emptyDirPaths: sortPaths(emptyDirPaths),
        };
      }
    }

    // Use tinyglobby for all search paths. tinyglobby uses fdir for directory
    // walking, which is ~3-4× faster than globby's fast-glob walker.
    // Gitignore/repomixignore/dotignore patterns are handled via the `ignore`
    // npm package as a post-filter instead of globby's built-in gitignore
    // support. This is correct because the `ignore` package implements the
    // full gitignore spec (directory patterns, negation, scoping).
    const tinyGlob = await getTinyGlob();
    let filePaths: string[];
    const directories: string[] = [];

    // Split ignore patterns: directory patterns (e.g. '**/node_modules/**')
    // go to tinyglobby for efficient subtree pruning via fdir; file-level
    // patterns (e.g. '**/*.log', '**/package-lock.json') are applied as a
    // fast post-filter using Set lookups instead of picomatch regex tests.
    // This saves ~11ms on the default 86-pattern ignore list by eliminating
    // ~42 picomatch tests per file (~1000 files × 42 patterns).
    //
    // Must use raw (pre-normalized) patterns because normalizeGlobPattern
    // converts file patterns like **/*.log to **/*.log/** which would cause
    // splitIgnorePatterns to misclassify them as directory patterns.
    const { directoryPatterns, fileFilter: fileIgnoreFilter } = splitIgnorePatterns(rawIgnorePatterns);
    // Normalize directory patterns for consistent glob behavior (e.g.
    // **/folder → **/folder/** for user-provided bare directory names)
    const globIgnorePatterns = directoryPatterns.map(normalizeGlobPattern);

    const tinyGlobOptions = {
      cwd: rootDir,
      ignore: globIgnorePatterns,
      dot: true,
      absolute: false,
      followSymbolicLinks: false,
    };

    // When include patterns are the default wildcard ('**/*'), the main glob
    // already returns every file including .gitignore/.repomixignore/.ignore.
    // We can extract ignore files directly from the results (~0.1 ms) instead
    // of running a dedicated tinyglobby traversal (~15-20 ms), saving one
    // full directory walk on the critical path.
    // For custom include patterns (e.g. '**/*.ts'), the main glob won't match
    // ignore files, so a separate traversal is still necessary.

    try {
      if (needDirectoryEntries) {
        // Build the ignore filter first when using custom includes, or defer
        // to post-extraction when using the default wildcard.
        const ignoreFilterBeforeGlob = isDefaultInclude
          ? null
          : await buildIgnoreFilter(rootDir, adjustedIgnorePatterns, config);

        const [rawFiles, rawDirs] = await Promise.all([
          tinyGlob(includePatterns, { ...tinyGlobOptions, onlyFiles: true }),
          tinyGlob(includePatterns, { ...tinyGlobOptions, onlyDirectories: true }),
        ]);

        // Build the ignore filter from the main results when possible
        const ignoreFilter =
          ignoreFilterBeforeGlob ?? (await buildIgnoreFilter(rootDir, adjustedIgnorePatterns, config, rawFiles));

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

        // Build ignore filter — fast path extracts from rawFiles for default includes
        const ignoreFilter = isDefaultInclude
          ? await buildIgnoreFilter(rootDir, adjustedIgnorePatterns, config, rawFiles)
          : await buildIgnoreFilter(rootDir, adjustedIgnorePatterns, config);

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

    // Apply file-level ignore patterns (extensions, exact basenames) that
    // were split out of the glob ignore list for faster matching via Set
    // lookups instead of per-file picomatch regex tests.
    if (fileIgnoreFilter) {
      filePaths = filePaths.filter((fp) => !fileIgnoreFilter(fp));
    }

    const searchElapsedTime = Date.now() - searchStartTime;
    logger.debug(
      `[search] Completed in ${searchElapsedTime}ms, found ${filePaths.length} files` +
        (needDirectoryEntries ? ` and ${directories.length} directories` : ''),
    );

    let emptyDirPaths: string[] = [];
    if (needDirectoryEntries) {
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
): Promise<{ adjustedIgnorePatterns: string[]; rawIgnorePatterns: string[]; ignoreFilePatterns: string[] }> => {
  const [ignorePatterns, ignoreFilePatterns] = await Promise.all([
    getIgnorePatterns(rootDir, config),
    getIgnoreFilePatterns(config),
  ]);

  // Normalize ignore patterns to handle trailing slashes consistently
  const normalizedIgnorePatterns = ignorePatterns.map(normalizeGlobPattern);

  // Check if .git is a worktree reference
  const gitPath = path.join(rootDir, '.git');
  const isWorktree = await isGitWorktreeRef(gitPath);

  // Apply worktree adjustment to both normalized and raw pattern sets.
  // The raw (pre-normalized) patterns are needed by splitIgnorePatterns
  // because normalizeGlobPattern converts file patterns like **/*.log to
  // **/*.log/** which would incorrectly classify them as directory patterns.
  const adjustedIgnorePatterns = [...normalizedIgnorePatterns];
  const rawIgnorePatterns = [...ignorePatterns];
  if (isWorktree) {
    // Remove '.git/**' pattern and add '.git' to ignore the reference file
    for (const arr of [adjustedIgnorePatterns, rawIgnorePatterns]) {
      const gitIndex = arr.indexOf('.git/**');
      if (gitIndex !== -1) {
        arr.splice(gitIndex, 1);
        arr.push('.git');
      }
    }
  }

  return { adjustedIgnorePatterns, rawIgnorePatterns, ignoreFilePatterns };
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

/**
 * Splits ignore patterns into directory-level patterns (passed to the glob
 * engine for efficient subtree pruning) and file-level patterns (applied as
 * a fast post-filter using Set lookups).
 *
 * Directory patterns (e.g. `** /node_modules/**`, `dist/**`) let fdir skip
 * entire subtrees — very efficient. File patterns (e.g. `** /*.log`,
 * `** /package-lock.json`) only match individual files, but still force
 * picomatch to test every discovered file against each pattern. Moving them
 * to a post-filter using Set lookups (~100× faster per test) saves ~11 ms
 * for the default 86-pattern ignore list on a 1 000-file repo.
 */
export const splitIgnorePatterns = (
  patterns: string[],
): {
  directoryPatterns: string[];
  fileFilter: ((filePath: string) => boolean) | null;
} => {
  const directoryPatterns: string[] = [];

  const globalExts = new Set<string>();
  const globalBasenames = new Set<string>();
  const prefixes: { prefix: string; global: boolean }[] = [];

  for (const pattern of patterns) {
    // Directory patterns enable subtree pruning in fdir
    if (pattern.endsWith('/**')) {
      directoryPatterns.push(pattern);
      continue;
    }

    const isGlobal = pattern.startsWith('**/');
    const clean = isGlobal ? pattern.slice(3) : pattern;

    // Simple extension: **/*.ext goes to the fast filter. Root-level *.ext
    // stays in glob patterns — there are only a few and tinyglobby handles
    // them efficiently alongside directory patterns.
    const extMatch = clean.match(/^\*\.([a-zA-Z0-9]+)$/);
    if (extMatch) {
      if (isGlobal) {
        globalExts.add(`.${extMatch[1]}`);
      } else {
        directoryPatterns.push(pattern);
      }
      continue;
    }

    // Exact filename without wildcards: **/name goes to the fast filter.
    // Root-level bare names (e.g. '.env', '.git') stay in glob patterns —
    // there are only a few, they may refer to directories, and tinyglobby
    // handles them as efficiently as any ignore entry.
    if (!/[*[{?]/.test(clean)) {
      if (isGlobal) {
        globalBasenames.add(clean);
      } else {
        directoryPatterns.push(pattern);
      }
      continue;
    }

    // Prefix pattern: name* or **/name*  (no other wildcards before the trailing *)
    const prefixMatch = clean.match(/^([^*[{?]+)\*$/);
    if (prefixMatch) {
      prefixes.push({ prefix: prefixMatch[1], global: isGlobal });
      continue;
    }

    // Complex pattern (char classes, multi-wildcards): fall back to picomatch
    directoryPatterns.push(pattern);
  }

  const hasFilePatterns = globalExts.size > 0 || globalBasenames.size > 0 || prefixes.length > 0;

  if (!hasFilePatterns) {
    return { directoryPatterns, fileFilter: null };
  }

  const fileFilter = (filePath: string): boolean => {
    const lastSlash = filePath.lastIndexOf('/');
    const basename = lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1);

    const lastDot = basename.lastIndexOf('.');
    const ext = lastDot !== -1 ? basename.slice(lastDot) : '';

    if (globalExts.has(ext)) return true;
    if (globalBasenames.has(basename)) return true;

    for (const { prefix, global: isGlobalPrefix } of prefixes) {
      if (isGlobalPrefix || lastSlash === -1) {
        if (basename.startsWith(prefix)) return true;
      }
    }

    return false;
  };

  return { directoryPatterns, fileFilter };
};

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
