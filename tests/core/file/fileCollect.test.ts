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
    });

    expect(mockProgress).toHaveBeenCalledTimes(2);
  });
});
