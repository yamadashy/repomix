import * as fs from 'node:fs/promises';
import path from 'node:path';
import * as prompts from '@clack/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfigFile, createIgnoreFile } from '../../../src/cli/actions/initAction.js';
import { getGlobalDirectory } from '../../../src/config/globalDirectory.js';

vi.mock('node:fs/promises');
vi.mock('@clack/prompts');
vi.mock('../../../src/shared/folderUtils');
vi.mock('../../../src/config/globalDirectory.js');

describe('initAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createConfigFile', () => {
    it('should create a new local config file when one does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));
      vi.mocked(prompts.group).mockResolvedValue({
        outputFilePath: 'custom-output.txt',
        outputStyle: 'xml',
      });
      vi.mocked(prompts.confirm).mockResolvedValue(true);

      await createConfigFile('/test/dir', false);

      const configPath = path.resolve('/test/dir/repomix.config.json');

      expect(fs.writeFile).toHaveBeenCalledWith(configPath, expect.stringContaining('"filePath": "custom-output.txt"'));
      expect(fs.writeFile).toHaveBeenCalledWith(configPath, expect.stringContaining('"style": "xml"'));
    });

    it('should create a new global config file when one does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));
      vi.mocked(prompts.group).mockResolvedValue({
        outputFilePath: 'global-output.txt',
        outputStyle: 'plain',
      });
      vi.mocked(prompts.confirm).mockResolvedValue(true);
      vi.mocked(getGlobalDirectory).mockImplementation(() => '/global/repomix');

      await createConfigFile('/test/dir', true);

      const configPath = path.resolve('/global/repomix/repomix.config.json');

      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(configPath), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(configPath, expect.stringContaining('"filePath": "global-output.txt"'));
      expect(fs.writeFile).toHaveBeenCalledWith(configPath, expect.stringContaining('"style": "plain"'));
    });

    it('should prompt to overwrite when config file already exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(prompts.confirm).mockResolvedValue(true);
      vi.mocked(prompts.group).mockResolvedValue({
        outputFilePath: 'new-output.txt',
        outputStyle: 'xml',
      });

      await createConfigFile('/test/dir', false);

      expect(prompts.confirm).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should not overwrite when user chooses not to', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(prompts.confirm).mockResolvedValue(false);

      await createConfigFile('/test/dir', false);

      expect(prompts.confirm).toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle user cancellation', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));
      vi.mocked(prompts.group).mockImplementation(() => {
        throw new Error('User cancelled');
      });

      await createConfigFile('/test/dir', false);

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should return false when user cancels initial confirmation', async () => {
      vi.mocked(prompts.confirm).mockResolvedValue(false);

      const result = await createConfigFile('/test/dir', false);

      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should return false when user cancels via isCancel on initial confirmation', async () => {
      const mockCancelSymbol = Symbol('cancel');
      vi.mocked(prompts.confirm).mockResolvedValue(mockCancelSymbol as symbol);
      vi.mocked(prompts.isCancel).mockImplementation((value) => value === mockCancelSymbol);

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await createConfigFile('/test/dir', false);

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(fs.writeFile).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });

    it('should return false when user cancels via isCancel on overwrite confirmation', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined); // File exists
      vi.mocked(prompts.confirm).mockResolvedValueOnce(true); // Initial confirmation
      const mockCancelSymbol = Symbol('cancel');
      vi.mocked(prompts.confirm).mockResolvedValueOnce(mockCancelSymbol as symbol); // Overwrite cancel
      vi.mocked(prompts.isCancel).mockImplementation((value) => value === mockCancelSymbol);

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await createConfigFile('/test/dir', false);

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(fs.writeFile).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });

    it('should return true when config file is successfully created', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));
      vi.mocked(prompts.confirm).mockResolvedValue(true);
      vi.mocked(prompts.group).mockResolvedValue({
        outputFilePath: 'output.txt',
        outputStyle: 'xml',
      });

      const result = await createConfigFile('/test/dir', false);

      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('createIgnoreFile', () => {
    it('should not create a new .repomixignore file when global flag is set', async () => {
      const result = await createIgnoreFile('/test/dir', true);

      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should create a new .repomixignore file when one does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));
      vi.mocked(prompts.confirm).mockResolvedValue(true);

      await createIgnoreFile('/test/dir', false);

      const ignorePath = path.resolve('/test/dir/.repomixignore');

      expect(fs.writeFile).toHaveBeenCalledWith(
        ignorePath,
        expect.stringContaining('# Add patterns to ignore here, one per line'),
      );
    });

    it('should prompt to overwrite when .repomixignore file already exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(prompts.confirm)
        .mockResolvedValueOnce(true) // First call for creating the file
        .mockResolvedValueOnce(true); // Second call for overwriting

      await createIgnoreFile('/test/dir', false);

      expect(prompts.confirm).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should not overwrite when user chooses not to', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(prompts.confirm)
        .mockResolvedValueOnce(true) // First call for creating the file
        .mockResolvedValueOnce(false); // Second call for overwriting

      await createIgnoreFile('/test/dir', false);

      expect(prompts.confirm).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should return false when user chooses not to create .repomixignore', async () => {
      vi.mocked(prompts.confirm).mockResolvedValue(false);

      const result = await createIgnoreFile('/test/dir', false);

      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle user cancellation', async () => {
      vi.mocked(prompts.confirm).mockResolvedValue(false);

      await createIgnoreFile('/test/dir', false);

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should return false when user cancels via isCancel on initial confirmation', async () => {
      const mockCancelSymbol = Symbol('cancel');
      vi.mocked(prompts.confirm).mockResolvedValue(mockCancelSymbol as symbol);
      vi.mocked(prompts.isCancel).mockImplementation((value) => value === mockCancelSymbol);

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await createIgnoreFile('/test/dir', false);

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(fs.writeFile).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });

    it('should return true when ignore file is successfully created', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'));
      vi.mocked(prompts.confirm).mockResolvedValue(true);

      const result = await createIgnoreFile('/test/dir', false);

      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
