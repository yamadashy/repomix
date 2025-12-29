import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import iconv from 'iconv-lite';
import isBinaryPath from 'is-binary-path';
import { isBinaryFile } from 'isbinaryfile';
import jschardet from 'jschardet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectFiles } from '../../../src/core/file/fileCollect.js';
import type { FileCollectTask } from '../../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../../src/core/file/workers/fileCollectWorker.js';
import { logger } from '../../../src/shared/logger.js';
import type { WorkerOptions, WorkerRuntime } from '../../../src/shared/processConcurrency.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Define the max file size constant for tests
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

vi.mock('node:fs/promises');
vi.mock('is-binary-path');
vi.mock('isbinaryfile');
vi.mock('jschardet');
vi.mock('iconv-lite');
vi.mock('../../../src/shared/logger');

interface MockInitTaskRunner {
  <T, R>(
    options: WorkerOptions,
  ): {
    run: (task: T) => Promise<R>;
    cleanup: () => Promise<void>;
  };
  lastRuntime?: WorkerRuntime;
}

const mockInitTaskRunner = <T, R>(options: WorkerOptions) => {
  // Store runtime for verification in tests
  (mockInitTaskRunner as MockInitTaskRunner).lastRuntime = options.runtime;
  return {
    run: async (task: T) => {
      return (await fileCollectWorker(task as FileCollectTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe('fileCollect', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Setup basic file size mock to fix stat
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      isFile: () => true,
    } as Stats);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should collect non-binary files', async () => {
    const mockFilePaths = ['file1.txt', 'file2.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    vi.mocked(isBinaryPath).mockReturnValue(false);
    vi.mocked(isBinaryFile).mockResolvedValue(false);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('file content'));
    vi.mocked(jschardet.detect).mockReturnValue({ encoding: 'utf-8', confidence: 0.99 });
    vi.mocked(iconv.decode).mockReturnValue('decoded content');

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual({
      rawFiles: [
        { path: 'file1.txt', content: 'decoded content' },
        { path: 'file2.txt', content: 'decoded content' },
      ],
      skippedFiles: [],
    });
  });

  it('should skip binary files', async () => {
    const mockFilePaths = ['binary.bin', 'text.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    vi.mocked(isBinaryPath)
      .mockReturnValueOnce(true) // for binary.bin (skip by extension)
      .mockReturnValueOnce(false); // for text.txt
    vi.mocked(isBinaryFile).mockResolvedValue(false);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('file content'));
    vi.mocked(jschardet.detect).mockReturnValue({ encoding: 'utf-8', confidence: 0.99 });
    vi.mocked(iconv.decode).mockReturnValue('decoded content');

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual({
      rawFiles: [{ path: 'text.txt', content: 'decoded content' }],
      skippedFiles: [{ path: 'binary.bin', reason: 'binary-extension' }],
    });
    expect(logger.debug).toHaveBeenCalledWith(`Skipping binary file: ${path.resolve('/root/binary.bin')}`);
  });

  it('should skip large files based on default maxFileSize', async () => {
    const mockFilePaths = ['large.txt', 'normal.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();
    const largePath = path.resolve('/root/large.txt');

    vi.mocked(fs.stat)
      .mockResolvedValueOnce({
        // for large.txt
        size: MAX_FILE_SIZE + 1024, // Slightly over limit
        isFile: () => true,
      } as Stats)
      .mockResolvedValueOnce({
        // for normal.txt
        size: 1024,
        isFile: () => true,
      } as Stats);
    vi.mocked(isBinaryPath).mockReturnValue(false);
    vi.mocked(isBinaryFile).mockResolvedValue(false);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('file content'));
    vi.mocked(jschardet.detect).mockReturnValue({ encoding: 'utf-8', confidence: 0.99 });
    vi.mocked(iconv.decode).mockReturnValue('decoded content');

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual({
      rawFiles: [{ path: 'normal.txt', content: 'decoded content' }],
      skippedFiles: [{ path: 'large.txt', reason: 'size-limit' }],
    });
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('File exceeds size limit:'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining(largePath));

    // Verify fs.readFile is not called for the large file
    expect(fs.readFile).not.toHaveBeenCalledWith(largePath);
    expect(fs.readFile).toHaveBeenCalledTimes(1);
  });

  it('should respect custom maxFileSize setting', async () => {
    const mockFilePaths = ['medium.txt', 'small.txt'];
    const mockRootDir = '/root';
    const customMaxFileSize = 5 * 1024 * 1024; // 5MB
    const mockConfig = createMockConfig({
      input: {
        maxFileSize: customMaxFileSize,
      },
    });
    const mediumPath = path.resolve('/root/medium.txt');

    vi.mocked(fs.stat)
      .mockResolvedValueOnce({
        // for medium.txt
        size: 10 * 1024 * 1024, // 10MB (exceeds custom 5MB limit)
        isFile: () => true,
      } as Stats)
      .mockResolvedValueOnce({
        // for small.txt
        size: 1024, // 1KB (within limit)
        isFile: () => true,
      } as Stats);
    vi.mocked(isBinaryPath).mockReturnValue(false);
    vi.mocked(isBinaryFile).mockResolvedValue(false);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('file content'));
    vi.mocked(jschardet.detect).mockReturnValue({ encoding: 'utf-8', confidence: 0.99 });
    vi.mocked(iconv.decode).mockReturnValue('decoded content');

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual({
      rawFiles: [{ path: 'small.txt', content: 'decoded content' }],
      skippedFiles: [{ path: 'medium.txt', reason: 'size-limit' }],
    });
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('File exceeds size limit:'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('10240.0KB > 5120.0KB'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining(mediumPath));

    // Verify fs.readFile is not called for the medium file
    expect(fs.readFile).not.toHaveBeenCalledWith(mediumPath);
    expect(fs.readFile).toHaveBeenCalledTimes(1);
  });

  it('should handle file read errors', async () => {
    const mockFilePaths = ['error.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    vi.mocked(isBinaryPath).mockReturnValue(false);
    vi.mocked(isBinaryFile).mockResolvedValue(false);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual({
      rawFiles: [],
      skippedFiles: [{ path: 'error.txt', reason: 'encoding-error' }],
    });
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to read file: ${path.resolve('/root/error.txt')}`,
      expect.any(Error),
    );
  });

  it('should use worker_threads runtime when calling initTaskRunner', async () => {
    const mockFilePaths = ['test.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    vi.mocked(isBinaryPath).mockReturnValue(false);
    vi.mocked(isBinaryFile).mockResolvedValue(false);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('file content'));
    vi.mocked(jschardet.detect).mockReturnValue({ encoding: 'utf-8', confidence: 0.99 });
    vi.mocked(iconv.decode).mockReturnValue('decoded content');

    await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect((mockInitTaskRunner as MockInitTaskRunner).lastRuntime).toBe('worker_threads');
  });
});
