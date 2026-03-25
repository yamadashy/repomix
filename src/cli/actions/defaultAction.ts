import path from 'node:path';
import type {
  RepomixConfigCli,
  RepomixConfigFile,
  RepomixConfigMerged,
  RepomixOutputStyle,
} from '../../config/configDefaults.js';
import { loadFileConfig, mergeConfigs } from '../../config/configLoad.js';
import type { PackResult } from '../../core/packager.js';
import { generateDefaultSkillName } from '../../core/skill/skillUtils.js';
import { RepomixError, rethrowValidationErrorIfZodError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { splitPatterns } from '../../shared/patternUtils.js';
import { reportResults } from '../cliReport.js';
import type { CliOptions } from '../types.js';
// migrationAction is lazy-loaded below to avoid eagerly importing @clack/prompts (~16ms)
// on every default pack run. Migration is only needed when old Repopack files exist.
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

  // Determine if we need a child process for the spinner.
  // In stdout mode, no spinner is displayed, so we can run pack() directly
  // in the main process — avoiding child process spawn + module re-loading (~200ms).
  // When stderr is not a TTY (CI, piped output, stdio: 'ignore'), the spinner is
  // invisible, so skip the child process — saves ~100-200ms of subprocess overhead.
  // Quiet mode always uses the child process to ensure clean memory isolation
  // when runCli is called repeatedly (e.g., memory benchmarks, MCP server).
  const needsChildProcess = !cliOptions.stdout && (cliOptions.quiet === true || process.stderr.isTTY === true);

  // Start child process worker early so module loading (~200ms) overlaps
  // with config loading (~30-50ms). Only when the spinner is needed.
  // Lazy-load processConcurrency (tinypool, ~30ms) to avoid loading it in stdout/non-TTY
  // mode where no child process is needed. The dynamic import runs in the background,
  // so the child process still starts early enough to overlap with config loading.
  const taskRunnerPromise = needsChildProcess
    ? import('../../shared/processConcurrency.js').then(({ initTaskRunner }) =>
        initTaskRunner<DefaultActionTask | PingTask, DefaultActionWorkerResult | PingResult>({
          numOfTasks: 1,
          workerType: 'defaultAction',
          runtime: 'child_process',
        }),
      )
    : undefined;

  // For direct execution, start importing packager module tree in the background
  // while config loads. This overlaps ~100ms of module loading with config I/O.
  const packagerPromise = !needsChildProcess ? import('../../core/packager.js') : undefined;

  try {
    // Run migration before loading config (lazy-load to avoid importing @clack/prompts on every run)
    const { runMigrationAction } = await import('./migrationAction.js');
    await runMigrationAction(cwd);

    // Load the config file in main process
    const fileConfig: RepomixConfigFile = await loadFileConfig(cwd, cliOptions.config ?? null, {
      skipLocalConfig: cliOptions.skipLocalConfig,
    });
    logger.trace('Loaded file config:', fileConfig);

    // Parse the CLI options into a config
    const cliConfig: RepomixConfigCli = await buildCliConfig(cliOptions);
    logger.trace('CLI config:', cliConfig);

    // Merge default, file, and CLI configs
    const config: RepomixConfigMerged = mergeConfigs(cwd, fileConfig, cliConfig);
    logger.trace('Merged config:', config);

    // Validate conflicting options
    validateConflictingOptions(config);

    // Validate --skill-output and --force require --skill-generate
    if (cliOptions.skillOutput && config.skillGenerate === undefined) {
      throw new RepomixError('--skill-output can only be used with --skill-generate');
    }
    if (cliOptions.force && config.skillGenerate === undefined) {
      throw new RepomixError('--force can only be used with --skill-generate');
    }

    // Validate --skill-output is not empty or whitespace only
    if (cliOptions.skillOutput !== undefined && !cliOptions.skillOutput.trim()) {
      throw new RepomixError('--skill-output path cannot be empty');
    }

    // Validate skill generation options and prompt for location
    if (config.skillGenerate !== undefined) {
      // Resolve skill name: use pre-computed name (from remoteAction) or generate from directory
      cliOptions.skillName ??=
        typeof config.skillGenerate === 'string'
          ? config.skillGenerate
          : generateDefaultSkillName(directories.map((d) => path.resolve(cwd, d)));

      // Determine skill directory (lazy-load prompts to avoid importing @clack/prompts on every run)
      const { promptSkillLocation, resolveAndPrepareSkillDir } = await import('../prompts/skillPrompts.js');
      if (cliOptions.skillOutput && !cliOptions.skillDir) {
        // Non-interactive mode: use provided path directly
        cliOptions.skillDir = await resolveAndPrepareSkillDir(cliOptions.skillOutput, cwd, cliOptions.force ?? false);
      } else if (!cliOptions.skillDir) {
        // Interactive mode: prompt for skill location
        const promptResult = await promptSkillLocation(cliOptions.skillName, cwd);
        cliOptions.skillDir = promptResult.skillDir;
      }
    }

    // Handle stdin processing in main process (before sending task to worker)
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

      const { readFilePathsFromStdin } = await import('../../core/file/fileStdin.js');
      const stdinResult = await readFilePathsFromStdin(cwd);
      stdinFilePaths = stdinResult.filePaths;
      logger.trace(`Read ${stdinFilePaths.length} file paths from stdin in main process`);
    }

    let packResult: PackResult;

    // Await the task runner promise (resolves to TaskRunner when child process is needed,
    // undefined otherwise). The child process has been loading modules in the background
    // since the promise was created above.
    const taskRunner = taskRunnerPromise ? await taskRunnerPromise : undefined;

    if (taskRunner) {
      // Child process path: run pack() in a child process with spinner
      await waitForWorkerReady(taskRunner);

      const task: DefaultActionTask = {
        directories,
        cwd,
        config,
        cliOptions,
        stdinFilePaths,
      };

      const result = (await taskRunner.run(task)) as DefaultActionWorkerResult;
      packResult = result.packResult;
    } else {
      // Direct execution path: run pack() in the main process.
      // Skips child process spawn + module re-loading (~200ms) since no spinner is needed.
      // packagerPromise is always defined when taskRunner is undefined (the else branch)
      const packagerModule = await (packagerPromise as Promise<typeof import('../../core/packager.js')>);
      const { pack } = packagerModule;
      const { skillName, skillDir, skillProjectName, skillSourceUrl } = cliOptions;
      const packOptions = { skillName, skillDir, skillProjectName, skillSourceUrl };
      const targetPaths = directories.map((directory) => path.resolve(cwd, directory));

      packResult = await pack(targetPaths, config, () => {}, {}, stdinFilePaths, packOptions);
    }

    // Report results in main process
    reportResults(cwd, packResult, config, cliOptions);

    return {
      packResult,
      config,
    };
  } finally {
    // Always cleanup worker pool (if created)
    const taskRunner = taskRunnerPromise ? await taskRunnerPromise.catch(() => undefined) : undefined;
    if (taskRunner) {
      await taskRunner.cleanup();
    }
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
export const buildCliConfig = async (options: CliOptions): Promise<RepomixConfigCli> => {
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

  if (options.splitOutput !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      splitOutput: options.splitOutput,
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

  if (options.tokenCountTree !== undefined) {
    cliConfig.output = {
      ...cliConfig.output,
      tokenCountTree: options.tokenCountTree,
    };
  }

  // Skill generation
  if (options.skillGenerate !== undefined) {
    cliConfig.skillGenerate = options.skillGenerate;
  }

  try {
    // Lazy-load Zod schema to defer ~50ms Zod module initialization
    // until CLI config validation is actually needed (not at module import time)
    const { repomixConfigCliSchema } = await import('../../config/configSchema.js');
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

/**
 * Validates that conflicting CLI options are not used together.
 * Throws RepomixError if incompatible options are detected.
 */
const validateConflictingOptions = (config: RepomixConfigMerged): void => {
  const isStdoutMode = config.output.stdout || config.output.filePath === '-';

  // Define option states for conflict checking
  const options = {
    splitOutput: {
      enabled: config.output.splitOutput !== undefined,
      name: '--split-output',
    },
    skillGenerate: {
      enabled: config.skillGenerate !== undefined,
      name: '--skill-generate',
    },
    stdout: {
      enabled: isStdoutMode,
      name: '--stdout',
    },
    copy: {
      enabled: config.output.copyToClipboard,
      name: '--copy',
    },
  };

  // Define conflicts: [optionA, optionB, errorMessage]
  const conflicts: [keyof typeof options, keyof typeof options, string][] = [
    ['splitOutput', 'stdout', 'Split output requires writing to filesystem.'],
    ['splitOutput', 'skillGenerate', 'Skill output is a directory.'],
    ['splitOutput', 'copy', 'Split output generates multiple files.'],
    ['skillGenerate', 'stdout', 'Skill output requires writing to filesystem.'],
    ['skillGenerate', 'copy', 'Skill output is a directory and cannot be copied to clipboard.'],
  ];

  for (const [optionA, optionB, message] of conflicts) {
    if (options[optionA].enabled && options[optionB].enabled) {
      throw new RepomixError(`${options[optionA].name} cannot be used with ${options[optionB].name}. ${message}`);
    }
  }
};
