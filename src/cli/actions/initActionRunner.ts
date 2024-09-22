import fs from 'node:fs/promises';
import path from 'node:path';
import * as prompts from '@clack/prompts';
import pc from 'picocolors';
import type { RepopackConfigFile, RepopackOutputStyle } from '../../config/configSchema.js';
import { defaultConfig } from '../../config/defaultConfig.js';
import { getGlobalDirectory } from '../../config/globalDirectory.js';
import { logger } from '../../shared/logger.js';

const onCancelOperation = () => {
  prompts.cancel('Initialization cancelled.');
  process.exit(0);
};

export const runInitAction = async (rootDir: string, isGlobal: boolean): Promise<void> => {
  prompts.intro(pc.bold(`Welcome to Repopack ${isGlobal ? 'Global ' : ''}Configuration!`));

  try {
    // Step 1: Ask if user wants to create a config file
    const isCreatedConfig = await createConfigFile(rootDir, isGlobal);

    // Step 2: Ask if user wants to create a .repopackignore file
    const isCreatedIgnoreFile = await createIgnoreFile(rootDir, isGlobal);

    if (!isCreatedConfig && !isCreatedIgnoreFile) {
      prompts.outro(
        pc.yellow('No files were created. You can run this command again when you need to create configuration files.'),
      );
    } else {
      prompts.outro(pc.green('Initialization complete! You can now use Repopack with your specified settings.'));
    }
  } catch (error) {
    logger.error('An error occurred during initialization:', error);
  }
};

export async function createConfigFile(rootDir: string, isGlobal: boolean): Promise<boolean> {
  const isCancelled = false;

  const configPath = isGlobal
    ? path.resolve(getGlobalDirectory(), 'repopack.config.json')
    : path.resolve(rootDir, 'repopack.config.json');

  const isCreateConfig = await prompts.confirm({
    message: `Do you want to create a ${isGlobal ? 'global ' : ''}${pc.green('repopack.config.json')} file?`,
  });
  if (!isCreateConfig) {
    prompts.log.info(`Skipping ${pc.green('repopack.config.json')} file creation.`);
    return false;
  }
  if (prompts.isCancel(isCreateConfig)) {
    onCancelOperation();
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
    const isOverwrite = await prompts.confirm({
      message: `A ${isGlobal ? 'global ' : ''}${pc.green('repopack.config.json')} file already exists. Do you want to overwrite it?`,
    });
    if (!isOverwrite) {
      prompts.log.info(`Skipping ${pc.green('repopack.config.json')} file creation.`);
      return false;
    }
    if (prompts.isCancel(isOverwrite)) {
      onCancelOperation();
      return false;
    }
  }

  const options = await prompts.group(
    {
      outputFilePath: () => {
        if (isCancelled) {
          return;
        }
        return prompts.text({
          message: 'Output file path:',
          initialValue: defaultConfig.output.filePath,
          validate: (value) => (value.length === 0 ? 'Output file path is required' : undefined),
        });
      },

      outputStyle: () => {
        return prompts.select({
          message: 'Output style:',
          options: [
            { value: 'plain', label: 'Plain', hint: 'Simple text format' },
            { value: 'xml', label: 'XML', hint: 'Structured XML format' },
          ],
          initialValue: defaultConfig.output.style,
        });
      },
    },
    {
      onCancel: onCancelOperation,
    },
  );

  const config: RepopackConfigFile = {
    ...defaultConfig,
    output: {
      ...defaultConfig.output,
      filePath: options.outputFilePath as string,
      style: options.outputStyle as RepopackOutputStyle,
    },
  };

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  const relativeConfigPath = path.relative(rootDir, configPath);

  prompts.log.success(
    pc.green(`${isGlobal ? 'Global config' : 'Config'} file created!\n`) + pc.dim(`Path: ${relativeConfigPath}`),
  );

  return true;
}

export async function createIgnoreFile(rootDir: string, isGlobal: boolean): Promise<boolean> {
  if (isGlobal) {
    prompts.log.info(`Skipping ${pc.green('.repopackignore')} file creation for global configuration.`);
    return false;
  }

  const ignorePath = path.resolve(rootDir, '.repopackignore');
  const createIgnore = await prompts.confirm({
    message: `Do you want to create a ${pc.green('.repopackignore')} file?`,
  });
  if (!createIgnore) {
    prompts.log.info(`Skipping ${pc.green('.repopackignore')} file creation.`);
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
      message: `A ${pc.green('.repopackignore')} file already exists. Do you want to overwrite it?`,
    });

    if (!overwrite) {
      prompts.log.info(`${pc.green('.repopackignore')} file creation skipped. Existing file will not be modified.`);
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
    pc.green('Created .repopackignore file!\n') + pc.dim(`Path: ${path.relative(rootDir, ignorePath)}`),
  );

  return true;
}
