import fs from 'node:fs/promises';
import path from 'node:path';
import * as prompts from '@clack/prompts';
import { stringifyTOML } from 'confbox/toml';
import { stringifyYAML } from 'confbox/yaml';
import pc from 'picocolors';
import {
  defaultConfig,
  defaultFilePathMap,
  type RepomixConfigFile,
  type RepomixOutputStyle,
} from '../../config/configSchema.js';
import { getGlobalDirectory } from '../../config/globalDirectory.js';
import { logger } from '../../shared/logger.js';

type ConfigFormat = 'json' | 'yaml' | 'toml' | 'ts' | 'js';
type ConfigLocation = 'root' | 'dotconfig' | 'dotconfig-full';

const CONFIG_FORMAT_EXTENSIONS: Record<ConfigFormat, string> = {
  json: '.json',
  yaml: '.yaml',
  toml: '.toml',
  ts: '.ts',
  js: '.js',
};

const serializeConfig = (config: RepomixConfigFile, format: ConfigFormat): string => {
  switch (format) {
    case 'json':
      return JSON.stringify(config, null, 2);
    case 'yaml':
      return stringifyYAML(config);
    case 'toml':
      return stringifyTOML(config as Record<string, unknown>);
    case 'ts': {
      const { $schema: _schema, ...configWithoutSchema } = config;
      return [
        "import { defineConfig } from 'repomix';",
        '',
        `export default defineConfig(${JSON.stringify(configWithoutSchema, null, 2)});`,
        '',
      ].join('\n');
    }
    case 'js': {
      const { $schema: _schema, ...configWithoutSchema } = config;
      return [`export default ${JSON.stringify(configWithoutSchema, null, 2)};`, ''].join('\n');
    }
  }
};

const onCancelOperation = () => {
  prompts.cancel('Initialization cancelled.');
  process.exit(0);
};

export const runInitAction = async (rootDir: string, isGlobal: boolean): Promise<void> => {
  prompts.intro(pc.bold(`Welcome to Repomix ${isGlobal ? 'Global ' : ''}Configuration!`));

  try {
    // Step 1: Ask if user wants to create a config file
    const isCreatedConfig = await createConfigFile(rootDir, isGlobal);

    // Step 2: Ask if user wants to create a .repomixignore file
    const isCreatedIgnoreFile = await createIgnoreFile(rootDir, isGlobal);

    if (!isCreatedConfig && !isCreatedIgnoreFile) {
      prompts.outro(
        pc.yellow('No files were created. You can run this command again when you need to create configuration files.'),
      );
    } else {
      prompts.outro(pc.green('Initialization complete! You can now use Repomix with your specified settings.'));
    }
  } catch (error) {
    logger.error('An error occurred during initialization:', error);
  }
};

