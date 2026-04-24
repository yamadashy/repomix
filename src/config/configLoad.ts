import * as fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import JSON5 from 'json5';
import pc from 'picocolors';
import * as v from 'valibot';
import { RepomixError, rethrowValidationErrorIfSchemaError } from '../shared/errorHandle.js';
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

// Default jiti import implementation for loading JS/TS config files
// Lazy-loads jiti to avoid importing its heavy TypeScript toolchain
// when using JSON/JSON5 config files or default config (the common case).
// We deliberately do not pass `interopDefault`; the call site below handles
// the ESM namespace `{ default: config }` unwrap explicitly so the behavior
// is the same for .ts / .mts / .js / .mjs / .cjs inputs.
const defaultJitiImport = async (fileUrl: string): Promise<unknown> => {
  const { createJiti } = await import('jiti');
  const jiti = createJiti(import.meta.url, {
    moduleCache: false, // Disable cache to ensure fresh config loads
  });
  return await jiti.import(fileUrl);
};

export const loadFileConfig = async (
  rootDir: string,
  argConfigPath: string | null,
  options: { skipLocalConfig?: boolean } = {},
  deps = {
    jitiImport: defaultJitiImport,
  },
): Promise<RepomixConfigFile> => {
  if (argConfigPath) {
    // Explicit --config flag is always respected (user's intentional choice)
    const fullPath = path.resolve(rootDir, argConfigPath);
    logger.trace('Loading local config from:', fullPath);

    const isLocalFileExists = await checkFileExists(fullPath);

    if (isLocalFileExists) {
      return await loadAndValidateConfig(fullPath, deps);
    }
    throw new RepomixError(`Config file not found at ${argConfigPath}`);
  }

  // Try to find a local config file using the priority order
  const localConfigPaths = defaultConfigPaths.map((configPath) => path.resolve(rootDir, configPath));
  const localConfigPath = await findConfigFile(localConfigPaths, 'local');

  if (localConfigPath) {
    if (!options.skipLocalConfig) {
      return await loadAndValidateConfig(localConfigPath, deps);
    }
    // Log when config files are skipped for security (remote mode)
    logger.note(
      `Skipping config file found in remote repository for security: ${path.basename(localConfigPath)}\n` +
        'Use --remote-trust-config to trust and load it.',
    );
  }

  // Try to find a global config file using the priority order
  const globalConfigPaths = getGlobalConfigPaths();
  const globalConfigPath = await findConfigFile(globalConfigPaths, 'global');

  if (globalConfigPath) {
    return await loadAndValidateConfig(globalConfigPath, deps);
  }

  if (!options.skipLocalConfig) {
    logger.log(
      pc.dim(
        `No custom config found at ${defaultConfigPaths.join(', ')} or global config at ${globalConfigPaths.join(', ')}.\nYou can add a config file for additional settings. Please check https://github.com/yamadashy/repomix for more information.`,
      ),
    );
  }
  return {};
};

const getFileExtension = (filePath: string): string => {
  const match = filePath.match(/\.(ts|mts|cts|js|mjs|cjs|json5|jsonc|json)$/);
  return match ? match[1] : '';
};

// Dependency injection allows mocking jiti in tests to prevent double instrumentation.
// Without this, jiti transforms src/ files that are already instrumented by Vitest,
// causing coverage instability (results varied by ~2% on each test run).
const loadAndValidateConfig = async (
  filePath: string,
  deps = {
    jitiImport: defaultJitiImport,
  },
): Promise<RepomixConfigFile> => {
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
        const imported = await deps.jitiImport(pathToFileURL(filePath).href);
        // jiti.import returns a `{ default: ... }` wrapper for `export default {...}`
        // (both ESM Module namespaces and jiti's TS interop). Unwrap only when
        // `default` is itself an object — this preserves a CJS config that
        // legitimately exports `{ default: 'plain', ...rest }` as-is.
        // Known limitation: a CJS module exporting `{ default: { ... }, otherKey: ... }`
        // would still be treated as an ESM wrapper and `otherKey` would be discarded.
        // No known user hits this pattern; RepomixConfig has no `default` field.
        const defaultExport =
          imported && typeof imported === 'object' && 'default' in imported
            ? (imported as { default: unknown }).default
            : undefined;
        config = defaultExport && typeof defaultExport === 'object' ? defaultExport : imported;
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

    return v.parse(repomixConfigFileSchema, config);
  } catch (error) {
    rethrowValidationErrorIfSchemaError(error, 'Invalid config schema');
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
    return v.parse(repomixConfigMergedSchema, mergedConfig);
  } catch (error) {
    rethrowValidationErrorIfSchemaError(error, 'Invalid merged config');
    throw error;
  }
};
