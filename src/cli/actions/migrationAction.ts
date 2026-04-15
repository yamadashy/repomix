import * as fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import { getGlobalDirectory } from '../../config/globalDirectory.js';
import { logger } from '../../shared/logger.js';

interface MigrationPaths {
  oldConfigPath: string;
  newConfigPath: string;
  oldIgnorePath: string;
  newIgnorePath: string;
  oldInstructionPath: string;
  newInstructionPath: string;
  oldOutputPaths: string[];
  newOutputPaths: string[];
  oldGlobalConfigPath: string;
  newGlobalConfigPath: string;
}

interface MigrationResult {
  configMigrated: boolean;
  ignoreMigrated: boolean;
  instructionMigrated: boolean;
  outputFilesMigrated: string[];
  globalConfigMigrated: boolean;
  error?: Error;
}

/**
 * Check if a file exists at the given path
 */
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Replace all occurrences of 'repopack' with 'repomix' in a string
 */
const replaceRepopackString = (content: string): string => {
  return content.replace(/repopack/g, 'repomix').replace(/Repopack/g, 'Repomix');
};

/**
 * Update file content by replacing 'repopack' with 'repomix'
 */
const updateFileContent = async (filePath: string): Promise<boolean> => {
  const content = await fs.readFile(filePath, 'utf8');
  const updatedContent = replaceRepopackString(content);

  // Check if content needs to be updated
  if (content !== updatedContent) {
    await fs.writeFile(filePath, updatedContent, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    logger.log(`Updated repopack references in ${pc.cyan(relativePath)}`);
    return true;
  }

  return false;
};

/**
 * Parse JSON content, update instructionFilePath if exists
 */
const updateInstructionPath = (content: string): string => {
  try {
    const config = JSON.parse(content);
    if (config.output?.instructionFilePath) {
      config.output.instructionFilePath = config.output.instructionFilePath.replace('repopack', 'repomix');
    }
    // Also update output.filePath if it exists
    if (config.output?.filePath) {
      config.output.filePath = config.output.filePath.replace('repopack', 'repomix');
    }
    return JSON.stringify(config, null, 2);
  } catch {
    return content;
  }
};

/**
 * Get output file paths pairs
 */
const getOutputFilePaths = (rootDir: string): { oldPaths: string[]; newPaths: string[] } => {
  const extensions = ['.txt', '.xml', '.md'];
  const oldPaths = extensions.map((ext) => path.join(rootDir, `repopack-output${ext}`));
  const newPaths = extensions.map((ext) => path.join(rootDir, `repomix-output${ext}`));
  return { oldPaths, newPaths };
};

/**
 * Migrate a single file from old path to new path
 */
const migrateFile = async (
  oldPath: string,
  newPath: string,
  description: string,
  isConfig = false,
): Promise<boolean> => {
  if (!(await fileExists(oldPath))) {
    return false;
  }

  const exists = await fileExists(newPath);
  if (exists) {
    const p = await import('@clack/prompts');
    const shouldOverwrite = await p.confirm({
      message: `${description} already exists at ${newPath}. Do you want to overwrite it?`,
    });

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      logger.info(`Skipping migration of ${description}`);
      return false;
    }
  }

  try {
    // Read and update content
    let content = await fs.readFile(oldPath, 'utf8');
    content = replaceRepopackString(content);

    // For config files, also update instructionFilePath and output.filePath
    if (isConfig) {
      content = updateInstructionPath(content);
    }

    // Ensure the target directory exists
    await fs.mkdir(path.dirname(newPath), { recursive: true });

    // Write to new file
    await fs.writeFile(newPath, content, 'utf8');

    // Remove old file
    await fs.unlink(oldPath);

    const relativeOldPath = path.relative(process.cwd(), oldPath);
    const relativeNewPath = path.relative(process.cwd(), newPath);

    logger.log(`Renamed ${description} from ${relativeOldPath} to ${relativeNewPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to migrate ${description}:`, error);
    return false;
  }
};

/**
 * Update content of gitignore and repomixignore files
 */
const updateIgnoreFiles = async (rootDir: string): Promise<void> => {
  const gitignorePath = path.join(rootDir, '.gitignore');
  const repomixignorePath = path.join(rootDir, '.repomixignore');

  if (await fileExists(gitignorePath)) {
    const updated = await updateFileContent(gitignorePath);
    if (!updated) {
      logger.debug('No changes needed in .gitignore');
    }
  }

  if (await fileExists(repomixignorePath)) {
    const updated = await updateFileContent(repomixignorePath);
    if (!updated) {
      logger.debug('No changes needed in .repomixignore');
    }
  }
};

/**
 * Get all migration related file paths
 */