export const createConfigFile = async (rootDir: string, isGlobal: boolean): Promise<boolean> => {
  const isCreateConfig = await prompts.confirm({
    message: `Do you want to create a ${isGlobal ? 'global ' : ''}Repomix config file?`,
  });
  if (!isCreateConfig) {
    prompts.log.info('Skipping config file creation.');
    return false;
  }
  if (prompts.isCancel(isCreateConfig)) {
    onCancelOperation();
    return false;
  }

  // Ask where to place the config file (skip for global — always uses global dir)
  let configDir: string;
  let configLocation: ConfigLocation;

  if (isGlobal) {
    configDir = getGlobalDirectory();
    configLocation = 'root';
  } else {
    const locationResult = await prompts.select({
      message: 'Where should the config file be placed?',
      options: [
        { value: 'root', label: 'Project root', hint: 'repomix.config.*' },
        { value: 'dotconfig', label: '.config/ directory (short)', hint: '.config/repomix.*' },
        { value: 'dotconfig-full', label: '.config/ directory (full)', hint: '.config/repomix.config.*' },
      ],
      initialValue: 'root' as ConfigLocation,
    });
    if (prompts.isCancel(locationResult)) {
      onCancelOperation();
      return false;
    }
    configLocation = locationResult;
    configDir = configLocation === 'root' ? rootDir : path.resolve(rootDir, '.config');
  }

  // Ask which format to use
  const formatResult = await prompts.select({
    message: 'Config file format:',
    options: [
      { value: 'json', label: 'JSON', hint: 'Simple and widely supported' },
      { value: 'yaml', label: 'YAML', hint: 'Human-friendly with comments support' },
      { value: 'toml', label: 'TOML', hint: 'Clean syntax, popular for config files' },
      { value: 'ts', label: 'TypeScript', hint: 'Type-safe with IDE autocomplete (requires repomix as dev dep)' },
      { value: 'js', label: 'JavaScript', hint: 'Dynamic values, no type checking needed' },
    ],
    initialValue: 'json' as ConfigFormat,
  });
  if (prompts.isCancel(formatResult)) {
    onCancelOperation();
    return false;
  }
  const configFormat = formatResult;

  // Build filename based on location and format
  const ext = CONFIG_FORMAT_EXTENSIONS[configFormat];
  const configFileName = configLocation === 'dotconfig' ? `repomix${ext}` : `repomix.config${ext}`;

  const configPath = path.resolve(configDir, configFileName);

  let isConfigFileExists = false;
  try {
    await fs.access(configPath);
    isConfigFileExists = true;
  } catch {
    // File doesn't exist, so we can proceed
  }

  if (isConfigFileExists) {
    const isOverwrite = await prompts.confirm({
      message: `A ${isGlobal ? 'global ' : ''}${pc.green(configFileName)} file already exists. Do you want to overwrite it?`,
    });
    if (!isOverwrite) {
      prompts.log.info(`Skipping ${pc.green(configFileName)} file creation.`);
      return false;
    }
    if (prompts.isCancel(isOverwrite)) {
      onCancelOperation();
      return false;
    }
  }

  const options = await prompts.group(
    {
      outputStyle: () => {
        return prompts.select({
          message: 'Output style:',
          options: [
            { value: 'xml', label: 'XML', hint: 'Structured XML format' },
            { value: 'markdown', label: 'Markdown', hint: 'Markdown format' },
            { value: 'json', label: 'JSON', hint: 'Machine-readable JSON format' },
            { value: 'plain', label: 'Plain', hint: 'Simple text format' },
          ],
          initialValue: defaultConfig.output.style,
        });
      },
      outputFilePath: ({ results }) => {
        const defaultFilePath = defaultFilePathMap[results.outputStyle as RepomixOutputStyle];
        return prompts.text({
          message: 'Output file path:',
          initialValue: defaultFilePath,
          validate: (value) => (value.length === 0 ? 'Output file path is required' : undefined),
        });
      },
    },
    {
      onCancel: onCancelOperation,
    },
  );

  const config: RepomixConfigFile = {
    $schema: 'https://repomix.com/schemas/latest/schema.json',
    ...defaultConfig,
    output: {
      ...defaultConfig.output,
      filePath: options.outputFilePath as string,
      style: options.outputStyle as RepomixOutputStyle,
    },
  };

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, serializeConfig(config, configFormat));

  const relativeConfigPath = path.relative(rootDir, configPath);

  prompts.log.success(
    pc.green(`${isGlobal ? 'Global config' : 'Config'} file created!\n`) + pc.dim(`Path: ${relativeConfigPath}`),
  );

  return true;
};

export const createIgnoreFile = async (rootDir: string, isGlobal: boolean): Promise<boolean> => {
  if (isGlobal) {
    prompts.log.info(`Skipping ${pc.green('.repomixignore')} file creation for global configuration.`);
    return false;
  }

  const ignorePath = path.resolve(rootDir, '.repomixignore');
  const createIgnore = await prompts.confirm({
    message: `Do you want to create a ${pc.green('.repomixignore')} file?`,
  });
  if (!createIgnore) {
    prompts.log.info(`Skipping ${pc.green('.repomixignore')} file creation.`);
    return false;
  }
  if (prompts.isCancel(createIgnore)) {
    onCancelOperation();
    return false;
  }

  let isIgnoreFileExists = false;
  try {
    await fs.access(ignorePath);
    isIgnoreFileExists = true;
  } catch {
    // File doesn't exist, so we can proceed
  }

  if (isIgnoreFileExists) {
    const overwrite = await prompts.confirm({
      message: `A ${pc.green('.repomixignore')} file already exists. Do you want to overwrite it?`,
    });

    if (!overwrite) {
      prompts.log.info(`${pc.green('.repomixignore')} file creation skipped. Existing file will not be modified.`);
      return false;
    }
  }

  const defaultIgnoreContent = `# Add patterns to ignore here, one per line
# Example:
# *.log
# tmp/
`;

  await fs.writeFile(ignorePath, defaultIgnoreContent);
  prompts.log.success(
    pc.green('Created .repomixignore file!\n') + pc.dim(`Path: ${path.relative(rootDir, ignorePath)}`),
  );

  return true;
};
