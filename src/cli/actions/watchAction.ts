import path from 'node:path';
import process from 'node:process';
import type { ChokidarOptions } from 'chokidar';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import type { CliOptions } from '../types.js';
import { type DefaultActionRunnerResult, runDefaultAction as runDefaultActionDefault } from './defaultAction.js';

const DEFAULT_DEBOUNCE_MS = 300;

const defaultConfigFileNames = [
  'repomix.config.ts',
  'repomix.config.mts',
  'repomix.config.cts',
  'repomix.config.js',
  'repomix.config.mjs',
  'repomix.config.cjs',
  'repomix.config.json5',
  'repomix.config.jsonc',
  'repomix.config.json',
];

interface WatcherLike {
  add(paths: string | string[]): unknown;
  close(): Promise<unknown>;
  on(event: 'all', listener: (eventName: string, filePath: string) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

interface WatchTrigger {
  eventName: string;
  filePath: string;
}

interface WatchDeps {
  runDefaultAction: typeof runDefaultActionDefault;
  createWatcher: (paths: string[], options: ChokidarOptions) => WatcherLike | Promise<WatcherLike>;
  waitForStop: (watcher: WatcherLike) => Promise<void>;
  debounceMs: number;
}

const createDefaultWatcher: WatchDeps['createWatcher'] = async (paths, options) => {
  const { watch } = await import('chokidar');
  return watch(paths, options);
};

const waitForSignal: WatchDeps['waitForStop'] = async () => {
  await new Promise<void>((resolve) => {
    const finish = () => {
      process.off('SIGINT', finish);
      process.off('SIGTERM', finish);
      resolve();
    };
    process.once('SIGINT', finish);
    process.once('SIGTERM', finish);
  });
};

const defaultDeps: WatchDeps = {
  runDefaultAction: runDefaultActionDefault,
  createWatcher: createDefaultWatcher,
  waitForStop: waitForSignal,
  debounceMs: DEFAULT_DEBOUNCE_MS,
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const toAbsolutePath = (cwd: string, filePath: string): string => path.resolve(cwd, filePath);

const uniquePaths = (paths: string[]): string[] => Array.from(new Set(paths));

const pathSegments = (filePath: string): string[] => path.resolve(filePath).split(path.sep).filter(Boolean);

const isInsideIgnoredDirectory = (filePath: string): boolean => {
  const segments = pathSegments(filePath);
  return segments.includes('.git') || segments.includes('node_modules');
};

const getConfigWatchPaths = (cwd: string, cliOptions: CliOptions): string[] => {
  if (cliOptions.config) {
    return [toAbsolutePath(cwd, cliOptions.config)];
  }

  return defaultConfigFileNames.map((fileName) => path.resolve(cwd, fileName));
};

const getInstructionWatchPath = (cwd: string, config?: RepomixConfigMerged): string[] => {
  if (!config?.output.instructionFilePath) {
    return [];
  }
  return [toAbsolutePath(cwd, config.output.instructionFilePath)];
};

const buildWatchPaths = (
  directories: string[],
  cwd: string,
  cliOptions: CliOptions,
  config?: RepomixConfigMerged,
): string[] => {
  const targetPaths = directories.map((directory) => toAbsolutePath(cwd, directory));
  const configPaths = getConfigWatchPaths(cwd, cliOptions);
  const instructionPaths = getInstructionWatchPath(cwd, config);
  return uniquePaths([...targetPaths, ...configPaths, ...instructionPaths]);
};

const getOutputPaths = (cwd: string, result: DefaultActionRunnerResult): string[] => {
  const outputPaths = new Set<string>();
  outputPaths.add(toAbsolutePath(cwd, result.config.output.filePath));
  for (const outputFile of result.packResult.outputFiles ?? []) {
    outputPaths.add(toAbsolutePath(cwd, outputFile));
  }
  return Array.from(outputPaths);
};

const validateWatchOptions = (cliOptions: CliOptions): void => {
  const conflicts: Array<[boolean, string]> = [
    [Boolean(cliOptions.stdin), '--stdin'],
    [Boolean(cliOptions.stdout || cliOptions.output === '-'), '--stdout'],
    [Boolean(cliOptions.copy), '--copy'],
    [cliOptions.skillGenerate !== undefined, '--skill-generate'],
  ];

  const conflict = conflicts.find(([enabled]) => enabled);
  if (conflict) {
    throw new RepomixError(`--watch cannot be used with ${conflict[1]}.`);
  }
};

const displayWatchPath = (cwd: string, filePath: string): string => {
  const relativePath = path.relative(cwd, filePath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath) ? relativePath : filePath;
};

export const runWatchAction = async (
  directories: string[],
  cwd: string,
  cliOptions: CliOptions,
  overrideDeps: Partial<WatchDeps> = {},
): Promise<void> => {
  validateWatchOptions(cliOptions);

  const deps = { ...defaultDeps, ...overrideDeps };
  const optionsForBuild = { ...cliOptions, watch: true };
  let outputPaths = new Set<string>();
  let latestConfig: RepomixConfigMerged | undefined;
  let watcher: WatcherLike | undefined;
  let watchedPaths = new Set<string>();
  let debounceTimer: NodeJS.Timeout | undefined;
  let isRebuilding = false;
  let rebuildQueued = false;

  const runRebuild = async (trigger?: WatchTrigger): Promise<void> => {
    if (isRebuilding) {
      rebuildQueued = true;
      return;
    }

    isRebuilding = true;
    try {
      if (trigger) {
        logger.log(
          pc.dim(
            `\nChange detected (${trigger.eventName}: ${displayWatchPath(cwd, trigger.filePath)}). Rebuilding...\n`,
          ),
        );
      }

      const result = await deps.runDefaultAction(directories, cwd, optionsForBuild);
      latestConfig = result.config;
      outputPaths = new Set(getOutputPaths(cwd, result));

      if (watcher) {
        const nextWatchPaths = buildWatchPaths(directories, cwd, cliOptions, latestConfig);
        const newPaths = nextWatchPaths.filter((watchPath) => !watchedPaths.has(watchPath));
        if (newPaths.length > 0) {
          watcher.add(newPaths);
          watchedPaths = new Set([...watchedPaths, ...newPaths]);
        }
      }
    } catch (error) {
      logger.error(pc.red(`Watch rebuild failed: ${formatError(error)}`));
      logger.trace('Watch rebuild error:', error);
    } finally {
      isRebuilding = false;
      if (rebuildQueued) {
        rebuildQueued = false;
        await runRebuild();
      }
    }
  };

  const scheduleRebuild = (trigger: WatchTrigger) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void runRebuild(trigger);
    }, deps.debounceMs);
  };

  const isIgnored = (filePath: string): boolean => {
    const absolutePath = path.resolve(filePath);
    return isInsideIgnoredDirectory(absolutePath) || outputPaths.has(absolutePath);
  };

  await runRebuild();

  const watchPaths = buildWatchPaths(directories, cwd, cliOptions, latestConfig);
  watchedPaths = new Set(watchPaths);
  watcher = await deps.createWatcher(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    atomic: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50,
    },
    ignored: isIgnored,
  });

  watcher
    .on('all', (eventName, filePath) => {
      if (isIgnored(filePath)) {
        return;
      }
      scheduleRebuild({ eventName, filePath });
    })
    .on('error', (error) => {
      logger.error(pc.red(`Watch error: ${formatError(error)}`));
      logger.trace('Watch error:', error);
    });

  logger.log(pc.dim('Watching for changes. Press Ctrl+C to stop.'));

  try {
    await deps.waitForStop(watcher);
  } finally {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    await watcher.close();
  }
};
