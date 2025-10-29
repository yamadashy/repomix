import * as fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
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

const defaultConfigPaths = [
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

export const loadFileConfig = async (
  rootDir: string,
  argConfigPath: string | null,
  projectName?: string,
): Promise<RepomixConfigFile> => {
  if (argConfigPath) {
    // If a specific config path is provided, use it directly
    const fullPath = path.resolve(rootDir, argConfigPath);
    logger.trace('Loading local config from:', fullPath);

    const isLocalFileExists = await checkFileExists(fullPath);

    if (isLocalFileExists) {
      return await loadAndValidateConfig(fullPath, projectName);
    }
    throw new RepomixError(`Config file not found at ${argConfigPath}`);
  }

  // Try to find a local config file using the priority order
  const localConfigPaths = defaultConfigPaths.map((configPath) => path.resolve(rootDir, configPath));
  const localConfigPath = await findConfigFile(localConfigPaths, 'local');

  if (localConfigPath) {
    return await loadAndValidateConfig(localConfigPath, projectName);
  }

  // Try to find a global config file using the priority order
  const globalConfigPaths = getGlobalConfigPaths();
  const globalConfigPath = await findConfigFile(globalConfigPaths, 'global');

  if (globalConfigPath) {
    return await loadAndValidateConfig(globalConfigPath, projectName);
  }

  if (projectName) {
    throw new RepomixError(
      `Cannot use --project option: No config file found. Please create a config file with a "projects" field.`,
    );
  }

  logger.log(
    pc.dim(
      `No custom config found at ${defaultConfigPaths.join(', ')} or global config at ${globalConfigPaths.join(', ')}.\nYou can add a config file for additional settings. Please check https://github.com/yamadashy/repomix for more information.`,
    ),
  );
  return {};
};

const getFileExtension = (filePath: string): string => {
  const match = filePath.match(/\.(ts|mts|cts|js|mjs|cjs|json5|jsonc|json)$/);
  return match ? match[1] : '';
};

const loadAndValidateConfig = async (filePath: string, projectName?: string): Promise<RepomixConfigFile> => {
  try {
    let config: unknown;
    const ext = getFileExtension(filePath);

    switch (ext) {
      case 'ts':
      case 'mts':
      case 'cts':
      case 'js':
      case 'mjs':
      case 'cjs': {
        // Use jiti for TypeScript and JavaScript files
        // This provides consistent behavior and avoids Node.js module cache issues
        const jiti = createJiti(import.meta.url, {
          moduleCache: false, // Disable cache to ensure fresh config loads
          interopDefault: true, // Automatically use default export
        });
        config = await jiti.import(pathToFileURL(filePath).href);
        break;
      }

      case 'json5':
      case 'jsonc':
      case 'json': {
        // Use JSON5 for JSON/JSON5/JSONC files
        const fileContent = await fs.readFile(filePath, 'utf-8');
        config = JSON5.parse(fileContent);
        break;
      }

      default:
        throw new RepomixError(`Unsupported config file format: ${filePath}`);
    }

    const validatedConfig = repomixConfigFileSchema.parse(config);

    if (projectName) {
      if (!validatedConfig.projects) {
        throw new RepomixError(`Project "${projectName}" not found: Config file does not contain a "projects" field.`);
      }

      const projectConfig = validatedConfig.projects[projectName];
      if (!projectConfig) {
        const availableProjects = Object.keys(validatedConfig.projects).join(', ');
        throw new RepomixError(
          `Project "${projectName}" not found in config file. Available projects: ${availableProjects}`,
        );
      }

      logger.trace(`Using project config: ${projectName}`);
      return projectConfig;
    }

    if (validatedConfig.projects) {
      const defaultProject = validatedConfig.projects.default;
      if (defaultProject) {
        logger.trace('Using default project config');
        return defaultProject;
      }

      const projectNames = Object.keys(validatedConfig.projects);
      throw new RepomixError(
        `Config file uses "projects" format but no project was specified and no "default" project exists. Available projects: ${projectNames.join(', ')}. Use --project <name> to specify a project.`,
      );
    }

    return validatedConfig;
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid config schema');
    if (error instanceof SyntaxError) {
      throw new RepomixError(`Invalid syntax in config file ${filePath}: ${error.message}`);
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

  const mergedConfig = {
    cwd,
    input: {
      ...baseConfig.input,
      ...fileConfig.input,
      ...cliConfig.input,
    },
    output: (() => {
      const mergedOutput = {
        ...baseConfig.output,
        ...fileConfig.output,
        ...cliConfig.output,
        git: {
          ...baseConfig.output.git,
          ...fileConfig.output?.git,
          ...cliConfig.output?.git,
        },
      };

      if (mergedOutput.filePath == null) {
        const style = mergedOutput.style ?? baseConfig.output.style;
        mergedOutput.filePath = defaultFilePathMap[style];
        logger.trace('Default output file path is set to:', mergedOutput.filePath);
      }

      return mergedOutput;
    })(),
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
    tokenCount: {
      ...baseConfig.tokenCount,
      ...fileConfig.tokenCount,
      ...cliConfig.tokenCount,
    },
  };

  try {
    return repomixConfigMergedSchema.parse(mergedConfig);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid merged config');
    throw error;
  }
};
