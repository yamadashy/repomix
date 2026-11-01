import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type * as prompts from '@clack/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfigFile, createIgnoreFile } from '../../../src/cli/actions/initAction.js';

const createMockPrompts = () => ({
  confirm: vi.fn(),
  group: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: { info: vi.fn(), success: vi.fn() },
});

const pathExists = async (filePath: string) =>
  fs.access(filePath).then(
    () => true,
    () => false,
  );

describe('initAction', () => {
  let rootDir: string;
  let globalDir: string;
  let mockPrompts: ReturnType<typeof createMockPrompts>;
  let deps: { prompts: typeof prompts; getGlobalDirectory: () => string };

  beforeEach(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-init-action-'));
    rootDir = path.join(tempDir, 'project');
    globalDir = path.join(tempDir, 'global', 'repomix');
    await fs.mkdir(rootDir);

    mockPrompts = createMockPrompts();
    deps = {
      prompts: mockPrompts as unknown as typeof prompts,
      getGlobalDirectory: () => globalDir,
    };
  });

  afterEach(async () => {
    await fs.rm(path.dirname(rootDir), { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('createConfigFile', () => {
    it('should create a new local config file when one does not exist', async () => {
      mockPrompts.group.mockResolvedValue({
        outputFilePath: 'custom-output.txt',
        outputStyle: 'xml',
      });
      mockPrompts.confirm.mockResolvedValue(true);

      await createConfigFile(rootDir, false, deps);

      const content = await fs.readFile(path.join(rootDir, 'repomix.config.json'), 'utf8');
      expect(content).toContain('"filePath": "custom-output.txt"');
      expect(content).toContain('"style": "xml"');
    });

    it('should create a new global config file when one does not exist', async () => {
      mockPrompts.group.mockResolvedValue({
        outputFilePath: 'global-output.txt',
        outputStyle: 'plain',
      });
      mockPrompts.confirm.mockResolvedValue(true);

      await createConfigFile(rootDir, true, deps);

      // The global directory does not exist beforehand, so this also covers its recursive creation
      const content = await fs.readFile(path.join(globalDir, 'repomix.config.json'), 'utf8');
      expect(content).toContain('"filePath": "global-output.txt"');
      expect(content).toContain('"style": "plain"');
      expect(await pathExists(path.join(rootDir, 'repomix.config.json'))).toBe(false);
    });

    it('should prompt to overwrite when config file already exists', async () => {
      const configPath = path.join(rootDir, 'repomix.config.json');
      await fs.writeFile(configPath, 'existing');
      mockPrompts.confirm.mockResolvedValue(true);
      mockPrompts.group.mockResolvedValue({
        outputFilePath: 'new-output.txt',
        outputStyle: 'xml',
      });

      await createConfigFile(rootDir, false, deps);

      expect(mockPrompts.confirm).toHaveBeenCalled();
      expect(await fs.readFile(configPath, 'utf8')).toContain('"filePath": "new-output.txt"');
    });

    it('should not overwrite when user chooses not to', async () => {
      const configPath = path.join(rootDir, 'repomix.config.json');
      await fs.writeFile(configPath, 'existing');
      mockPrompts.confirm.mockResolvedValue(false);

      await createConfigFile(rootDir, false, deps);

      expect(mockPrompts.confirm).toHaveBeenCalled();
      expect(await fs.readFile(configPath, 'utf8')).toBe('existing');
    });

    it('should handle user cancellation', async () => {
      mockPrompts.group.mockImplementation(() => {
        throw new Error('User cancelled');
      });

      await createConfigFile(rootDir, false, deps);

      expect(await pathExists(path.join(rootDir, 'repomix.config.json'))).toBe(false);
    });

    it('should return false when user cancels initial confirmation', async () => {
      mockPrompts.confirm.mockResolvedValue(false);

      const result = await createConfigFile(rootDir, false, deps);

      expect(result).toBe(false);
      expect(await pathExists(path.join(rootDir, 'repomix.config.json'))).toBe(false);
    });

    it('should return false when user cancels via isCancel on initial confirmation', async () => {
      const mockCancelSymbol = Symbol('cancel');
      mockPrompts.confirm.mockResolvedValue(mockCancelSymbol);
      mockPrompts.isCancel.mockImplementation((value) => value === mockCancelSymbol);

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await createConfigFile(rootDir, false, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(await pathExists(path.join(rootDir, 'repomix.config.json'))).toBe(false);
    });

    it('should return false when user cancels via isCancel on overwrite confirmation', async () => {
      const configPath = path.join(rootDir, 'repomix.config.json');
      await fs.writeFile(configPath, 'existing'); // File exists
      mockPrompts.confirm.mockResolvedValueOnce(true); // Initial confirmation
      const mockCancelSymbol = Symbol('cancel');
      mockPrompts.confirm.mockResolvedValueOnce(mockCancelSymbol); // Overwrite cancel
      mockPrompts.isCancel.mockImplementation((value) => value === mockCancelSymbol);

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await createConfigFile(rootDir, false, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(await fs.readFile(configPath, 'utf8')).toBe('existing');
    });

    it('should return true when config file is successfully created', async () => {
      mockPrompts.confirm.mockResolvedValue(true);
      mockPrompts.group.mockResolvedValue({
        outputFilePath: 'output.txt',
        outputStyle: 'xml',
      });

      const result = await createConfigFile(rootDir, false, deps);

      expect(result).toBe(true);
      expect(await pathExists(path.join(rootDir, 'repomix.config.json'))).toBe(true);
    });
  });

  describe('createIgnoreFile', () => {
    const ignoreFilePath = () => path.join(rootDir, '.repomixignore');

    it('should not create a new .repomixignore file when global flag is set', async () => {
      const result = await createIgnoreFile(rootDir, true, deps);

      expect(result).toBe(false);
      expect(await pathExists(ignoreFilePath())).toBe(false);
    });

    it('should create a new .repomixignore file when one does not exist', async () => {
      mockPrompts.confirm.mockResolvedValue(true);

      await createIgnoreFile(rootDir, false, deps);

      expect(await fs.readFile(ignoreFilePath(), 'utf8')).toContain('# Add patterns to ignore here, one per line');
    });

    it('should prompt to overwrite when .repomixignore file already exists', async () => {
      await fs.writeFile(ignoreFilePath(), 'existing');
      mockPrompts.confirm
        .mockResolvedValueOnce(true) // First call for creating the file
        .mockResolvedValueOnce(true); // Second call for overwriting

      await createIgnoreFile(rootDir, false, deps);

      expect(mockPrompts.confirm).toHaveBeenCalledTimes(2);
      expect(await fs.readFile(ignoreFilePath(), 'utf8')).toContain('# Add patterns to ignore here');
    });

    it('should not overwrite when user chooses not to', async () => {
      await fs.writeFile(ignoreFilePath(), 'existing');
      mockPrompts.confirm
        .mockResolvedValueOnce(true) // First call for creating the file
        .mockResolvedValueOnce(false); // Second call for overwriting

      await createIgnoreFile(rootDir, false, deps);

      expect(mockPrompts.confirm).toHaveBeenCalledTimes(2);
      expect(await fs.readFile(ignoreFilePath(), 'utf8')).toBe('existing');
    });

    it('should return false when user chooses not to create .repomixignore', async () => {
      mockPrompts.confirm.mockResolvedValue(false);

      const result = await createIgnoreFile(rootDir, false, deps);

      expect(result).toBe(false);
      expect(await pathExists(ignoreFilePath())).toBe(false);
    });

    it('should handle user cancellation', async () => {
      mockPrompts.confirm.mockResolvedValue(false);

      await createIgnoreFile(rootDir, false, deps);

      expect(await pathExists(ignoreFilePath())).toBe(false);
    });

    it('should return false when user cancels via isCancel on initial confirmation', async () => {
      const mockCancelSymbol = Symbol('cancel');
      mockPrompts.confirm.mockResolvedValue(mockCancelSymbol);
      mockPrompts.isCancel.mockImplementation((value) => value === mockCancelSymbol);

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await createIgnoreFile(rootDir, false, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(await pathExists(ignoreFilePath())).toBe(false);
    });

    it('should return true when ignore file is successfully created', async () => {
      mockPrompts.confirm.mockResolvedValue(true);

      const result = await createIgnoreFile(rootDir, false, deps);

      expect(result).toBe(true);
      expect(await pathExists(ignoreFilePath())).toBe(true);
    });
  });
});
