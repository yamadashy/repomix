import path from 'node:path';
import { loadFileConfig, mergeConfigs } from '../../config/configLoad.js';
import {
  type RepomixConfigCli,
  type RepomixConfigFile,
  type RepomixConfigMerged,
  type RepomixOutputStyle,
  repomixConfigCliSchema,
} from '../../config/configSchema.js';
import { readFilePathsFromStdin } from '../../core/file/fileStdin.js';
import { type PackResult, pack } from '../../core/packager.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { rethrowValidationErrorIfZodError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { splitPatterns } from '../../shared/patternUtils.js';
import { reportResults } from '../cliReport.js';
import { Spinner } from '../cliSpinner.js';
import type { CliOptions } from '../types.js';
import { runMigrationAction } from './migrationAction.js';

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

  // Load the config file
  const fileConfig: RepomixConfigFile = await loadFileConfig(cwd, cliOptions.config ?? null);
  logger.trace('Loaded file config:', fileConfig);

  // Parse the CLI options into a config
  const cliConfig: RepomixConfigCli = buildCliConfig(cliOptions);
  logger.trace('CLI config:', cliConfig);

  // Merge default, file, and CLI configs
  const config: RepomixConfigMerged = mergeConfigs(cwd, fileConfig, cliConfig);
  logger.trace('Merged config:', config);

  // Initialize spinner that can be shared across operations
  const spinner = new Spinner('Initializing...', cliOptions);
  spinner.start();

  const result = cliOptions.stdin
    ? await handleStdinProcessing(directories, cwd, config, spinner)
    : await handleDirectoryProcessing(directories, cwd, config, spinner);

  spinner.succeed('Packing completed successfully!');

  const packResult = result.packResult;

  reportResults(cwd, packResult, config);

  return {
    packResult,
    config,
  };
};

/**
 * Handles stdin processing workflow for file paths input.
 */
export const handleStdinProcessing = async (
  directories: string[],
  cwd: string,
  config: RepomixConfigMerged,
  spinner: Spinner,
): Promise<DefaultActionRunnerResult> => {
  // Validate directory arguments for stdin mode
  const firstDir = directories[0] ?? '.';
  if (directories.length > 1 || firstDir !== '.') {
    throw new RepomixError(
      'When using --stdin, do not specify directory arguments. File paths will be read from stdin.',
    );
  }

  let packResult: PackResult;

  try {
    const stdinResult = await readFilePathsFromStdin(cwd);

    // Use pack with predefined files from stdin
    packResult = await pack(
      [cwd],
      config,
      (message) => {
        spinner.update(message);
      },
      {},
      stdinResult.filePaths,
    );
  } catch (error) {
    spinner.fail('Error reading from stdin or during packing');
    throw error;
  }

  return {
    packResult,
    config,
  };
};

/**
 * Handles normal directory processing workflow.
 */
export const handleDirectoryProcessing = async (
  directories: string[],
  cwd: string,
  config: RepomixConfigMerged,
  spinner: Spinner,
): Promise<DefaultActionRunnerResult> => {
  const targetPaths = directories.map((directory) => path.resolve(cwd, directory));

  let packResult: PackResult;

  try {
    packResult = await pack(targetPaths, config, (message) => {
      spinner.update(message);
    });
  } catch (error) {
    spinner.fail('Error during packing');
    throw error;
  }

  return {
    packResult,
    config,
  };
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
  if (options.ignoreContent) {
    cliConfig.ignoreContent = splitPatterns(options.ignoreContent);
  }
  // Only apply gitignore setting if explicitly set to false
  if (options.gitignore === false) {
    cliConfig.ignore = { ...cliConfig.ignore, useGitignore: options.gitignore };
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

  try {
    return repomixConfigCliSchema.parse(cliConfig);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid cli arguments');
    throw error;
  }
};
