import { loadFileConfig, mergeConfigs } from '../../config/configLoad.js';
import {
  type RepomixConfigCli,
  type RepomixConfigFile,
  type RepomixConfigMerged,
  type RepomixOutputStyle,
  repomixConfigCliSchema,
} from '../../config/configSchema.js';
import { readFilePathsFromStdin } from '../../core/file/fileStdin.js';
import type { PackResult } from '../../core/packager.js';
import { RepomixError, rethrowValidationErrorIfZodError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { splitPatterns } from '../../shared/patternUtils.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import { reportResults } from '../cliReport.js';
import type { CliOptions } from '../types.js';
import { runMigrationAction } from './migrationAction.js';
import type {
  DefaultActionTask,
  DefaultActionWorkerResult,
  PingResult,
  PingTask,
} from './workers/defaultActionWorker.js';

export interface DefaultActionRunnerResult {
  packResult: PackResult;
  config: RepomixConfigMerged;
}

export const runDefaultAction = async (
  directories: string[],
  cwd: string,
  cliOptions: CliOptions,
): Promise<DefaultActionRunnerResult> => {
  logger.trace('Loaded CLI options:', cliOptions);

  // Run migration before loading config
  await runMigrationAction(cwd);

  // Load the config file in main process
  const fileConfig: RepomixConfigFile = await loadFileConfig(cwd, cliOptions.config ?? null);
  logger.trace('Loaded file config:', fileConfig);

  // Parse the CLI options into a config
  const cliConfig: RepomixConfigCli = buildCliConfig(cliOptions);
  logger.trace('CLI config:', cliConfig);

  // Merge default, file, and CLI configs
  const config: RepomixConfigMerged = mergeConfigs(cwd, fileConfig, cliConfig);
  logger.trace('Merged config:', config);

  // Handle stdin processing in main process (before worker creation)
  // This is necessary because child_process workers don't inherit stdin
  let stdinFilePaths: string[] | undefined;
  if (cliOptions.stdin) {
    // Validate directory arguments for stdin mode
    const firstDir = directories[0] ?? '.';
    if (directories.length > 1 || firstDir !== '.') {
      throw new RepomixError(
        'When using --stdin, do not specify directory arguments. File paths will be read from stdin.',
      );
    }

    const stdinResult = await readFilePathsFromStdin(cwd);
    stdinFilePaths = stdinResult.filePaths;
    logger.trace(`Read ${stdinFilePaths.length} file paths from stdin in main process`);
  }

  // Create worker task runner
  const taskRunner = initTaskRunner<DefaultActionTask | PingTask, DefaultActionWorkerResult | PingResult>({
    numOfTasks: 1,
    workerPath: new URL('./workers/defaultActionWorker.js', import.meta.url).href,
    runtime: 'child_process',
  });

  try {
    // Wait for worker to be ready (Bun compatibility)
    await waitForWorkerReady(taskRunner);

    // Create task for worker (now with pre-loaded config and stdin file paths)
    const task: DefaultActionTask = {
      directories,
      cwd,
      config,
      cliOptions,
      stdinFilePaths,
    };

    // Run the task in worker (spinner is handled inside worker)
    const result = (await taskRunner.run(task)) as DefaultActionWorkerResult;

    // Report results in main process
    reportResults(cwd, result.packResult, result.config);

    return {
      packResult: result.packResult,
      config: result.config,
    };
  } finally {
    // Always cleanup worker pool
    await taskRunner.cleanup();
  }
};

/**
 * Builds CLI configuration from command-line options.
 *
 * Note: Due to Commander.js behavior with --no-* flags:
 * - When --no-* flags are used (e.g., --no-file-summary), the options explicitly become false
 * - When no flag is specified, Commander defaults to true (e.g., options.fileSummary === true)
 * - For --no-* flags, we only apply the setting when it's explicitly false to respect config file values
 * - This allows the config file to maintain control unless explicitly overridden by CLI
 */
export const buildCliConfig = (options: CliOptions): RepomixConfigCli => {
  const cliConfig: RepomixConfigCli = {};

  if (options.output) {
    cliConfig.output = { filePath: options.output };
  }
  if (options.include) {
    cliConfig.include = splitPatterns(options.include);
  }
  if (options.ignore) {
    cliConfig.ignore = { customPatterns: splitPatterns(options.ignore) };
  }
  // Only apply gitignore setting if explicitly set to false
  if (options.gitignore === false) {
    cliConfig.ignore = { ...cliConfig.ignore, useGitignore: options.gitignore };
  }
  // Only apply dotIgnore setting if explicitly set to false
  if (options.dotIgnore === false) {
    cliConfig.ignore = { ...cliConfig.ignore, useDotIgnore: options.dotIgnore };
  }
  // Only apply defaultPatterns setting if explicitly set to false
  if (options.defaultPatterns === false) {
    cliConfig.ignore = {
      ...cliConfig.ignore,
      useDefaultPatterns: options.defaultPatterns,
    };
  }
  if (options.topFilesLen !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      topFilesLength: options.topFilesLen,
    };
  }
  if (options.outputShowLineNumbers !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      showLineNumbers: options.outputShowLineNumbers,
    };
  }
  if (options.copy) {
    cliConfig.output = { ...cliConfig.output, copyToClipboard: options.copy };
  }
  if (options.style) {
    cliConfig.output = {
      ...cliConfig.output,
      style: options.style.toLowerCase() as RepomixOutputStyle,
    };
  }
  if (options.parsableStyle !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      parsableStyle: options.parsableStyle,
    };
  }
  if (options.stdout) {
    cliConfig.output = {
      ...cliConfig.output,
      stdout: true,
    };
  }
  // Only apply securityCheck setting if explicitly set to false
  if (options.securityCheck === false) {
    cliConfig.security = { enableSecurityCheck: options.securityCheck };
  }
  // Only apply fileSummary setting if explicitly set to false
  if (options.fileSummary === false) {
    cliConfig.output = {
      ...cliConfig.output,
      fileSummary: false,
    };
  }
  // Only apply directoryStructure setting if explicitly set to false
  if (options.directoryStructure === false) {
    cliConfig.output = {
      ...cliConfig.output,
      directoryStructure: false,
    };
  }
  // Only apply files setting if explicitly set to false
  if (options.files === false) {
    cliConfig.output = {
      ...cliConfig.output,
      files: false,
    };
  }
  if (options.removeComments !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      removeComments: options.removeComments,
    };
  }
  if (options.removeEmptyLines !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      removeEmptyLines: options.removeEmptyLines,
    };
  }
  if (options.truncateBase64 !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      truncateBase64: options.truncateBase64,
    };
  }
  if (options.headerText !== undefined) {
    cliConfig.output = { ...cliConfig.output, headerText: options.headerText };
  }

  if (options.compress !== undefined) {
    cliConfig.output = { ...cliConfig.output, compress: options.compress };
  }

  if (options.tokenCountEncoding) {
    cliConfig.tokenCount = { encoding: options.tokenCountEncoding };
  }
  if (options.instructionFilePath) {
    cliConfig.output = {
      ...cliConfig.output,
      instructionFilePath: options.instructionFilePath,
    };
  }
  if (options.includeEmptyDirectories) {
    cliConfig.output = {
      ...cliConfig.output,
      includeEmptyDirectories: options.includeEmptyDirectories,
    };
  }

  if (options.includeFullDirectoryStructure) {
    cliConfig.output = {
      ...cliConfig.output,
      includeFullDirectoryStructure: options.includeFullDirectoryStructure,
    };
  }

  // Only apply gitSortByChanges setting if explicitly set to false
  if (options.gitSortByChanges === false) {
    cliConfig.output = {
      ...cliConfig.output,
      git: {
        ...cliConfig.output?.git,
        sortByChanges: false,
      },
    };
  }

  if (options.includeDiffs) {
    cliConfig.output = {
      ...cliConfig.output,
      git: {
        ...cliConfig.output?.git,
        includeDiffs: true,
      },
    };
  }

  // Configure git logs inclusion and count - consolidating related git log options
  if (options.includeLogs || options.includeLogsCount !== undefined) {
    const gitLogConfig = {
      ...cliConfig.output?.git,
      ...(options.includeLogs && { includeLogs: true }),
      ...(options.includeLogsCount !== undefined && { includeLogsCount: options.includeLogsCount }),
    };

    cliConfig.output = {
      ...cliConfig.output,
      git: gitLogConfig,
    };
  }

  // Configure git log orthogonal flags (diff formats and enhancements)
  // This handles the new unified git log system with separate flags

  // Validate mutually exclusive diff format flags
  const diffFormatFlags = [
    options.stat,
    options.patch,
    options.numstat,
    options.shortstat,
    options.dirstat,
    options.nameOnly,
    options.nameStatus,
    options.raw,
  ].filter(Boolean);

  if (diffFormatFlags.length > 1) {
    throw new RepomixError(
      'Only one git log diff format flag can be used at a time: --stat, --patch, --numstat, --shortstat, --dirstat, --name-only, --name-status, or --raw',
    );
  }

  // Determine commit patch detail level from flags
  let commitPatchDetail:
    | 'stat'
    | 'patch'
    | 'numstat'
    | 'shortstat'
    | 'dirstat'
    | 'name-only'
    | 'name-status'
    | 'raw'
    | undefined;
  if (options.stat) commitPatchDetail = 'stat';
  else if (options.patch) commitPatchDetail = 'patch';
  else if (options.numstat) commitPatchDetail = 'numstat';
  else if (options.shortstat) commitPatchDetail = 'shortstat';
  else if (options.dirstat) commitPatchDetail = 'dirstat';
  else if (options.nameOnly) commitPatchDetail = 'name-only';
  else if (options.nameStatus) commitPatchDetail = 'name-status';
  else if (options.raw) commitPatchDetail = 'raw';

  // Apply git log configuration if any git log flags are set
  if (commitPatchDetail || options.graph || options.summary || options.commitRange) {
    const gitLogEnhancementConfig = {
      ...cliConfig.output?.git,
      // Enable logs if any diff format or enhancement flag is used
      includeLogs: true,
      ...(commitPatchDetail && { commitPatchDetail }),
      ...(options.graph && { includeCommitGraph: true }),
      ...(options.summary && { includeSummary: true }),
      ...(options.commitRange && { commitRange: options.commitRange }),
    };

    cliConfig.output = {
      ...cliConfig.output,
      git: gitLogEnhancementConfig,
    };
  }

  if (options.tokenCountTree !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      tokenCountTree: options.tokenCountTree,
    };
  }

  try {
    return repomixConfigCliSchema.parse(cliConfig);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid cli arguments');
    throw error;
  }
};

/**
 * Wait for worker to be ready by sending a ping request.
 * This is specifically needed for Bun compatibility due to ES module initialization timing issues.
 */
const waitForWorkerReady = async (taskRunner: {
  run: (task: DefaultActionTask | PingTask) => Promise<DefaultActionWorkerResult | PingResult>;
}): Promise<void> => {
  const isBun = process.versions?.bun;
  if (!isBun) {
    // No need to wait for Node.js
    return;
  }

  const maxRetries = 3;
  const retryDelay = 50; // ms
  let pingSuccessful = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await taskRunner.run({
        ping: true,
      });
      logger.debug(`Worker initialization ping successful on attempt ${attempt}`);
      pingSuccessful = true;
      break;
    } catch (error) {
      logger.debug(`Worker ping failed on attempt ${attempt}/${maxRetries}:`, error);
      if (attempt < maxRetries) {
        logger.debug(`Waiting ${retryDelay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  if (!pingSuccessful) {
    logger.debug('All Worker ping attempts failed, proceeding anyway...');
  }
};
