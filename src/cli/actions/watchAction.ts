import path from 'node:path';
import process from 'node:process';
import type { ChokidarOptions, FSWatcher } from 'chokidar';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { type PackResult, pack } from '../../core/packager.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { reportResults } from '../cliReport.js';
import { Spinner } from '../cliSpinner.js';
import type { CliOptions } from '../types.js';
import { buildMergedConfig } from './defaultAction.js';
import { buildWatchIgnoreFilter } from './watchIgnore.js';

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

export const runWatchAction = async (
  directories: string[],
  cwd: string,
  cliOptions: CliOptions,
  deps?: Partial<WatchDeps>,
): Promise<void> => {
  // Early-return guard: if the signal is already aborted, do no work.
  // Must be checked before any await to prevent race conditions.
  if (deps?.signal?.aborted) {
    return;
  }

  // Only load chokidar if no watch function is provided (enables faster tests)
  const resolvedDeps: WatchDeps = deps?.watch ? (deps as WatchDeps) : { ...(await resolveDefaultDeps()), ...deps };

  logger.trace('Watch mode: loaded CLI options:', cliOptions);

  const config = await buildMergedConfig(cwd, cliOptions);
  const targetPaths = directories.map((directory) => path.resolve(cwd, directory));

  // Run initial pack
  const packResult = await runPack(targetPaths, config, cliOptions);
  reportResults(cwd, packResult, config, cliOptions);
  logger.log(pc.dim(`\nWatching ${packResult.safeFilePaths.length} files for changes... (Ctrl+C to stop)\n`));

  // Watch target directories instead of individual files so new files are detected.
  // The ignore predicate mirrors the packer so chokidar stays out of node_modules/.git
  // and gitignored trees (prevents EMFILE on large projects) and avoids wasted rebuilds.
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
    if (shuttingDown) {
      return;
    }

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;

      // Re-check shutdown in case it was initiated while the timer was pending
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
          const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
          logger.success(`Rebuilt at ${timestamp}`);
          logger.log(pc.dim('Watching for changes...'));
        } catch (error) {
          logger.error('Watch rebuild failed:', error);
        } finally {
          isRebuilding = false;
          activeRebuildPromise = null;
          // Drain a queued rebuild unless we are shutting down
          if (!shuttingDown && pendingRebuild) {
            pendingRebuild = false;
            scheduleRebuild();
          } else {
            pendingRebuild = false;
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

  // Graceful shutdown — the keep-alive promise is created up front so cleanup can
  // always resolve it, even if it fires before we start awaiting (e.g. an already
  // aborted signal). cleanup is idempotent so repeat signals (double Ctrl+C) are safe.
  let resolveExit: () => void = () => {};
  const exited = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });

  let cleanupStarted = false;
  const cleanup = async () => {
    if (cleanupStarted) {
      return;
    }
    cleanupStarted = true;
    shuttingDown = true;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    pendingRebuild = false;
    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);

    // Close the watcher and await any in-flight rebuild independently, so a failure
    // in one never skips the other.
    try {
      await watcher.close();
    } catch (error) {
      logger.error('Error closing watcher:', error);
    }
    try {
      await activeRebuildPromise;
    } catch (error) {
      logger.error('Error waiting for rebuild to complete:', error);
    }

    resolveExit();
  };

  if (resolvedDeps.signal) {
    resolvedDeps.signal.addEventListener('abort', cleanup, { once: true });
    // Handle the race where the signal aborts before the listener is attached
    if (resolvedDeps.signal.aborted) {
      cleanup();
    }
  } else {
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  // Keep the process alive until cleanup completes (including watcher.close())
  await exited;
};
