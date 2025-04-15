import path from "node:path";
import { loadFileConfig, mergeConfigs } from "../../config/configLoad.js";
import {
  type RepomixConfigCli,
  type RepomixConfigFile,
  type RepomixConfigMerged,
  type RepomixOutputStyle,
  repomixConfigCliSchema,
} from "../../config/configSchema.js";
import { type PackResult, pack } from "../../core/packager.js";
import { rethrowValidationErrorIfZodError } from "../../shared/errorHandle.js";
import { logger } from "../../shared/logger.js";
import {
  printSecurityCheck,
  printSummary,
  printTopFiles,
} from "../cliPrint.js";
import { Spinner } from "../cliSpinner.js";
import type { CliOptions } from "../types.js";
import { runMigrationAction } from "./migrationAction.js";

export interface DefaultActionRunnerResult {
  packResult: PackResult;
  config: RepomixConfigMerged;
}

export const runDefaultAction = async (
  directories: string[],
  cwd: string,
  cliOptions: CliOptions
): Promise<DefaultActionRunnerResult> => {
  logger.trace("Loaded CLI options:", cliOptions);

  // Run migration before loading config
  await runMigrationAction(cwd);

  // Load the config file
  const fileConfig: RepomixConfigFile = await loadFileConfig(
    cwd,
    cliOptions.config ?? null
  );
  logger.trace("Loaded file config:", fileConfig);

  // Parse the CLI options into a config
  const cliConfig: RepomixConfigCli = buildCliConfig(cliOptions);
  logger.trace("CLI config:", cliConfig);

  // Merge default, file, and CLI configs
  const config: RepomixConfigMerged = mergeConfigs(cwd, fileConfig, cliConfig);

  logger.trace("Merged config:", config);

  const targetPaths = directories.map((directory) =>
    path.resolve(cwd, directory)
  );

  const spinner = new Spinner("Packing files...", cliOptions);
  spinner.start();

  let packResult: PackResult;

  try {
    packResult = await pack(targetPaths, config, (message) => {
      spinner.update(message);
    });
  } catch (error) {
    spinner.fail("Error during packing");
    throw error;
  }

  spinner.stop("");

  if (config.output.topFilesLength > 0) {
    printTopFiles(
      packResult.fileLineCounts,
      packResult.fileTokenCounts,
      config.output.topFilesLength
    );
    logger.log("");
  }

  printSecurityCheck(cwd, packResult.suspiciousFilesResults, config);

  printSummary(
    packResult.totalFiles,
    packResult.totalTokens,
    packResult.totalLines,
    config.output.filePath,
    packResult.suspiciousFilesResults,
    config
  );

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
    cliConfig.include = options.include
      .split(",")
      .map((pattern) => pattern.trim());
  }
  if (options.ignore) {
    cliConfig.ignore = {
      customPatterns: options.ignore
        .split(",")
        .map((pattern) => pattern.trim()),
    };
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

  try {
    return repomixConfigCliSchema.parse(cliConfig);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, "Invalid cli arguments");
    throw error;
  }
};
