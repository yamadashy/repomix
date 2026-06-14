import path from 'node:path';
import process from 'node:process';
import type { ChokidarOptions, FSWatcher } from 'chokidar';
import { isGitIgnored, isIgnoredByIgnoreFiles } from 'globby';
import { Minimatch } from 'minimatch';
import pc from 'picocolors';
import { loadFileConfig, mergeConfigs } from '../../config/configLoad.js';
import type { RepomixConfigCli, RepomixConfigFile, RepomixConfigMerged } from '../../config/configSchema.js';
import { getIgnoreFilePatterns, getIgnorePatterns } from '../../core/file/fileSearch.js';
import { type PackResult, pack } from '../../core/packager.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { reportResults } from '../cliReport.js';
import { Spinner } from '../cliSpinner.js';
import type { CliOptions } from '../types.js';
import { buildCliConfig } from './defaultAction.js';
import { runMigrationAction } from './migrationAction.js';

export interface WatchDeps {
  watch: (paths: string | string[], options?: ChokidarOptions) => FSWatcher;
  signal?: AbortSignal;
  buildIgnoreFilter?: (targetPaths: string[], config: RepomixConfigMerged) => Promise<(watchedPath: string) => boolean>;
}

const resolveDefaultDeps = async (): Promise<WatchDeps> => {
  // Lazy-load chokidar so it is only imported when --watch is actually used
  const chokidar = await import('chokidar');
  return { watch: chokidar.watch };
};

const runPack = async (
  targetPaths: string[],
  config: RepomixConfigMerged,
  cliOptions: CliOptions,
): Promise<PackResult> => {
  const spinner = new Spinner('Packing...', cliOptions);
  spinner.start();

  try {
    const handleProgress: RepomixProgressCallback = (message) => {
      spinner.update(message);
    };

    const packResult = await pack(targetPaths, config, handleProgress);
    spinner.succeed('Packing completed successfully!');
    return packResult;
  } catch (error) {
    spinner.fail('Error during packing');
    throw error;
  }
};

/**
 * Builds a chokidar `ignored` predicate that mirrors the packer's ignore rules,
 * so watch mode skips exactly what the packer skips.
 *
 * chokidar v4+ dropped glob support in `ignored` (it accepts only literal
 * strings, RegExps, or functions), so the packer's glob patterns must be
 * evaluated through minimatch instead. The predicate also matches the ignored
 * directory itself (e.g. `node_modules`, `.git`), not just its descendants, so
 * chokidar never descends into huge or gitignored trees and exhausts file
 * descriptors (EMFILE). Rules are resolved per watched root, reusing the same
 * ignore resolution (default patterns, custom patterns, .git/info/exclude,
 * .gitignore, and .ignore/.repomixignore files) the packer uses.
 */
export const buildWatchIgnoreFilter = async (
  targetPaths: string[],
  config: RepomixConfigMerged,
): Promise<(watchedPath: string) => boolean> => {
  const rootFilters = await Promise.all(
    targetPaths.map(async (root) => {
      // Default + custom + output + .git/info/exclude patterns (relative to this root).
      const patterns = await getIgnorePatterns(root, config);
      const fileMatchers = patterns.map((pattern) => new Minimatch(pattern, { dot: true }));
      // Directory form of every `foo/**` pattern, so the directory itself matches and
      // chokidar stops before descending into it (the part that actually prevents EMFILE).
      const dirMatchers = patterns
        .filter((pattern) => pattern.endsWith('/**'))
        .map((pattern) => new Minimatch(pattern.slice(0, -3), { dot: true }));

      // .gitignore and .ignore/.repomixignore are read by globby; reuse the same matchers
      // so gitignored directories (build caches, etc.) are skipped too.
      const ignoreFilePatterns = await getIgnoreFilePatterns(config);
      const gitIgnored = config.ignore.useGitignore ? await isGitIgnored({ cwd: root }) : null;
      const ignoreFileIgnored =
        ignoreFilePatterns.length > 0 ? await isIgnoredByIgnoreFiles(ignoreFilePatterns, { cwd: root }) : null;

      return { root, fileMatchers, dirMatchers, gitIgnored, ignoreFileIgnored };
    }),
  );

  return (watchedPath: string): boolean => {
    for (const { root, fileMatchers, dirMatchers, gitIgnored, ignoreFileIgnored } of rootFilters) {
      const relative = path.relative(root, watchedPath);
      if (relative === '' || relative.startsWith('..')) {
        continue; // not under this root
      }
      const normalized = relative.split(path.sep).join('/');
      for (const matcher of fileMatchers) {
        if (matcher.match(normalized)) {
          return true;
        }
      }
      for (const matcher of dirMatchers) {
        if (matcher.match(normalized)) {
          return true;
        }
      }
      // Query with a trailing slash too: a `dir/` ignore rule matches the directory
      // only when treated as a directory, and that is what prunes chokidar's descent
      // (without it, chokidar walks into the dir and opens fds before ignoring files -> EMFILE).
      if (gitIgnored && (gitIgnored(normalized) || gitIgnored(`${normalized}/`))) {
        return true;
      }
      if (ignoreFileIgnored && (ignoreFileIgnored(normalized) || ignoreFileIgnored(`${normalized}/`))) {
        return true;
      }
      return false; // path belongs to this root but matched no ignore rule
    }

    return false;
  };
};

