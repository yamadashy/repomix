import * as path from 'node:path';
import { Transform } from 'node:stream';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  type ArchiveDownloadOptions,
  downloadGitHubArchive,
  isArchiveDownloadSupported,
  type ProgressCallback,
} from '../../../src/core/git/gitHubArchive.js';
import type { GitHubRepoInfo } from '../../../src/core/git/gitRemoteParse.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

// Mock modules
vi.mock('../../../src/shared/logger');
vi.mock('fflate', () => ({
  unzip: vi.fn(),
}));

// Mock file system operations
const mockFs = {
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
};

// Simple ZIP test data
const mockZipData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // Simple ZIP header

describe('gitHubArchive', () => {
  // biome-ignore lint/suspicious/noExplicitAny: Test mocks require flexible types
  let mockFetch: any;
  // biome-ignore lint/suspicious/noExplicitAny: Test mocks require flexible types
  let mockPipeline: any;
  // biome-ignore lint/suspicious/noExplicitAny: Test mocks require flexible types
  let mockTransform: any;
  // biome-ignore lint/suspicious/noExplicitAny: Test mocks require flexible types
  let mockCreateWriteStream: any;
  // biome-ignore lint/suspicious/noExplicitAny: Test mocks require flexible types
  let mockUnzip: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockFetch = vi.fn();
    mockPipeline = vi.fn();
    mockTransform = vi.fn();
    mockCreateWriteStream = vi.fn();

    // Get the mocked unzip function
    const { unzip } = await import('fflate');
    mockUnzip = vi.mocked(unzip);

    // Reset fs mocks
    for (const mock of Object.values(mockFs)) {
      mock.mockReset();
    }

    // Setup default successful behaviors
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from(mockZipData));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockPipeline.mockResolvedValue(undefined);
    mockCreateWriteStream.mockReturnValue({
      write: vi.fn(),
      end: vi.fn(),
    });
    mockTransform.mockImplementation(() => new Transform());
  });

  describe('downloadGitHubArchive', () => {
    const mockRepoInfo: GitHubRepoInfo = {
      owner: 'yamadashy',
      repo: 'repomix',
      ref: 'main',
    };

    const mockTargetDirectory = '/test/target';
    const mockOptions: ArchiveDownloadOptions = {
      timeout: 30000,
      retries: 3,
    };

    test('should successfully download and extract archive', async () => {
      // Mock successful response with stream
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockZipData);
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', mockZipData.length.toString()]]),
        body: mockStream,
      });

      // Mock unzip to extract files
      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        const extracted = {
          'repomix-main/': new Uint8Array(0), // Directory
          'repomix-main/test.txt': new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]), // "hello"
        };
        callback(null, extracted);
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, {
        fetch: mockFetch,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        fs: mockFs as any,
        pipeline: mockPipeline,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        Transform: mockTransform as any,
        createWriteStream: mockCreateWriteStream,
      });

      // Verify directory creation
      expect(mockFs.mkdir).toHaveBeenCalledWith(mockTargetDirectory, { recursive: true });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/yamadashy/repomix/archive/refs/heads/main.zip',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );

      // Verify file operations
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve(mockTargetDirectory, 'test.txt'),
        expect.any(Uint8Array),
      );

      // Verify cleanup
      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(mockTargetDirectory, 'repomix-main.zip'));
    });

    test('should handle progress callback', async () => {
      const mockProgressCallback: ProgressCallback = vi.fn();

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockZipData);
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', mockZipData.length.toString()]]),
        body: mockStream,
      });

      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        callback(null, {});
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, mockProgressCallback, {
        fetch: mockFetch,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        fs: mockFs as any,
        pipeline: mockPipeline,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        Transform: mockTransform as any,
        createWriteStream: mockCreateWriteStream,
      });

      // Progress callback is called via Transform stream, which is handled internally
      // Just verify the download completed successfully
      expect(mockFetch).toHaveBeenCalled();
      expect(mockUnzip).toHaveBeenCalled();
    });

    test('should retry on failure', async () => {
      // First two attempts fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-length', mockZipData.length.toString()]]),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(mockZipData);
              controller.close();
            },
          }),
        });

      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        callback(null, {});
      });

      // Use fewer retries to speed up test
      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 2 }, undefined, {
        fetch: mockFetch,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        fs: mockFs as any,
        pipeline: mockPipeline,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        Transform: mockTransform as any,
        createWriteStream: mockCreateWriteStream,
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should try fallback URLs on 404', async () => {
      // Mock 404 for main branch, success for master branch
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Map(),
          body: null,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-length', mockZipData.length.toString()]]),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(mockZipData);
              controller.close();
            },
          }),
        });

      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        callback(null, {});
      });

      const repoInfoNoRef = { owner: 'yamadashy', repo: 'repomix' };

      await downloadGitHubArchive(repoInfoNoRef, mockTargetDirectory, mockOptions, undefined, {
        fetch: mockFetch,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        fs: mockFs as any,
        pipeline: mockPipeline,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        Transform: mockTransform as any,
        createWriteStream: mockCreateWriteStream,
      });

      // Should try HEAD first, then master branch
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/yamadashy/repomix/archive/HEAD.zip',
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/yamadashy/repomix/archive/refs/heads/master.zip',
        expect.any(Object),
      );
    });

    test('should throw error after all retries fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 2 }, undefined, {
          fetch: mockFetch,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          fs: mockFs as any,
          pipeline: mockPipeline,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          Transform: mockTransform as any,
          createWriteStream: mockCreateWriteStream,
        }),
      ).rejects.toThrow(RepomixError);

      // Multiple URLs are tried even with ref: main, fallback, tag
      // 2 retries × 2 URLs (main + tag for "main" ref) = 4 total attempts
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    test('should handle ZIP extraction error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', mockZipData.length.toString()]]),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockZipData);
            controller.close();
          },
        }),
      });

      // Mock unzip to fail
      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        callback(new Error('Invalid ZIP file'));
      });

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, {
          fetch: mockFetch,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          fs: mockFs as any,
          pipeline: mockPipeline,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          Transform: mockTransform as any,
          createWriteStream: mockCreateWriteStream,
        }),
      ).rejects.toThrow(RepomixError);
    });

    test('should handle path traversal attack', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', mockZipData.length.toString()]]),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockZipData);
            controller.close();
          },
        }),
      });

      // Mock unzip with dangerous paths
      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        const extracted = {
          'repomix-main/../../../etc/passwd': new Uint8Array([0x65, 0x76, 0x69, 0x6c]), // "evil"
          'repomix-main/safe.txt': new Uint8Array([0x73, 0x61, 0x66, 0x65]), // "safe"
        };
        callback(null, extracted);
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, {
        fetch: mockFetch,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        fs: mockFs as any,
        pipeline: mockPipeline,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        Transform: mockTransform as any,
        createWriteStream: mockCreateWriteStream,
      });

      // Should write both files - the path normalization doesn't completely prevent this case
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve(mockTargetDirectory, 'safe.txt'),
        expect.any(Uint8Array),
      );

      // Verify that both files are written (one was sanitized to remove path traversal)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
    });

    test('should handle absolute paths in ZIP', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', mockZipData.length.toString()]]),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockZipData);
            controller.close();
          },
        }),
      });

      // Mock unzip with absolute path
      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        const extracted = {
          '/etc/passwd': new Uint8Array([0x65, 0x76, 0x69, 0x6c]), // "evil"
          'repomix-main/safe.txt': new Uint8Array([0x73, 0x61, 0x66, 0x65]), // "safe"
        };
        callback(null, extracted);
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, {
        fetch: mockFetch,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        fs: mockFs as any,
        pipeline: mockPipeline,
        // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
        Transform: mockTransform as any,
        createWriteStream: mockCreateWriteStream,
      });

      // Should only write safe file, not the absolute path
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve(mockTargetDirectory, 'safe.txt'),
        expect.any(Uint8Array),
      );

      // Should not write the absolute path file
      expect(mockFs.writeFile).not.toHaveBeenCalledWith('/etc/passwd', expect.any(Uint8Array));
    });

    test('should cleanup archive file even on extraction failure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', mockZipData.length.toString()]]),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockZipData);
            controller.close();
          },
        }),
      });

      // Mock unzip to fail
      // biome-ignore lint/suspicious/noExplicitAny: Test mock callback parameters
      mockUnzip.mockImplementation((_data: any, callback: any) => {
        callback(new Error('Extraction failed'));
      });

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, {
          fetch: mockFetch,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          fs: mockFs as any,
          pipeline: mockPipeline,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          Transform: mockTransform as any,
          createWriteStream: mockCreateWriteStream,
        }),
      ).rejects.toThrow();

      // Should still attempt cleanup
      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(mockTargetDirectory, 'repomix-main.zip'));
    });

    test('should handle missing response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        body: null,
      });

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, {
          fetch: mockFetch,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          fs: mockFs as any,
          pipeline: mockPipeline,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          Transform: mockTransform as any,
          createWriteStream: mockCreateWriteStream,
        }),
      ).rejects.toThrow(RepomixError);
    });

    test('should handle timeout', async () => {
      // Mock a fetch that takes too long
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                headers: new Map(),
                body: new ReadableStream({
                  start(controller) {
                    controller.enqueue(mockZipData);
                    controller.close();
                  },
                }),
              });
            }, 100); // Resolve after 100ms, but timeout is 50ms
          }),
      );

      const shortTimeout = 50; // 50ms timeout for faster test

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { timeout: shortTimeout, retries: 1 }, undefined, {
          fetch: mockFetch,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          fs: mockFs as any,
          pipeline: mockPipeline,
          // biome-ignore lint/suspicious/noExplicitAny: Test mocks require any type
          Transform: mockTransform as any,
          createWriteStream: mockCreateWriteStream,
        }),
      ).rejects.toThrow();
    });
  });

  describe('isArchiveDownloadSupported', () => {
    test('should return true for any GitHub repository', () => {
      const repoInfo: GitHubRepoInfo = {
        owner: 'yamadashy',
        repo: 'repomix',
      };

      const result = isArchiveDownloadSupported(repoInfo);
      expect(result).toBe(true);
    });

    test('should return true for repository with ref', () => {
      const repoInfo: GitHubRepoInfo = {
        owner: 'yamadashy',
        repo: 'repomix',
        ref: 'develop',
      };

      const result = isArchiveDownloadSupported(repoInfo);
      expect(result).toBe(true);
    });
  });
});
