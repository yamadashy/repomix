import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import {
  defaultConfig,
  defaultFilePathMap,
  type RepomixConfigFile,
  type RepomixOutputStyle,
} from '../../config/configDefaults.js';
import { getGlobalDirectory } from '../../config/globalDirectory.js';
import { logger } from '../../shared/logger.js';

// Lazy-load @clack/prompts (~16ms) — only needed when --init is used,
// not on the default pack path.
let _prompts: typeof import('@clack/prompts') | undefined;
const getPrompts = async () => {
  if (!_prompts) {
    _prompts = await import('@clack/prompts');
  }
  return _prompts;
};

export const runInitAction = async (rootDir: string, isGlobal: boolean): Promise<void> => {
  const prompts = await getPrompts();

  const onCancel = () => {
    prompts.cancel('Initialization cancelled.');
    process.exit(0);
  };

  prompts.intro(pc.bold(`Welcome to Repomix ${isGlobal ? 'Global ' : ''}Configuration!`));

  try {
    // Step 1: Ask if user wants to create a config file
    const isCreatedConfig = await createConfigFile(rootDir, isGlobal, prompts, onCancel);

    // Step 2: Ask if user wants to create a .repomixignore file
    const isCreatedIgnoreFile = await createIgnoreFile(rootDir, isGlobal, prompts, onCancel);

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

export const createConfigFile = async (
  rootDir: string,
  isGlobal: boolean,
  prompts?: typeof import('@clack/prompts'),
  onCancel?: () => void,
): Promise<boolean> => {
  const p = prompts ?? (await getPrompts());
  const cancel =
    onCancel ??
    (() => {
      p.cancel('Initialization cancelled.');
      process.exit(0);
    });

  const configPath = path.resolve(isGlobal ? getGlobalDirectory() : rootDir, 'repomix.config.json');

  const isCreateConfig = await p.confirm({
    message: `Do you want to create a ${isGlobal ? 'global ' : ''}${pc.green('repomix.config.json')} file?`,
  });
  if (!isCreateConfig) {
    p.log.info(`Skipping ${pc.green('repomix.config.json')} file creation.`);
    return false;
  }
  if (p.isCancel(isCreateConfig)) {
    cancel();
    return false;
  }

  let isConfigFileExists = false;
  try {
    await fs.access(configPath);
    isConfigFileExists = true;
  } catch {
    // File doesn't exist, so we can proceed
  }

  if (isConfigFileExists) {
    const isOverwrite = await p.confirm({
      message: `A ${isGlobal ? 'global ' : ''}${pc.green('repomix.config.json')} file already exists. Do you want to overwrite it?`,
    });
    if (!isOverwrite) {
      p.log.info(`Skipping ${pc.green('repomix.config.json')} file creation.`);
      return false;
    }
    if (p.isCancel(isOverwrite)) {
      cancel();
      return false;
    }
  }

  const options = await p.group(
    {
      outputStyle: () => {
        return p.select({
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
        return p.text({
          message: 'Output file path:',
          initialValue: defaultFilePath,
          validate: (value) => (value.length === 0 ? 'Output file path is required' : undefined),
        });
      },
    },
    {
      onCancel: cancel,
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
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  const relativeConfigPath = path.relative(rootDir, configPath);

  p.log.success(
    pc.green(`${isGlobal ? 'Global config' : 'Config'} file created!\n`) + pc.dim(`Path: ${relativeConfigPath}`),
  );

  return true;
};

export const createIgnoreFile = async (
  rootDir: string,
  isGlobal: boolean,
  prompts?: typeof import('@clack/prompts'),
  onCancel?: () => void,
): Promise<boolean> => {
  const p = prompts ?? (await getPrompts());
  const cancel =
    onCancel ??
    (() => {
      p.cancel('Initialization cancelled.');
      process.exit(0);
    });

  if (isGlobal) {
    p.log.info(`Skipping ${pc.green('.repomixignore')} file creation for global configuration.`);
    return false;
  }

  const ignorePath = path.resolve(rootDir, '.repomixignore');
  const createIgnore = await p.confirm({
    message: `Do you want to create a ${pc.green('.repomixignore')} file?`,
  });
  if (!createIgnore) {
    p.log.info(`Skipping ${pc.green('.repomixignore')} file creation.`);
    return false;
  }
  if (p.isCancel(createIgnore)) {
    cancel();
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
    const overwrite = await p.confirm({
      message: `A ${pc.green('.repomixignore')} file already exists. Do you want to overwrite it?`,
    });

    if (!overwrite) {
      p.log.info(`${pc.green('.repomixignore')} file creation skipped. Existing file will not be modified.`);
      return false;
    }
  }

  const defaultIgnoreContent = `# Add patterns to ignore here, one per line
# Example:
# *.log
# tmp/
`;

  await fs.writeFile(ignorePath, defaultIgnoreContent);
  p.log.success(pc.green('Created .repomixignore file!\n') + pc.dim(`Path: ${path.relative(rootDir, ignorePath)}`));

  return true;
};
