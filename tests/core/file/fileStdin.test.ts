import path from 'node:path';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  filterValidLines,
  readFilePathsFromStdin,
  readLinesFromStream,
  resolveAndDeduplicatePaths,
  type StdinDependencies,
} from '../../../src/core/file/fileStdin.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

describe('fileStdin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('filterValidLines', () => {
    it('should filter out empty lines', () => {
      const lines = ['file1.txt', '', 'file2.txt', '   ', 'file3.txt'];
      const result = filterValidLines(lines);
      expect(result).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
    });

    it('should filter out comment lines starting with #', () => {
      const lines = ['file1.txt', '# This is a comment', 'file2.txt', '#another comment', 'file3.txt'];
      const result = filterValidLines(lines);
      expect(result).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
    });

    it('should trim whitespace from lines', () => {
      const lines = ['  file1.txt  ', '\tfile2.txt\t', ' file3.txt\n'];
      const result = filterValidLines(lines);
      expect(result).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
    });

    it('should return empty array when all lines are invalid', () => {
      const lines = ['', '# comment', '   ', '#another comment'];
      const result = filterValidLines(lines);
      expect(result).toEqual([]);
    });

    it('should handle mixed valid and invalid lines', () => {
      const lines = ['file1.txt', '', '# comment', '  file2.txt  ', '\t\t', '#another comment', 'file3.txt'];
      const result = filterValidLines(lines);
      expect(result).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
    });
  });

  describe('resolveAndDeduplicatePaths', () => {
    const cwd = path.resolve('/test/cwd');

    it('should resolve relative paths to absolute paths', () => {
      const lines = ['file1.txt', './file2.txt', '../file3.txt'];
      const result = resolveAndDeduplicatePaths(lines, cwd);

      const expected = [
        path.resolve(cwd, 'file1.txt'),
        path.resolve(cwd, 'file2.txt'),
        path.resolve(cwd, '../file3.txt'),
      ];
      expect(result).toEqual(expected);
    });

    it('should keep absolute paths as-is with normalization', () => {
      const absolutePath1 = path.resolve('/absolute/path/file1.txt');
      const absolutePath2 = path.resolve('/another/path/file2.txt');
      // Create a platform-specific complex path that should resolve to absolutePath2
      const complexPath = path.resolve('/another/./absolute/../path/file2.txt');
      const lines = [absolutePath1, complexPath];
      const result = resolveAndDeduplicatePaths(lines, cwd);

      expect(result).toEqual([absolutePath1, absolutePath2]);
    });

    it('should deduplicate identical paths', () => {
      const lines = ['file1.txt', './file1.txt', 'file1.txt'];
      const result = resolveAndDeduplicatePaths(lines, cwd);

      const expected = [path.resolve(cwd, 'file1.txt')];
      expect(result).toEqual(expected);
    });

    it('should handle mixed absolute and relative paths with duplicates', () => {
      const absolutePath1 = path.resolve(cwd, 'file1.txt');
      const absolutePath3 = path.resolve('/absolute/file3.txt');
      const lines = ['file1.txt', absolutePath1, './file2.txt', absolutePath3, 'file2.txt'];
      const result = resolveAndDeduplicatePaths(lines, cwd);

      const expected = [absolutePath1, path.resolve(cwd, 'file2.txt'), absolutePath3];
      expect(result).toEqual(expected);
    });

    it('should normalize paths with ./ and ../ segments', () => {
      const lines = ['./dir/../file1.txt', 'dir/./file2.txt', './dir/./sub/../file3.txt'];
      const result = resolveAndDeduplicatePaths(lines, cwd);

      const expected = [
        path.resolve(cwd, 'file1.txt'),
        path.resolve(cwd, 'dir/file2.txt'),
        path.resolve(cwd, 'dir/file3.txt'),
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('readLinesFromStream', () => {
    it('should read lines from a readable stream', async () => {
      const mockInterface = {
        [Symbol.asyncIterator]: async function* () {
          yield 'line1';
          yield 'line2';
          yield 'line3';
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStream = new Readable();

      const result = await readLinesFromStream(mockStream, mockCreateInterface);

      expect(mockCreateInterface).toHaveBeenCalledWith({ input: mockStream });
      expect(result).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle empty stream', async () => {
      const mockInterface = {
        [Symbol.asyncIterator]: async function* () {
          // Empty generator
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStream = new Readable();

      const result = await readLinesFromStream(mockStream, mockCreateInterface);

      expect(result).toEqual([]);
    });

    it('should handle single line', async () => {
      const mockInterface = {
        [Symbol.asyncIterator]: async function* () {
          yield 'single line';
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStream = new Readable();

      const result = await readLinesFromStream(mockStream, mockCreateInterface);

      expect(result).toEqual(['single line']);
    });
  });

  describe('readFilePathsFromStdin', () => {
    const cwd = path.resolve('/test/cwd');

    it('should throw error when stdin is TTY', async () => {
      const mockStdin = { isTTY: true } as NodeJS.ReadableStream & { isTTY?: boolean };
      const deps: StdinDependencies = {
        stdin: mockStdin,
        createReadlineInterface: vi.fn(),
      };

      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow(RepomixError);
      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow(
        'No data provided via stdin. Please pipe file paths to repomix when using --stdin flag.',
      );
    });

    it('should throw error when no valid file paths found', async () => {
      const mockInterface = {
        [Symbol.asyncIterator]: async function* () {
          yield '';
          yield '# comment';
          yield '   ';
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStdin = { isTTY: false } as NodeJS.ReadableStream & { isTTY?: boolean };

      const deps: StdinDependencies = {
        stdin: mockStdin,
        createReadlineInterface: mockCreateInterface,
      };

      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow(RepomixError);
      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow('No valid file paths found in stdin input.');
    });

    it('should successfully read and process file paths from stdin', async () => {
      const absoluteFile3 = path.resolve('/absolute/file3.txt');
      const mockInterface = {
        [Symbol.asyncIterator]: async function* () {
          yield 'file1.txt';
          yield '# comment';
          yield './file2.txt';
          yield '';
          yield absoluteFile3;
          yield 'file1.txt'; // duplicate
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStdin = { isTTY: false } as NodeJS.ReadableStream & { isTTY?: boolean };

      const deps: StdinDependencies = {
        stdin: mockStdin,
        createReadlineInterface: mockCreateInterface,
      };

      const result = await readFilePathsFromStdin(cwd, deps);

      expect(mockCreateInterface).toHaveBeenCalledWith({ input: mockStdin });
      expect(result).toEqual({
        filePaths: [path.resolve(cwd, 'file1.txt'), path.resolve(cwd, 'file2.txt'), absoluteFile3],
        emptyDirPaths: [],
      });
    });

    it('should handle complex path normalization', async () => {
      const absoluteFile3 = path.resolve('/absolute/file3.txt');
      // Create a complex path that resolves to the same as absoluteFile3
      const complexAbsolutePath = path.resolve('/absolute/./path/../file3.txt');
      const mockInterface = {
        [Symbol.asyncIterator]: async function* () {
          yield './dir/../file1.txt';
          yield 'dir/./file2.txt';
          yield complexAbsolutePath;
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStdin = { isTTY: false } as NodeJS.ReadableStream & { isTTY?: boolean };

      const deps: StdinDependencies = {
        stdin: mockStdin,
        createReadlineInterface: mockCreateInterface,
      };

      const result = await readFilePathsFromStdin(cwd, deps);

      expect(result.filePaths).toEqual([
        path.resolve(cwd, 'file1.txt'),
        path.resolve(cwd, 'dir', 'file2.txt'),
        absoluteFile3,
      ]);
    });

    it('should wrap generic errors in RepomixError', async () => {
      const mockInterface = {
        // biome-ignore lint/correctness/useYield: This generator intentionally throws without yielding
        [Symbol.asyncIterator]: async function* (): AsyncGenerator<string, void, unknown> {
          throw new Error('Generic error');
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStdin = { isTTY: false } as NodeJS.ReadableStream & { isTTY?: boolean };

      const deps: StdinDependencies = {
        stdin: mockStdin,
        createReadlineInterface: mockCreateInterface,
      };

      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow(RepomixError);
      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow(
        'Failed to read file paths from stdin: Generic error',
      );
    });

    it('should propagate RepomixError without wrapping', async () => {
      const mockStdin = { isTTY: true } as NodeJS.ReadableStream & { isTTY?: boolean };
      const deps: StdinDependencies = {
        stdin: mockStdin,
        createReadlineInterface: vi.fn(),
      };

      const error = await readFilePathsFromStdin(cwd, deps).catch((e) => e);
      expect(error).toBeInstanceOf(RepomixError);
      expect(error.message).toBe(
        'No data provided via stdin. Please pipe file paths to repomix when using --stdin flag.',
      );
    });

    it('should handle unknown error types', async () => {
      const mockInterface = {
        // biome-ignore lint/correctness/useYield: This generator intentionally throws without yielding
        [Symbol.asyncIterator]: async function* (): AsyncGenerator<string, void, unknown> {
          throw 'string error';
        },
      };

      const mockCreateInterface = vi.fn().mockReturnValue(mockInterface);
      const mockStdin = { isTTY: false } as NodeJS.ReadableStream & { isTTY?: boolean };

      const deps: StdinDependencies = {
        stdin: mockStdin,
        createReadlineInterface: mockCreateInterface,
      };

      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow(RepomixError);
      await expect(readFilePathsFromStdin(cwd, deps)).rejects.toThrow(
        'An unexpected error occurred while reading from stdin.',
      );
    });
  });
});
