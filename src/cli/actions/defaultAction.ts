import fs from 'node:fs';
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
import { printCompletion, printSecurityCheck, printSummary, printTopFiles } from '../cliPrint.js';
import { Spinner } from '../cliSpinner.js';
import type { CliOptions } from '../types.js';
import { runMigrationAction } from './migrationAction.js';

/**
 * Determines if stdin should be auto-detected based on the arguments.
 */
const shouldAutoDetectStdin = (directories: string[]): boolean => {
  // Check if '-' is explicitly used (Unix convention)
  if (directories.length === 1 && directories[0] === '-') {
    return true;
  }

  // Check if default directory is used and stdin has piped data
  const isDefaultDirectory = directories.length === 1 && directories[0] === '.';

  // Use file descriptor check as a more reliable method than process.stdin.isTTY
  // which can be undefined in some environments (like CI/CD or certain shells)
  let hasStdinInput = false;
  try {
    // Check if stdin (file descriptor 0) is a FIFO (pipe)
    hasStdinInput = fs.fstatSync(0).isFIFO();
  } catch {
    // Fallback to process.stdin.isTTY if fstat fails
    hasStdinInput = process.stdin.isTTY === false;
  }

  // Only auto-detect stdin if we have both conditions:
  // 1. Using the default directory
  // 2. Actually receiving piped input
  return isDefaultDirectory && hasStdinInput;
};

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

  // Route to appropriate processing workflow
  if (shouldAutoDetectStdin(directories)) {
    return handleStdinProcessing(directories, cwd, config, cliOptions);
  }

  return handleDirectoryProcessing(directories, cwd, config, cliOptions);
};

/**
 * Handles stdin processing workflow for file paths input.
 */
export const handleStdinProcessing = async (
  directories: string[],
  cwd: string,
  config: RepomixConfigMerged,
  cliOptions: CliOptions,
): Promise<DefaultActionRunnerResult> => {
  // Validate directory arguments for stdin mode
  const firstDir = directories[0] ?? '.';
  const isDashArg = firstDir === '-';
  // Allow '-' argument or default '.' for auto-detection, but not multiple directories
  if (directories.length > 1 || (!isDashArg && firstDir !== '.')) {
    throw new RepomixError(
      'When using stdin input, do not specify directory arguments. File paths will be read from stdin.',
    );
  }

  const spinner = new Spinner('Reading file paths from stdin...', cliOptions);
  spinner.start();

  let packResult: PackResult;

  try {
    const stdinResult = await readFilePathsFromStdin(cwd);

    spinner.update('Packing files...');

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

  spinner.succeed('Packing completed successfully!');

  printResults(cwd, packResult, config);

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
  cliOptions: CliOptions,
): Promise<DefaultActionRunnerResult> => {
  const targetPaths = directories.map((directory) => path.resolve(cwd, directory));

  const spinner = new Spinner('Packing files...', cliOptions);
  spinner.start();

  let packResult: PackResult;

  try {
    packResult = await pack(targetPaths, config, (message) => {
      spinner.update(message);
    });
  } catch (error) {
    spinner.fail('Error during packing');
    throw error;
  }

  spinner.succeed('Packing completed successfully!');

  printResults(cwd, packResult, config);

  return {
    packResult,
    config,
  };
};

/**
 * Prints the results of packing operation including top files, security check, summary, and completion.
 */
const printResults = (cwd: string, packResult: PackResult, config: RepomixConfigMerged): void => {
  logger.log('');

  if (config.output.topFilesLength > 0) {
    printTopFiles(
      packResult.fileCharCounts,
      packResult.fileTokenCounts,
      config.output.topFilesLength,
      packResult.totalTokens,
    );
    logger.log('');
  }

  printSecurityCheck(cwd, packResult.suspiciousFilesResults, packResult.suspiciousGitDiffResults, config);
  logger.log('');

  printSummary(packResult, config);
  logger.log('');

  printCompletion();
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

  try {
    return repomixConfigCliSchema.parse(cliConfig);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid cli arguments');
    throw error;
  }
};
