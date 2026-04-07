import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { minimatch } from 'minimatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { logger } from '../../shared/logger.js';
import { escapeGlobPattern, parseIgnoreContent } from './fileSearch.js';

const execFileAsync = promisify(execFile);

/**
 * Fast file search using `git ls-files` for git repositories.
 * Falls back to null if the directory is not a git repo or git is unavailable.
 *
 * This avoids the expensive filesystem walk that globby performs (~150ms)
 * by reading from the git index (~5ms), then applying repomix-specific
 * ignore patterns with minimatch.
 */
export const searchFilesGit = async (
  rootDir: string,
  config: RepomixConfigMerged,
  deps = { execFileAsync, readFile: fs.readFile },
): Promise<string[] | null> => {
  try {
    // Get all non-gitignored files (tracked + untracked).
    // Use two calls: --stage for tracked files (includes file mode to detect symlinks)
    // and --others for untracked files.
    const [stagedResult, othersResult] = await Promise.all([
      deps.execFileAsync('git', ['-C', rootDir, 'ls-files', '--stage', '-z'], {
        maxBuffer: 50 * 1024 * 1024,
      }),
      deps.execFileAsync('git', ['-C', rootDir, 'ls-files', '--others', '--exclude-standard', '-z'], {
        maxBuffer: 50 * 1024 * 1024,
      }),
    ]);

    // Parse staged entries: format is "mode hash stage\tpath"
    // Filter out symlinks (mode 120000)
    const stagedEntries = stagedResult.stdout.split('\0').filter(Boolean);
    const trackedFiles: string[] = [];
    for (const entry of stagedEntries) {
      const tabIdx = entry.indexOf('\t');
      if (tabIdx === -1) continue;
      const mode = entry.substring(0, 6);
      if (mode === '120000') continue; // Skip symlinks
      trackedFiles.push(entry.substring(tabIdx + 1));
    }

    // Untracked files from --others are regular files (git doesn't track untracked symlinks)
    const untrackedFiles = othersResult.stdout.split('\0').filter(Boolean);

    // Combine and deduplicate
    let filePaths = [...new Set([...trackedFiles, ...untrackedFiles])];

    logger.debug(
      `[git ls-files] Found ${filePaths.length} files (${trackedFiles.length} tracked, ${untrackedFiles.length} untracked)`,
    );

    // Collect all ignore patterns to apply
    const allIgnorePatterns: string[] = [];

    if (config.ignore.useDefaultPatterns) {
      allIgnorePatterns.push(...defaultIgnoreList);
    }

    if (config.ignore.customPatterns) {
      allIgnorePatterns.push(...config.ignore.customPatterns);
    }

    // Exclude the output file path
    if (config.output.filePath) {
      const absoluteOutputPath = path.resolve(config.cwd, config.output.filePath);
      const relativeToTargetPath = path.relative(rootDir, absoluteOutputPath);
      allIgnorePatterns.push(relativeToTargetPath);
    }

    // Read .repomixignore files (root + nested)
    const repomixignorePatterns = await readIgnoreFilePatternsFromList(rootDir, filePaths, '.repomixignore', deps);
    allIgnorePatterns.push(...repomixignorePatterns);

    // Read .ignore files if enabled
    if (config.ignore.useDotIgnore) {
      const dotIgnorePatterns = await readIgnoreFilePatternsFromList(rootDir, filePaths, '.ignore', deps);
      allIgnorePatterns.push(...dotIgnorePatterns);
    }

    // Handle git worktree .git reference file vs regular .git directory
    const gitPath = path.join(rootDir, '.git');
    const isWorktree = await isGitWorktreeRef(gitPath, deps);
    if (isWorktree) {
      allIgnorePatterns.push('.git');
    } else {
      allIgnorePatterns.push('.git/**');
    }

    // Apply ignore patterns using pre-compiled regexes for performance.
    // For directory-like patterns (no file extension wildcard), also add pattern/**
    // to match gitignore-style directory matching where "dirname" matches all contents.
    if (allIgnorePatterns.length > 0) {
      const ignoreRegexes: RegExp[] = [];
      for (const pattern of allIgnorePatterns) {
        const re = minimatch.makeRe(pattern, { dot: true });
        if (re) ignoreRegexes.push(re);
        // Patterns containing "*." (e.g., "*.log", "**/*.json") are file-extension patterns
        // that should NOT be expanded with "/**". All other patterns might represent
        // directories and need expansion to match their contents.
        if (!pattern.endsWith('/**') && !pattern.endsWith('/**/*') && !pattern.includes('*.')) {
          const dirRe = minimatch.makeRe(`${pattern}/**`, { dot: true });
          if (dirRe) ignoreRegexes.push(dirRe);
        }
      }

      filePaths = filePaths.filter((fp) => !ignoreRegexes.some((re) => re.test(fp)));
    }

    // Apply include patterns using pre-compiled regexes
    const includePatterns = config.include.map((p) => escapeGlobPattern(p));
    if (includePatterns.length > 0) {
      const includeRegexes = includePatterns
        .map((p) => minimatch.makeRe(p, { dot: true }))
        .filter((re): re is RegExp => re !== false);

      filePaths = filePaths.filter((fp) => includeRegexes.some((re) => re.test(fp)));
    }

    logger.debug(`[git ls-files] After filtering: ${filePaths.length} files`);
    return filePaths;
  } catch (error) {
    logger.debug(
      '[git ls-files] Failed, falling back to globby:',
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

/**
 * Read ignore patterns from ignore files (e.g., .repomixignore, .ignore) found in the file list.
 * Patterns are scoped to the directory containing the ignore file.
 */
const readIgnoreFilePatternsFromList = async (
  rootDir: string,
  filePaths: string[],
  ignoreFileName: string,
  deps = { readFile: fs.readFile },
): Promise<string[]> => {
  const patterns: string[] = [];
  const ignoreFiles = filePaths.filter((fp) => fp === ignoreFileName || fp.endsWith(`/${ignoreFileName}`));

  for (const ignoreFile of ignoreFiles) {
    try {
      const fullPath = path.join(rootDir, ignoreFile);
      const content = await deps.readFile(fullPath, 'utf-8');
      const filePatterns = parseIgnoreContent(content);
      const dir = path.dirname(ignoreFile);

      for (const pattern of filePatterns) {
        if (dir === '.') {
          // Root-level ignore file: apply patterns globally
          patterns.push(pattern);
        } else {
          // Nested ignore file: scope patterns to the directory
          if (pattern.startsWith('**/')) {
            patterns.push(`${dir}/${pattern}`);
          } else if (pattern.includes('/')) {
            patterns.push(`${dir}/${pattern}`);
          } else {
            patterns.push(`${dir}/**/${pattern}`);
          }
        }
      }
    } catch {
      logger.debug(`Failed to read ignore file: ${ignoreFile}`);
    }
  }

  return patterns;
};

/**
 * Check if a path is a git worktree reference file.
 */
const isGitWorktreeRef = async (gitPath: string, deps = { readFile: fs.readFile }): Promise<boolean> => {
  try {
    const stats = await fs.stat(gitPath);
    if (!stats.isFile()) {
      return false;
    }

    const content = await deps.readFile(gitPath, 'utf-8');
    return content.startsWith('gitdir:');
  } catch {
    return false;
  }
};
