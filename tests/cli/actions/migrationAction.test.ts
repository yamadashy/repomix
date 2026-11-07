import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runMigrationAction } from '../../../src/cli/actions/migrationAction.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';
import { createTempDir } from '../../testing/tempDir.js';

type MigrationDeps = NonNullable<Parameters<typeof runMigrationAction>[1]>;

const pathExists = async (filePath: string) =>
  fs.access(filePath).then(
    () => true,
    () => false,
  );

describe('migrationAction', () => {
  let tempDir: string;
  let rootDir: string;
  let homeDir: string;
  let globalDir: string;
  let logger: ReturnType<typeof silenceLogger>;
  let mockConfirm: ReturnType<typeof vi.fn>;
  let deps: MigrationDeps;

  const paths = () => ({
    oldConfigPath: path.join(rootDir, 'repopack.config.json'),
    newConfigPath: path.join(rootDir, 'repomix.config.json'),
    oldIgnorePath: path.join(rootDir, '.repopackignore'),
    newIgnorePath: path.join(rootDir, '.repomixignore'),
    oldInstructionPath: path.join(rootDir, 'repopack-instruction.md'),
    newInstructionPath: path.join(rootDir, 'repomix-instruction.md'),
    gitignorePath: path.join(rootDir, '.gitignore'),
    oldGlobalConfigPath: path.join(homeDir, '.config', 'repopack', 'repopack.config.json'),
    newGlobalConfigPath: path.join(globalDir, 'repomix.config.json'),
    oldTxt: path.join(rootDir, 'repopack-output.txt'),
    newTxt: path.join(rootDir, 'repomix-output.txt'),
    oldXml: path.join(rootDir, 'repopack-output.xml'),
    newXml: path.join(rootDir, 'repomix-output.xml'),
    oldMd: path.join(rootDir, 'repopack-output.md'),
    newMd: path.join(rootDir, 'repomix-output.md'),
  });

  const writeFiles = async (files: Record<string, string>) => {
    for (const [filePath, content] of Object.entries(files)) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf8');
    }
  };

  beforeEach(async () => {
    tempDir = await createTempDir('repomix-migration-action-');
    rootDir = path.join(tempDir, 'project');
    // The old global config is resolved from $HOME, so point it inside the temp dir
    // to keep the test away from the developer's real ~/.config/repopack.
    homeDir = path.join(tempDir, 'home');
    globalDir = path.join(tempDir, 'global', 'repomix');
    await fs.mkdir(rootDir, { recursive: true });

    logger = silenceLogger();
    mockConfirm = vi.fn();
    deps = {
      getGlobalDirectory: () => globalDir,
      loadClack: async () =>
        ({
          confirm: mockConfirm,
          isCancel: vi.fn().mockReturnValue(false),
        }) as unknown as Awaited<ReturnType<MigrationDeps['loadClack']>>,
      env: { HOME: homeDir },
    };
  });

  test('should migrate all files when they exist', async () => {
    const p = paths();
    await writeFiles({
      [p.oldConfigPath]: JSON.stringify({
        output: {
          filePath: 'repopack-output.txt',
          instructionFilePath: 'repopack-instruction.md',
        },
      }),
      [p.oldIgnorePath]: 'repopack-output.txt\n*.log',
      [p.oldInstructionPath]: '# Repopack Instructions',
      [p.oldTxt]: 'Repopack output content',
      [p.oldXml]: 'Repopack output content',
    });

    // Mock user confirmation
    mockConfirm.mockResolvedValue(true);

    // Run migration
    const result = await runMigrationAction(rootDir, deps);

    // Verify results
    expect(result.configMigrated).toBe(true);
    expect(result.ignoreMigrated).toBe(true);
    expect(result.instructionMigrated).toBe(true);
    expect(result.outputFilesMigrated).toContain(p.newTxt);
    expect(result.outputFilesMigrated).toContain(p.newXml);
    expect(result.error).toBeUndefined();

    // Verify the migrated config
    expect(await fs.readFile(p.newConfigPath, 'utf8')).toBe(
      JSON.stringify(
        {
          output: {
            filePath: 'repomix-output.txt',
            instructionFilePath: 'repomix-instruction.md',
          },
        },
        null,
        2,
      ),
    );

    // Verify other migrated files
    expect(await fs.readFile(p.newIgnorePath, 'utf8')).toBe('repomix-output.txt\n*.log');
    expect(await fs.readFile(p.newInstructionPath, 'utf8')).toBe('# Repomix Instructions');
    expect(await fs.readFile(p.newTxt, 'utf8')).toBe('Repomix output content');
    expect(await fs.readFile(p.newXml, 'utf8')).toBe('Repomix output content');

    // Verify old files were removed
    for (const oldPath of [p.oldConfigPath, p.oldIgnorePath, p.oldInstructionPath, p.oldTxt, p.oldXml]) {
      expect(await pathExists(oldPath)).toBe(false);
    }
  });

  test('should update gitignore content when it exists and contains repopack references', async () => {
    const p = paths();
    await writeFiles({
      [p.gitignorePath]: 'node_modules/\nrepopack-output.txt',
      [p.oldConfigPath]: '{}',
    });

    // Mock user confirmation
    mockConfirm.mockResolvedValue(true);

    // Run migration
    await runMigrationAction(rootDir, deps);

    // Verify gitignore was updated
    expect(await fs.readFile(p.gitignorePath, 'utf8')).toBe('node_modules/\nrepomix-output.txt');
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Updated repopack references in'));
  });

  test('should handle non-updated files correctly', async () => {
    const p = paths();
    // gitignore content with no repopack references
    await writeFiles({
      [p.gitignorePath]: 'node_modules/\n*.log',
      [p.oldConfigPath]: '{}',
    });

    // Mock user confirmation
    mockConfirm.mockResolvedValue(true);

    // Run migration
    await runMigrationAction(rootDir, deps);

    // Verify gitignore was left as-is
    expect(await fs.readFile(p.gitignorePath, 'utf8')).toBe('node_modules/\n*.log');
    expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('Updated repopack references in'));
    // Verify debug message was logged
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('No changes needed in'));
  });

  test('should skip migration when no old files exist', async () => {
    // Run migration
    const result = await runMigrationAction(rootDir, deps);

    // Verify no migration occurred
    expect(result.configMigrated).toBe(false);
    expect(result.ignoreMigrated).toBe(false);
    expect(result.instructionMigrated).toBe(false);
    expect(result.outputFilesMigrated).toHaveLength(0);
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('No Repopack files found to migrate.');
  });

  test('should leave old files untouched when the user declines the migration', async () => {
    const p = paths();
    await writeFiles({ [p.oldConfigPath]: '{}' });
    mockConfirm.mockResolvedValue(false);

    const result = await runMigrationAction(rootDir, deps);

    expect(result.configMigrated).toBe(false);
    expect(logger.info).toHaveBeenCalledWith('Migration cancelled.');
    expect(await pathExists(p.oldConfigPath)).toBe(true);
    expect(await pathExists(p.newConfigPath)).toBe(false);
  });

  test('should still migrate a config that is not valid JSON, renaming references as text', async () => {
    const p = paths();
    await writeFiles({ [p.oldConfigPath]: '{ "output": { "filePath": "repopack-output.txt" ' });
    mockConfirm.mockResolvedValue(true);

    const result = await runMigrationAction(rootDir, deps);

    expect(result.configMigrated).toBe(true);
    expect(await fs.readFile(p.newConfigPath, 'utf8')).toBe('{ "output": { "filePath": "repomix-output.txt" ');
  });

  test('should report an error in the result instead of throwing', async () => {
    const p = paths();
    await writeFiles({ [p.oldConfigPath]: '{}' });
    const error = new Error('prompt unavailable');
    deps.loadClack = async () => {
      throw error;
    };

    const result = await runMigrationAction(rootDir, deps);

    expect(result.error).toBe(error);
    expect(logger.error).toHaveBeenCalledWith('An error occurred during migration:', error);
    expect(await pathExists(p.oldConfigPath)).toBe(true);
  });

  test('should skip files when they already exist and user declines overwrite', async () => {
    const p = paths();
    // Old and new files all exist
    const files = {
      [p.oldConfigPath]: 'old config',
      [p.newConfigPath]: 'new config',
      [p.oldIgnorePath]: 'old ignore',
      [p.newIgnorePath]: 'new ignore',
      [p.oldInstructionPath]: 'old instruction',
      [p.newInstructionPath]: 'new instruction',
      [p.oldGlobalConfigPath]: 'old global config',
      [p.newGlobalConfigPath]: 'new global config',
      [p.oldTxt]: 'old txt',
      [p.newTxt]: 'new txt',
      [p.oldXml]: 'old xml',
      [p.newXml]: 'new xml',
      [p.oldMd]: 'old md',
      [p.newMd]: 'new md',
    };
    await writeFiles(files);

    // Mock user confirming migration but declining overwrites
    mockConfirm
      .mockResolvedValueOnce(true) // Migration confirmation
      .mockResolvedValue(false); // All overwrite confirmations

    // Run migration
    const result = await runMigrationAction(rootDir, deps);

    // Verify nothing was migrated
    expect(result.configMigrated).toBe(false);
    expect(result.ignoreMigrated).toBe(false);
    expect(result.instructionMigrated).toBe(false);
    expect(result.outputFilesMigrated).toHaveLength(0);
    expect(result.globalConfigMigrated).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Skipping migration'));
    for (const [filePath, content] of Object.entries(files)) {
      expect(await fs.readFile(filePath, 'utf8')).toBe(content);
    }
  });
});
