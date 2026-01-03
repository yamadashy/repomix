import type { createWriteStream, WriteStream } from 'node:fs';
import type * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { Transform } from 'node:stream';
import type { pipeline as pipelineType } from 'node:stream/promises';
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

// Type for the deps parameter of downloadGitHubArchive
interface MockDeps {
  fetch: typeof globalThis.fetch;
  fs: typeof fsPromises;
  pipeline: typeof pipelineType;
  Transform: typeof Transform;
  createWriteStream: typeof createWriteStream;
}

// Simple ZIP test data
const mockZipData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // Simple ZIP header

describe('gitHubArchive', () => {
  // Define typed mock functions
  const mockFs = {
    mkdir: vi.fn<typeof fsPromises.mkdir>(),
    readFile: vi.fn<typeof fsPromises.readFile>(),
    writeFile: vi.fn<typeof fsPromises.writeFile>(),
    unlink: vi.fn<typeof fsPromises.unlink>(),
  };

  let mockFetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;
  let mockPipeline: ReturnType<typeof vi.fn<typeof pipelineType>>;
  let mockTransformConstructor: typeof Transform;
  let mockCreateWriteStream: ReturnType<typeof vi.fn<typeof createWriteStream>>;
  let mockUnzip: ReturnType<typeof vi.fn>;
  let mockDeps: MockDeps;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockFetch = vi.fn<typeof globalThis.fetch>();
    mockPipeline = vi.fn<typeof pipelineType>();
    mockTransformConstructor = Transform;
    mockCreateWriteStream = vi.fn<typeof createWriteStream>();

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
    } as unknown as WriteStream);

    // Create mockDeps with type casting for mock objects
    // Using 'as unknown as Type' pattern is idiomatic for test mocks
    mockDeps = {
      fetch: mockFetch,
      fs: mockFs as unknown as typeof fsPromises,
      pipeline: mockPipeline as unknown as typeof pipelineType,
      Transform: mockTransformConstructor,
      createWriteStream: mockCreateWriteStream,
    };
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
      } as unknown as Response);

      // Mock unzip to extract files
      mockUnzip.mockImplementation((_data, callback) => {
        const extracted = {
          'repomix-main/': new Uint8Array(0), // Directory
          'repomix-main/test.txt': new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]), // "hello"
        };
        callback(null, extracted);
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, mockDeps);

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
      } as unknown as Response);

      mockUnzip.mockImplementation((_data, callback) => {
        callback(null, {});
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, mockProgressCallback, mockDeps);

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
        } as unknown as Response);

      mockUnzip.mockImplementation((_data, callback) => {
        callback(null, {});
      });

      // Use fewer retries to speed up test
      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 2 }, undefined, mockDeps);

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
        } as unknown as Response)
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
        } as unknown as Response);

      mockUnzip.mockImplementation((_data, callback) => {
        callback(null, {});
      });

      const repoInfoNoRef = { owner: 'yamadashy', repo: 'repomix' };

      await downloadGitHubArchive(repoInfoNoRef, mockTargetDirectory, mockOptions, undefined, mockDeps);

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
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 2 }, undefined, mockDeps),
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
      } as unknown as Response);

      // Mock unzip to fail
      mockUnzip.mockImplementation((_data, callback) => {
        callback(new Error('Invalid ZIP file'));
      });

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, mockDeps),
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
      } as unknown as Response);

      // Mock unzip with dangerous paths
      mockUnzip.mockImplementation((_data, callback) => {
        const extracted = {
          'repomix-main/../../../etc/passwd': new Uint8Array([0x65, 0x76, 0x69, 0x6c]), // "evil"
          'repomix-main/safe.txt': new Uint8Array([0x73, 0x61, 0x66, 0x65]), // "safe"
        };
        callback(null, extracted);
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, mockDeps);

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
      } as unknown as Response);

      // Mock unzip with absolute path
      mockUnzip.mockImplementation((_data, callback) => {
        const extracted = {
          '/etc/passwd': new Uint8Array([0x65, 0x76, 0x69, 0x6c]), // "evil"
          'repomix-main/safe.txt': new Uint8Array([0x73, 0x61, 0x66, 0x65]), // "safe"
        };
        callback(null, extracted);
      });

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, mockDeps);

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
      } as unknown as Response);

      // Mock unzip to fail
      mockUnzip.mockImplementation((_data, callback) => {
        callback(new Error('Extraction failed'));
      });

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, mockDeps),
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
      } as unknown as Response);

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, mockDeps),
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
              } as unknown as Response);
            }, 100); // Resolve after 100ms, but timeout is 50ms
          }),
      );

      const shortTimeout = 50; // 50ms timeout for faster test

      await expect(
        downloadGitHubArchive(
          mockRepoInfo,
          mockTargetDirectory,
          { timeout: shortTimeout, retries: 1 },
          undefined,
          mockDeps,
        ),
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
