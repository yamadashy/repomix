import path from 'node:path';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { collectFiles } from '../../../src/core/file/fileCollect.js';
import type { FileReadResult } from '../../../src/core/file/fileRead.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Define the max file size constant for tests
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

describe('fileCollect', () => {
  let mockReadRawFile: Mock<(filePath: string, maxFileSize: number) => Promise<FileReadResult>>;

  beforeEach(() => {
    mockReadRawFile = vi.fn();
  });

  it('should collect non-binary files', async () => {
    const mockFilePaths = ['file1.txt', 'file2.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    mockReadRawFile.mockResolvedValue({ content: 'file content' });

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      readRawFile: mockReadRawFile,
      readRawFileSync: undefined,
    });

    expect(result).toEqual({
      rawFiles: [
        { path: 'file1.txt', content: 'file content' },
        { path: 'file2.txt', content: 'file content' },
      ],
      skippedFiles: [],
    });
    expect(mockReadRawFile).toHaveBeenCalledTimes(2);
    expect(mockReadRawFile).toHaveBeenCalledWith(path.resolve('/root/file1.txt'), MAX_FILE_SIZE);
    expect(mockReadRawFile).toHaveBeenCalledWith(path.resolve('/root/file2.txt'), MAX_FILE_SIZE);
  });

  it('should skip binary files', async () => {
    const mockFilePaths = ['binary.bin', 'text.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    mockReadRawFile.mockImplementation(async (filePath) => {
      if (filePath.endsWith('binary.bin')) {
        return { content: null, skippedReason: 'binary-extension' };
      }
      return { content: 'file content' };
    });

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      readRawFile: mockReadRawFile,
      readRawFileSync: undefined,
    });

    expect(result).toEqual({
      rawFiles: [{ path: 'text.txt', content: 'file content' }],
      skippedFiles: [{ path: 'binary.bin', reason: 'binary-extension' }],
    });
  });

  it('should skip large files based on default maxFileSize', async () => {
    const mockFilePaths = ['large.txt', 'normal.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    mockReadRawFile.mockImplementation(async (filePath) => {
      if (filePath.endsWith('large.txt')) {
        return { content: null, skippedReason: 'size-limit' };
      }
      return { content: 'file content' };
    });

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      readRawFile: mockReadRawFile,
      readRawFileSync: undefined,
    });

    expect(result).toEqual({
      rawFiles: [{ path: 'normal.txt', content: 'file content' }],
      skippedFiles: [{ path: 'large.txt', reason: 'size-limit' }],
    });
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

    mockReadRawFile.mockImplementation(async (filePath) => {
      if (filePath.endsWith('medium.txt')) {
        return { content: null, skippedReason: 'size-limit' };
      }
      return { content: 'file content' };
    });

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      readRawFile: mockReadRawFile,
      readRawFileSync: undefined,
    });

    expect(result).toEqual({
      rawFiles: [{ path: 'small.txt', content: 'file content' }],
      skippedFiles: [{ path: 'medium.txt', reason: 'size-limit' }],
    });

    // Verify readRawFile is called with custom maxFileSize
    expect(mockReadRawFile).toHaveBeenCalledWith(path.resolve('/root/medium.txt'), customMaxFileSize);
    expect(mockReadRawFile).toHaveBeenCalledWith(path.resolve('/root/small.txt'), customMaxFileSize);
  });

  it('should handle file read errors', async () => {
    const mockFilePaths = ['error.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();

    mockReadRawFile.mockResolvedValue({ content: null, skippedReason: 'encoding-error' });

    const result = await collectFiles(mockFilePaths, mockRootDir, mockConfig, () => {}, {
      readRawFile: mockReadRawFile,
      readRawFileSync: undefined,
    });

    expect(result).toEqual({
      rawFiles: [],
      skippedFiles: [{ path: 'error.txt', reason: 'encoding-error' }],
    });
  });

  it('should call progressCallback for each file', async () => {
    const mockFilePaths = ['file1.txt', 'file2.txt'];
    const mockRootDir = '/root';
    const mockConfig = createMockConfig();
    const mockProgress = vi.fn();

    mockReadRawFile.mockResolvedValue({ content: 'file content' });

    await collectFiles(mockFilePaths, mockRootDir, mockConfig, mockProgress, {
      readRawFile: mockReadRawFile,
      readRawFileSync: undefined,
    });

    expect(mockProgress).toHaveBeenCalledTimes(2);
  });

  describe('sync+async fallback', () => {
    let mockReadRawFileSync: Mock<(filePath: string, maxFileSize: number) => FileReadResult | null>;

    beforeEach(() => {
      mockReadRawFileSync = vi.fn();
    });

    it('should use sync path for all files when available', async () => {
      const mockFilePaths = ['file1.txt', 'file2.txt'];
      const mockConfig = createMockConfig();

      mockReadRawFileSync.mockReturnValue({ content: 'sync content' });

      const result = await collectFiles(mockFilePaths, '/root', mockConfig, () => {}, {
        readRawFile: mockReadRawFile,
        readRawFileSync: mockReadRawFileSync,
      });

      expect(result.rawFiles).toEqual([
        { path: 'file1.txt', content: 'sync content' },
        { path: 'file2.txt', content: 'sync content' },
      ]);
      expect(mockReadRawFileSync).toHaveBeenCalledTimes(2);
      expect(mockReadRawFile).not.toHaveBeenCalled();
    });

    it('should fall back to async when sync returns null', async () => {
      const mockFilePaths = ['utf8.txt', 'shift-jis.txt'];
      const mockConfig = createMockConfig();

      mockReadRawFileSync.mockImplementation((filePath) => {
        if (filePath.endsWith('shift-jis.txt')) {
          return null; // Needs async fallback
        }
        return { content: 'sync content' };
      });
      mockReadRawFile.mockResolvedValue({ content: 'async content' });

      const result = await collectFiles(mockFilePaths, '/root', mockConfig, () => {}, {
        readRawFile: mockReadRawFile,
        readRawFileSync: mockReadRawFileSync,
      });

      expect(result.rawFiles).toEqual([
        { path: 'utf8.txt', content: 'sync content' },
        { path: 'shift-jis.txt', content: 'async content' },
      ]);
      expect(mockReadRawFileSync).toHaveBeenCalledTimes(2);
      expect(mockReadRawFile).toHaveBeenCalledTimes(1);
      expect(mockReadRawFile).toHaveBeenCalledWith(path.resolve('/root/shift-jis.txt'), MAX_FILE_SIZE);
    });

    it('should handle sync skip results without async fallback', async () => {
      const mockFilePaths = ['binary.jpg', 'text.txt'];
      const mockConfig = createMockConfig();

      mockReadRawFileSync.mockImplementation((filePath) => {
        if (filePath.endsWith('binary.jpg')) {
          return { content: null, skippedReason: 'binary-extension' };
        }
        return { content: 'sync content' };
      });

      const result = await collectFiles(mockFilePaths, '/root', mockConfig, () => {}, {
        readRawFile: mockReadRawFile,
        readRawFileSync: mockReadRawFileSync,
      });

      expect(result.rawFiles).toEqual([{ path: 'text.txt', content: 'sync content' }]);
      expect(result.skippedFiles).toEqual([{ path: 'binary.jpg', reason: 'binary-extension' }]);
      expect(mockReadRawFile).not.toHaveBeenCalled();
    });

    it('should preserve file order when mixing sync and async results', async () => {
      const mockFilePaths = ['a.txt', 'b.txt', 'c.txt', 'd.txt'];
      const mockConfig = createMockConfig();

      // Files b and d need async fallback
      mockReadRawFileSync.mockImplementation((filePath) => {
        if (filePath.endsWith('b.txt') || filePath.endsWith('d.txt')) {
          return null;
        }
        return { content: `sync:${filePath.split('/').pop()}` };
      });
      mockReadRawFile.mockImplementation(async (filePath) => ({
        content: `async:${filePath.split('/').pop()}`,
      }));

      const result = await collectFiles(mockFilePaths, '/root', mockConfig, () => {}, {
        readRawFile: mockReadRawFile,
        readRawFileSync: mockReadRawFileSync,
      });

      expect(result.rawFiles.map((f) => f.content)).toEqual(['sync:a.txt', 'async:b.txt', 'sync:c.txt', 'async:d.txt']);
    });
  });
});
