import * as fs from 'node:fs/promises';
import path from 'node:path';
import JSON5 from 'json5';
import pc from 'picocolors';
import { RepomixError, rethrowValidationErrorIfZodError } from '../shared/errorHandle.js';
import { logger } from '../shared/logger.js';
import {
  defaultConfig,
  defaultFilePathMap,
  type RepomixConfigCli,
  type RepomixConfigFile,
  type RepomixConfigMerged,
  repomixConfigFileSchema,
  repomixConfigMergedSchema,
} from './configSchema.js';
import { getGlobalDirectory } from './globalDirectory.js';

const defaultConfigPaths = ['repomix.config.json5', 'repomix.config.jsonc', 'repomix.config.json'];

const getGlobalConfigPaths = () => {
  const globalDir = getGlobalDirectory();
  return defaultConfigPaths.map((configPath) => path.join(globalDir, configPath));
};

const checkFileExists = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
};

const findConfigFile = async (configPaths: string[], logPrefix: string): Promise<string | null> => {
  for (const configPath of configPaths) {
    logger.trace(`Checking for ${logPrefix} config at:`, configPath);

    const fileExists = await checkFileExists(configPath);

    if (fileExists) {
      logger.trace(`Found ${logPrefix} config at:`, configPath);
      return configPath;
    }
  }
  return null;
};

export const loadFileConfig = async (rootDir: string, argConfigPath: string | null): Promise<RepomixConfigFile> => {
  if (argConfigPath) {
    // If a specific config path is provided, use it directly
    const fullPath = path.resolve(rootDir, argConfigPath);
    logger.trace('Loading local config from:', fullPath);

    const isLocalFileExists = await checkFileExists(fullPath);

    if (isLocalFileExists) {
      return await loadAndValidateConfig(fullPath);
    }
    throw new RepomixError(`Config file not found at ${argConfigPath}`);
  }

  // Try to find a local config file using the priority order
  const localConfigPaths = defaultConfigPaths.map((configPath) => path.resolve(rootDir, configPath));
  const localConfigPath = await findConfigFile(localConfigPaths, 'local');

  if (localConfigPath) {
    return await loadAndValidateConfig(localConfigPath);
  }

  // Try to find a global config file using the priority order
  const globalConfigPaths = getGlobalConfigPaths();
  const globalConfigPath = await findConfigFile(globalConfigPaths, 'global');

  if (globalConfigPath) {
    return await loadAndValidateConfig(globalConfigPath);
  }

  logger.log(
    pc.dim(
      `No custom config found at ${defaultConfigPaths.join(', ')} or global config at ${globalConfigPaths.join(', ')}.\nYou can add a config file for additional settings. Please check https://github.com/yamadashy/repomix for more information.`,
    ),
  );
  return {};
};

const loadAndValidateConfig = async (filePath: string): Promise<RepomixConfigFile> => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const config = JSON5.parse(fileContent);
    return repomixConfigFileSchema.parse(config);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid config schema');
    if (error instanceof SyntaxError) {
      throw new RepomixError(`Invalid JSON5 in config file ${filePath}: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new RepomixError(`Error loading config from ${filePath}: ${error.message}`);
    }
    throw new RepomixError(`Error loading config from ${filePath}`);
  }
};

export const mergeConfigs = (
  cwd: string,
  fileConfig: RepomixConfigFile,
  cliConfig: RepomixConfigCli,
): RepomixConfigMerged => {
  logger.trace('Default config:', defaultConfig);

  const baseConfig = defaultConfig;

  // If the output file path is not provided in the config file or CLI, use the default file path for the style
  if (cliConfig.output?.filePath == null && fileConfig.output?.filePath == null) {
    const style = cliConfig.output?.style || fileConfig.output?.style || baseConfig.output.style;
    baseConfig.output.filePath = defaultFilePathMap[style];

    logger.trace('Default output file path is set to:', baseConfig.output.filePath);
  }

  const mergedConfig = {
    cwd,
    input: {
      ...baseConfig.input,
      ...fileConfig.input,
      ...cliConfig.input,
    },
    output: {
      ...baseConfig.output,
      ...fileConfig.output,
      ...cliConfig.output,
    },
    include: [...(baseConfig.include || []), ...(fileConfig.include || []), ...(cliConfig.include || [])],
    ignore: {
      ...baseConfig.ignore,
      ...fileConfig.ignore,
      ...cliConfig.ignore,
      customPatterns: [
        ...(baseConfig.ignore.customPatterns || []),
        ...(fileConfig.ignore?.customPatterns || []),
        ...(cliConfig.ignore?.customPatterns || []),
      ],
    },
    security: {
      ...baseConfig.security,
      ...fileConfig.security,
      ...cliConfig.security,
    },
  };

  try {
    return repomixConfigMergedSchema.parse(mergedConfig);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid merged config');
    throw error;
  }
};