const getMigrationPaths = (rootDir: string): MigrationPaths => {
  const { oldPaths: oldOutputPaths, newPaths: newOutputPaths } = getOutputFilePaths(rootDir);
  const oldGlobalDirectory = path.join(process.env.HOME || '', '.config', 'repopack');
  const newGlobalDirectory = getGlobalDirectory();

  return {
    oldConfigPath: path.join(rootDir, 'repopack.config.json'),
    newConfigPath: path.join(rootDir, 'repomix.config.json'),
    oldIgnorePath: path.join(rootDir, '.repopackignore'),
    newIgnorePath: path.join(rootDir, '.repomixignore'),
    oldInstructionPath: path.join(rootDir, 'repopack-instruction.md'),
    newInstructionPath: path.join(rootDir, 'repomix-instruction.md'),
    oldOutputPaths,
    newOutputPaths,
    oldGlobalConfigPath: path.join(oldGlobalDirectory, 'repopack.config.json'),
    newGlobalConfigPath: path.join(newGlobalDirectory, 'repomix.config.json'),
  };
};

/**
 * Migrate output files
 */
const migrateOutputFiles = async (oldPaths: string[], newPaths: string[]): Promise<string[]> => {
  const migratedFiles: string[] = [];

  for (let i = 0; i < oldPaths.length; i++) {
    const oldPath = oldPaths[i];
    const newPath = newPaths[i];
    const ext = path.extname(oldPath);

    if (await migrateFile(oldPath, newPath, `Output file (${ext})`)) {
      migratedFiles.push(newPath);
    }
  }

  return migratedFiles;
};

export const runMigrationAction = async (rootDir: string): Promise<MigrationResult> => {
  const result: MigrationResult = {
    configMigrated: false,
    ignoreMigrated: false,
    instructionMigrated: false,
    outputFilesMigrated: [],
    globalConfigMigrated: false,
  };

  try {
    const paths = getMigrationPaths(rootDir);

    // Check if migration is needed — all stat calls are independent I/O,
    // so run them in parallel to collapse ~4 sequential stat RTTs into one.
    const [hasOldConfig, hasOldIgnore, hasOldInstruction, hasOldGlobalConfig, hasOldOutput] = await Promise.all([
      fileExists(paths.oldConfigPath),
      fileExists(paths.oldIgnorePath),
      fileExists(paths.oldInstructionPath),
      fileExists(paths.oldGlobalConfigPath),
      Promise.all(paths.oldOutputPaths.map(fileExists)).then((results) => results.some((exists) => exists)),
    ]);

    if (!hasOldConfig && !hasOldIgnore && !hasOldInstruction && !hasOldOutput && !hasOldGlobalConfig) {
      logger.debug('No Repopack files found to migrate.');
      return result;
    }

    // Show migration notice based on what needs to be migrated
    let migrationMessage = `Found ${pc.green('Repopack')} `;
    const items = [];
    if (hasOldConfig || hasOldIgnore || hasOldInstruction || hasOldOutput) items.push('local configuration');
    if (hasOldGlobalConfig) items.push('global configuration');
    migrationMessage += `${items.join(' and ')}. Would you like to migrate to ${pc.green('Repomix')}?`;

    // Lazy-load @clack/prompts (~16ms) — only needed when old Repopack files
    // are detected, which is rare after initial migration.
    const p = await import('@clack/prompts');

    // Confirm migration with user
    const shouldMigrate = await p.confirm({
      message: migrationMessage,
    });

    if (p.isCancel(shouldMigrate) || !shouldMigrate) {
      logger.info('Migration cancelled.');
      return result;
    }

    // Show migration notice
    logger.info(pc.cyan('\nMigrating from Repopack to Repomix...'));
    logger.log('');

    // Migrate config file
    if (hasOldConfig) {
      result.configMigrated = await migrateFile(paths.oldConfigPath, paths.newConfigPath, 'Configuration file', true);
    }

    // Migrate global config file
    if (hasOldGlobalConfig) {
      result.globalConfigMigrated = await migrateFile(
        paths.oldGlobalConfigPath,
        paths.newGlobalConfigPath,
        'Global configuration file',
        true,
      );
    }

    // Migrate ignore file
    if (hasOldIgnore) {
      result.ignoreMigrated = await migrateFile(paths.oldIgnorePath, paths.newIgnorePath, 'Ignore file');
    }

    // Migrate instruction file
    if (hasOldInstruction) {
      result.instructionMigrated = await migrateFile(
        paths.oldInstructionPath,
        paths.newInstructionPath,
        'Instruction file',
      );
    }

    // Migrate output files
    if (hasOldOutput) {
      result.outputFilesMigrated = await migrateOutputFiles(paths.oldOutputPaths, paths.newOutputPaths);
    }

    // Update content in gitignore and repomixignore
    await updateIgnoreFiles(rootDir);

    // Show success message
    if (
      result.configMigrated ||
      result.ignoreMigrated ||
      result.instructionMigrated ||
      result.outputFilesMigrated.length > 0 ||
      result.globalConfigMigrated
    ) {
      logger.log('');
      logger.success('✔ Migration completed successfully!');
      logger.log('');
      logger.info(
        'You can now use Repomix commands as usual. The old Repopack files have been migrated to the new format.',
      );
      logger.log('');
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      result.error = error;
    } else {
      result.error = new Error(String(error));
    }
    logger.error('An error occurred during migration:', error);
    return result;
  }
};
