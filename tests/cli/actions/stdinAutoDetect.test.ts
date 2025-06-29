import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as fileStdin from '../../../src/core/file/fileStdin.js';
import * as packager from '../../../src/core/packager.js';
import type { PackResult } from '../../../src/core/packager.js';

vi.mock('node:fs');
vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/core/file/fileStdin');
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/cli/cliSpinner');
vi.mock('../../../src/cli/cliPrint');
vi.mock('../../../src/cli/actions/migrationAction');

describe('stdin auto-detection', () => {
  const mockPackResult: PackResult = {
    totalFiles: 1,
    totalCharacters: 100,
    totalTokens: 25,
    fileCharCounts: {},
    fileTokenCounts: {},
    suspiciousFilesResults: [],
    suspiciousGitDiffResults: [],
    processedFiles: [],
    gitDiffTokenCount: 0,
    safeFilePaths: ['test-file.txt'],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({});
    
    // Default mock: fs.fstatSync returns character device (TTY) - no stdin auto-detection
    vi.mocked(fs.fstatSync).mockReturnValue({
      isFIFO: () => false,
      isFile: () => false,
      isCharacterDevice: () => true,
    } as any);
    vi.mocked(configLoader.mergeConfigs).mockReturnValue({
      cwd: process.cwd(),
      input: { maxFileSize: 50 * 1024 * 1024 },
      output: {
        filePath: 'output.txt',
        style: 'plain',
        parsableStyle: false,
        topFilesLength: 5,
        showLineNumbers: false,
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        copyToClipboard: false,
        files: true,
        fileSummary: true,
        directoryStructure: true,
        includeEmptyDirectories: false,
        stdout: false,
        headerText: undefined,
        instructionFilePath: undefined,
        git: { sortByChanges: true, sortByChangesMaxCommits: 100, includeDiffs: false },
      },
      ignore: { useGitignore: true, useDefaultPatterns: true, customPatterns: [] },
      include: [],
      security: { enableSecurityCheck: true },
      tokenCount: { encoding: 'cl100k_base' },
    });
    vi.mocked(packager.pack).mockResolvedValue(mockPackResult);
    vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue({
      filePaths: ['test-file.txt'],
      emptyDirPaths: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when stdin is piped and default directory is used', () => {
    beforeEach(() => {
      // Mock fs.fstatSync to return a FIFO (pipe) for stdin
      vi.mocked(fs.fstatSync).mockReturnValue({
        isFIFO: () => true,
        isFile: () => false,
        isCharacterDevice: () => false,
      } as any);
    });

    it('should auto-detect stdin input', async () => {
      const cliOptions: CliOptions = {};
      const directories = ['.'];

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).toHaveBeenCalledWith(process.cwd());
      expect(packager.pack).toHaveBeenCalledWith([process.cwd()], expect.any(Object), expect.any(Function), {}, [
        'test-file.txt',
      ]);
    });

    it('should not auto-detect when explicit directory is provided', async () => {
      const cliOptions: CliOptions = {};
      const directories = ['src'];

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).not.toHaveBeenCalled();
      expect(packager.pack).toHaveBeenCalledWith(
        [expect.stringContaining('src')],
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should not auto-detect when multiple directories are provided', async () => {
      const cliOptions: CliOptions = {};
      const directories = ['src', 'tests'];

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).not.toHaveBeenCalled();
      expect(packager.pack).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('src'), expect.stringContaining('tests')]),
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe('when dash argument is used', () => {
    it('should auto-detect stdin input with dash argument', async () => {
      const cliOptions: CliOptions = {};
      const directories = ['-'];

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).toHaveBeenCalledWith(process.cwd());
      expect(packager.pack).toHaveBeenCalledWith([process.cwd()], expect.any(Object), expect.any(Function), {}, [
        'test-file.txt',
      ]);
    });

    it('should handle dash argument even when stdin is TTY', async () => {
      // Mock stdin as TTY (interactive terminal)
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true,
      });

      const cliOptions: CliOptions = {};
      const directories = ['-'];

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe('when stdin is TTY (interactive terminal)', () => {
    beforeEach(() => {
      // Mock fs.fstatSync to return a character device (TTY) for stdin
      vi.mocked(fs.fstatSync).mockReturnValue({
        isFIFO: () => false,
        isFile: () => false,
        isCharacterDevice: () => true,
      } as any);
    });

    it('should not auto-detect stdin input', async () => {
      const cliOptions: CliOptions = {};
      const directories = ['.'];

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).not.toHaveBeenCalled();
      expect(packager.pack).toHaveBeenCalledWith([process.cwd()], expect.any(Object), expect.any(Function));
    });
  });

  describe('stdin input validation', () => {
    it('should not auto-detect stdin when multiple directories including dash', async () => {
      const cliOptions: CliOptions = {};
      const directories = ['-', 'src']; // Multiple directories including dash - should use normal directory processing

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).not.toHaveBeenCalled();
      expect(packager.pack).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('-'), expect.stringContaining('src')]),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should reject explicit directory with piped input', async () => {
      // Mock fs.fstatSync to return a FIFO (pipe) for stdin
      vi.mocked(fs.fstatSync).mockReturnValue({
        isFIFO: () => true,
        isFile: () => false,
        isCharacterDevice: () => false,
      } as any);

      const cliOptions: CliOptions = {};
      const directories = ['src']; // Explicit directory should work normally (no stdin auto-detection)

      await runDefaultAction(directories, process.cwd(), cliOptions);

      expect(fileStdin.readFilePathsFromStdin).not.toHaveBeenCalled();
      expect(packager.pack).toHaveBeenCalledWith(
        [expect.stringContaining('src')],
        expect.any(Object),
        expect.any(Function),
      );
    });
  });
});
