import path from 'node:path';
import { loadConfig as loadC12Config } from 'c12';
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

// Config file name pattern: repomix.config.{ext}
// c12 searches: {cwd}/repomix.config.{ext}, {cwd}/.config/repomix.{ext}, {cwd}/.config/repomix.config.{ext}
const CONFIG_NAME = 'repomix';
const CONFIG_FILE_PATTERN = 'repomix.config';

// c12 base options that disable features we don't use yet.
// RC files, package.json, extends, env-specific config, and dotenv
// can be implemented in follow-up PRs.
const c12BaseOptions: Parameters<typeof loadC12Config>[0] = {
  rcFile: false as const,
  globalRc: false,
  packageJson: false,
  envName: false as const,
  dotenv: false,
  extend: false as const,
  omit$Keys: true,
};

// Loads a config from a directory using c12's file discovery.
// c12 automatically searches for repomix.config.{js,ts,mjs,cjs,mts,cts,json,jsonc,json5,yaml,yml,toml}
// in both the directory root and the .config/ subdirectory.
const loadConfigFromC12 = async (
  cwd: string,
  configFile?: string,
  deps: { c12Load: typeof loadC12Config } = { c12Load: loadC12Config },
): Promise<{ config: Record<string, unknown> | null; configFile?: string }> => {
  const {
    config,
    configFile: resolvedConfigFile,
    _configFile,
  } = await deps.c12Load({
    name: CONFIG_NAME,
    cwd,
    configFile: configFile ?? CONFIG_FILE_PATTERN,
    ...c12BaseOptions,
  });

  // c12 always returns a truthy `configFile` (the resolved pattern path),
  // but `_configFile` is only set when an actual file was loaded from disk.
  if (!_configFile) {
    return { config: null };
  }

  return {
    config: config as Record<string, unknown>,
    configFile: resolvedConfigFile,
  };
};

// Validates raw config from c12 against the Repomix file schema
const validateConfig = (config: unknown, filePath: string): RepomixConfigFile => {
  try {
    return repomixConfigFileSchema.parse(config);
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

export const loadFileConfig = async (
  rootDir: string,
  argConfigPath: string | null,
  options: { skipLocalConfig?: boolean } = {},
  deps: { c12Load: typeof loadC12Config } = { c12Load: loadC12Config },
): Promise<RepomixConfigFile> => {
  if (argConfigPath) {
    // Explicit --config flag is always respected (user's intentional choice)
    const fullPath = path.resolve(rootDir, argConfigPath);
    const normalizedFullPath = path.normalize(fullPath);
    logger.trace('Loading config from explicit path:', fullPath);

    try {
      // Use c12 to load the specific config file.
      // Pass the full basename (with extension) so c12's tryResolve matches the exact file
      // via exsolve's resolveModulePath, which tries the exact path before appending extensions.
      const result = await loadConfigFromC12(path.dirname(fullPath), path.basename(fullPath), {
        c12Load: deps.c12Load,
      });

      if (result.config != null && result.configFile) {
        const resolvedConfigPath = path.normalize(path.resolve(result.configFile));

        // Explicit --config must load the exact file the user requested.
        if (resolvedConfigPath !== normalizedFullPath) {
          throw new RepomixError(`Config file not found at ${argConfigPath}`);
        }

        return validateConfig(result.config, fullPath);
      }
    } catch (error) {
      rethrowValidationErrorIfZodError(error, 'Invalid config schema');
      if (error instanceof RepomixError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new RepomixError(`Invalid syntax in config file ${argConfigPath}: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new RepomixError(`Error loading config from ${argConfigPath}: ${error.message}`);
      }
      throw new RepomixError(`Error loading config from ${argConfigPath}: ${String(error)}`);
    }

    throw new RepomixError(`Config file not found at ${argConfigPath}`);
  }

  // Try to find a local config file using c12's discovery
  // c12 searches: repomix.config.{ext} in root, .config/repomix.{ext}, .config/repomix.config.{ext}
  // SECURITY: Skip entirely when skipLocalConfig is true (remote mode) because c12
  // executes JS/TS config files during loading, which could run arbitrary code from
  // untrusted repositories.
  if (options.skipLocalConfig) {
    logger.note(
      'Skipping local config file discovery for security (remote repository).\n' +
        'Use --remote-trust-config to trust and load local config files.',
    );
  } else {
    try {
      const localResult = await loadConfigFromC12(rootDir, undefined, { c12Load: deps.c12Load });

      if (localResult.config != null && localResult.configFile) {
        logger.trace('Found local config at:', localResult.configFile);
        return validateConfig(localResult.config, localResult.configFile);
      }
    } catch (error) {
      rethrowValidationErrorIfZodError(error, 'Invalid config schema');
      if (error instanceof RepomixError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new RepomixError(`Invalid syntax in local config: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new RepomixError(`Error loading local config: ${error.message}`);
      }
      throw new RepomixError(`Error loading local config: ${String(error)}`);
    }
  }

  // Try to find a global config file using c12's discovery
  const globalDir = getGlobalDirectory();
  try {
    const globalResult = await loadConfigFromC12(globalDir, undefined, { c12Load: deps.c12Load });

    if (globalResult.config != null && globalResult.configFile) {
      logger.trace('Found global config at:', globalResult.configFile);
      return validateConfig(globalResult.config, globalResult.configFile);
    }
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid config schema');
    if (error instanceof RepomixError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new RepomixError(`Invalid syntax in global config: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new RepomixError(`Error loading global config: ${error.message}`);
    }
    throw new RepomixError(`Error loading global config: ${String(error)}`);
  }

  if (!options.skipLocalConfig) {
    logger.log(
      pc.dim(
        `No custom config found. Searched for ${CONFIG_FILE_PATTERN}.{js,ts,json,...} and .config/${CONFIG_NAME}.{js,ts,json,...}\n` +
          `Also checked global config at ${globalDir}.\n` +
          'You can add a config file for additional settings. Please check https://github.com/yamadashy/repomix for more information.',
      ),
    );
  }
  return {};
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

      // Auto-adjust filePath extension to match style when filePath is not explicitly set
      const style = mergedOutput.style ?? baseConfig.output.style;
      const filePathExplicitlySet = Boolean(fileConfig.output?.filePath || cliConfig.output?.filePath);

      if (!filePathExplicitlySet) {
        const desiredPath = defaultFilePathMap[style];
        if (mergedOutput.filePath !== desiredPath) {
          mergedOutput.filePath = desiredPath;
          logger.trace('Adjusted output file path to match style:', mergedOutput.filePath);
        }
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
    // Skill generation (CLI only)
    ...(cliConfig.skillGenerate !== undefined && { skillGenerate: cliConfig.skillGenerate }),
  };

  try {
    return repomixConfigMergedSchema.parse(mergedConfig);
  } catch (error) {
    rethrowValidationErrorIfZodError(error, 'Invalid merged config');
    throw error;
  }
};
