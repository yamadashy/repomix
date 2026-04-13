import path from 'node:path';
import type { ChokidarOptions, FSWatcher } from 'chokidar';
import pc from 'picocolors';
import { loadFileConfig, mergeConfigs } from '../../config/configLoad.js';
import type { RepomixConfigCli, RepomixConfigFile, RepomixConfigMerged } from '../../config/configSchema.js';
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
  const resolvedDeps: WatchDeps = { ...(await resolveDefaultDeps()), ...deps };

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
  logger.log(pc.dim('Watching for changes...'));

  // Resolve safeFilePaths against the first target path for watching
  const rootDir = targetPaths[0];
  const absoluteWatchPaths = packResult.safeFilePaths.map((filePath) => path.resolve(rootDir, filePath));

  // Set up chokidar watcher
  const watcher = resolvedDeps.watch(absoluteWatchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100 },
  });

  // Debounced rebuild
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRebuild = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      try {
        const result = await runPack(targetPaths, config, cliOptions);
        reportResults(cwd, result, config, cliOptions);
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-GB', { hour12: false });
        logger.success(`Rebuilt at ${timestamp}`);
        logger.log(pc.dim('Watching for changes...'));
      } catch (error) {
        logger.error('Watch rebuild failed:', error);
      }
    }, 300);
  };

  watcher.on('change', scheduleRebuild);
  watcher.on('add', scheduleRebuild);
  watcher.on('unlink', scheduleRebuild);

  // Graceful shutdown
  const cleanup = async () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    await watcher.close();
  };

  if (resolvedDeps.signal) {
    resolvedDeps.signal.addEventListener('abort', () => {
      cleanup();
    });
  } else {
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });
  }

  // Keep alive — wait until signal is aborted (in tests) or process exits
  if (resolvedDeps.signal) {
    await new Promise<void>((resolve) => {
      if (resolvedDeps.signal?.aborted) {
        resolve();
        return;
      }
      resolvedDeps.signal?.addEventListener('abort', () => resolve());
    });
  } else {
    // In production, keep the process alive indefinitely
    await new Promise<void>(() => {});
  }
};
