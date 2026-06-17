import path from 'node:path';
import process from 'node:process';
import type { ChokidarOptions, FSWatcher } from 'chokidar';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { type PackResult, pack } from '../../core/packager.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { reportResults } from '../cliReport.js';
import { Spinner } from '../cliSpinner.js';
import type { CliOptions } from '../types.js';
import { buildMergedConfig } from './defaultAction.js';
import { buildWatchIgnoreFilter } from './watch/watchIgnore.js';

// Coalesce rapid bursts of file-change events into a single rebuild: wait this long
// after the last event before re-packing.
const REBUILD_DEBOUNCE_MS = 300;
// chokidar `awaitWriteFinish` setting: how long a file size must stay stable before the
// change is emitted, so half-written files are not packed mid-save.
const WRITE_STABILITY_THRESHOLD_MS = 100;

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

  // Watch-specific incompatibilities. Each of these is independently incompatible with
  // --watch and can also be set via the config file (which validateWatchOptions in cliRun,
  // CLI-flags-only, does not see), so re-check them on the merged config here. They are
  // checked individually rather than via the shared validateConflictingOptions so the error
  // always names --watch instead of a (potentially confusing) pairwise conflict.
  if (config.output.splitOutput !== undefined) {
    // Split output would create numbered files that the watcher then picks up, looping.
    throw new RepomixError(
      '--watch cannot be used with split output. Watch mode does not yet support split output files.',
    );
  }
  // `output: "-"` resolves to stdout mode via filePath === '-', the same as --stdout.
  if (config.output.stdout || config.output.filePath === '-') {
    throw new RepomixError('--watch cannot be used with stdout output. Watch mode writes to a file.');
  }
  if (config.skillGenerate !== undefined) {
    throw new RepomixError(
      '--watch cannot be used with --skill-generate. Watch mode does not support skill generation.',
    );
  }
  if (config.output.copyToClipboard) {
    throw new RepomixError(
      '--watch cannot be used with --copy. Watch mode re-packs on every change, which would repeatedly overwrite the clipboard.',
    );
  }

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
    awaitWriteFinish: { stabilityThreshold: WRITE_STABILITY_THRESHOLD_MS },
    ignored: watchIgnoreFilter,
  });

  // Handle watcher errors (EMFILE, EACCES, EPERM, etc.) to prevent uncaught exceptions.
  // Note: this only logs the error. After a fatal error (e.g. EMFILE that chokidar cannot
  // recover from) the watcher may stop delivering events while runWatchAction keeps awaiting
  // the keep-alive promise — the process stays alive but is silently no longer watching.
  // Acceptable for the initial release; revisit (e.g. exit non-zero) if it proves confusing.
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
          // toTimeString() returns "HH:MM:SS GMT..." independent of locale, so the leading
          // time portion is a portable, consistent 24-hour timestamp on every platform
          // (toLocaleTimeString(undefined) would follow the system locale, e.g. non-ASCII
          // digits or AM/PM).
          const timestamp = new Date().toTimeString().split(' ')[0];
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
    }, REBUILD_DEBOUNCE_MS);
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