export const runWatchAction = async (
  directories: string[],
  cwd: string,
  cliOptions: CliOptions,
  deps?: Partial<WatchDeps>,
): Promise<void> => {
  // Early-return guard: if the signal is already aborted, do no work
  // Must check before any await to prevent race conditions
  if (deps?.signal?.aborted) {
    return;
  }

  // Only load chokidar if no watch function is provided (enables faster tests)
  const resolvedDeps: WatchDeps = deps?.watch ? (deps as WatchDeps) : { ...(await resolveDefaultDeps()), ...deps };

  logger.trace('Watch mode: loaded CLI options:', cliOptions);

  // Build config — same pattern as defaultAction
  await runMigrationAction(cwd);

  const fileConfig: RepomixConfigFile = await loadFileConfig(cwd, cliOptions.config ?? null, {
    skipLocalConfig: cliOptions.skipLocalConfig,
  });
  logger.trace('Watch mode: loaded file config:', fileConfig);

  const cliConfig: RepomixConfigCli = buildCliConfig(cliOptions);
  logger.trace('Watch mode: CLI config:', cliConfig);

  const config: RepomixConfigMerged = mergeConfigs(cwd, fileConfig, cliConfig);
  logger.trace('Watch mode: merged config:', config);

  const targetPaths = directories.map((directory) => path.resolve(cwd, directory));

  // Run initial pack
  const packResult = await runPack(targetPaths, config, cliOptions);
  reportResults(cwd, packResult, config, cliOptions);
  logger.log(pc.dim(`\nWatching ${packResult.safeFilePaths.length} files for changes... (Ctrl+C to stop)\n`));

  // Watch target directories instead of individual files so new files are detected
  // Apply the same ignore patterns the packer uses to avoid unnecessary rebuilds
  // and to keep chokidar out of node_modules/.git (prevents EMFILE on large trees)
  const buildIgnoreFilter = resolvedDeps.buildIgnoreFilter ?? buildWatchIgnoreFilter;
  const watchIgnoreFilter = await buildIgnoreFilter(targetPaths, config);
  const watcher = resolvedDeps.watch(targetPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100 },
    ignored: watchIgnoreFilter,
  });

  // Handle watcher errors (EMFILE, EACCES, EPERM, etc.) to prevent uncaught exceptions
  watcher.on('error', (error) => {
    logger.error('File watcher error:', error);
  });

  // Rebuild guard — prevents concurrent packs and queues a follow-up if changes arrive mid-pack
  let isRebuilding = false;
  let pendingRebuild = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let shuttingDown = false;
  let activeRebuildPromise: Promise<void> | null = null;

  const scheduleRebuild = () => {
    // Guard: don't schedule new work if shutdown has been initiated
    if (shuttingDown) {
      return;
    }

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;

      // Re-check shutdown in case it was initiated while timer was pending
      if (shuttingDown) {
        return;
      }

      if (isRebuilding) {
        pendingRebuild = true;
        return;
      }

      isRebuilding = true;
      const rebuildWork = async () => {
        try {
          const result = await runPack(targetPaths, config, cliOptions);
          reportResults(cwd, result, config, cliOptions);
          const now = new Date();
          const timestamp = now.toLocaleTimeString('en-GB', { hour12: false });
          logger.success(`Rebuilt at ${timestamp}`);
          logger.log(pc.dim('Watching for changes...'));
        } catch (error) {
          logger.error('Watch rebuild failed:', error);
        } finally {
          isRebuilding = false;
          activeRebuildPromise = null;
          // Check if shutdown has been initiated before draining pendingRebuild
          if (shuttingDown) {
            pendingRebuild = false;
          } else if (pendingRebuild) {
            pendingRebuild = false;
            scheduleRebuild();
          }
        }
      };
      activeRebuildPromise = rebuildWork();
      await activeRebuildPromise;
    }, 300);
  };

  watcher.on('change', scheduleRebuild);
  watcher.on('add', scheduleRebuild);
  watcher.on('unlink', scheduleRebuild);

  // Graceful shutdown — shared cleanup promise that both signal and SIGINT/SIGTERM paths await
  let cleanupResolve: (() => void) | null = null;
  let cleanupStarted = false;
  let cleanupDone = false;

  const cleanup = async () => {
    // Prevent multiple cleanup calls
    if (cleanupStarted) {
      return;
    }
    cleanupStarted = true;
    shuttingDown = true;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    pendingRebuild = false;
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);

    // Use separate try/catch blocks so activeRebuildPromise is always awaited
    // even if watcher.close() fails
    try {
      await watcher.close();
    } catch (error) {
      logger.error('Error closing watcher:', error);
    }

    try {
      if (activeRebuildPromise) {
        await activeRebuildPromise;
      }
    } catch (error) {
      logger.error('Error waiting for rebuild to complete:', error);
    }

    // Always settle the keep-alive promise
    cleanupDone = true;
    cleanupResolve?.();
  };

  const onSigint = () => {
    cleanup();
  };
  const onSigterm = () => {
    cleanup();
  };

  if (resolvedDeps.signal) {
    // Register abort listener with { once: true } to avoid duplicate calls
    resolvedDeps.signal.addEventListener('abort', () => cleanup(), { once: true });

    // Handle race condition: signal may already be aborted before listener was registered
    if (resolvedDeps.signal.aborted) {
      cleanup();
    }
  } else {
    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);
  }

  // Keep alive — wait until cleanup is fully complete (including watcher.close())
  // Check cleanupDone first in case cleanup finished before we got here
  await new Promise<void>((resolve) => {
    if (cleanupDone) {
      resolve();
      return;
    }
    cleanupResolve = resolve;
  });
};
