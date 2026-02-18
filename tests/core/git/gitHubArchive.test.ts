import { Transform, Writable } from 'node:stream';
import type { pipeline as pipelineType } from 'node:stream/promises';
import type * as zlib from 'node:zlib';
import type { extract as tarExtractType } from 'tar';
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

// Type for the deps parameter of downloadGitHubArchive
interface MockDeps {
  fetch: typeof globalThis.fetch;
  pipeline: typeof pipelineType;
  Transform: typeof Transform;
  tarExtract: typeof tarExtractType;
  createGunzip: typeof zlib.createGunzip;
}

// Simple test data
const mockStreamData = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]); // gzip magic bytes

describe('gitHubArchive', () => {
  let mockFetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;
  let mockPipeline: ReturnType<typeof vi.fn<typeof pipelineType>>;
  let mockTarExtract: ReturnType<typeof vi.fn<typeof tarExtractType>>;
  let mockCreateGunzip: ReturnType<typeof vi.fn<typeof zlib.createGunzip>>;
  let mockDeps: MockDeps;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFetch = vi.fn<typeof globalThis.fetch>();
    mockPipeline = vi.fn<typeof pipelineType>().mockResolvedValue(undefined);
    mockTarExtract = vi.fn<typeof tarExtractType>().mockReturnValue(
      new Writable({
        write(_chunk, _enc, cb) {
          cb();
        },
      }) as unknown as ReturnType<typeof tarExtractType>,
    );
    mockCreateGunzip = vi.fn<typeof zlib.createGunzip>().mockReturnValue(
      new Transform({
        transform(chunk, _enc, cb) {
          cb(null, chunk);
        },
      }) as unknown as ReturnType<typeof zlib.createGunzip>,
    );

    mockDeps = {
      fetch: mockFetch,
      pipeline: mockPipeline as unknown as typeof pipelineType,
      Transform,
      tarExtract: mockTarExtract as unknown as typeof tarExtractType,
      createGunzip: mockCreateGunzip as unknown as typeof zlib.createGunzip,
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

    const createMockResponse = (overrides: Partial<Response> = {}): Response => {
      return {
        ok: true,
        status: 200,
        headers: new Map([['content-length', mockStreamData.length.toString()]]),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockStreamData);
            controller.close();
          },
        }),
        ...overrides,
      } as unknown as Response;
    };

    test('should successfully download and extract archive', async () => {
      mockFetch.mockResolvedValue(createMockResponse());

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, mockDeps);

      // Verify fetch was called with tar.gz URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/yamadashy/repomix/archive/refs/heads/main.tar.gz',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );

      // Verify tar extract was called with correct options
      expect(mockTarExtract).toHaveBeenCalledWith({
        cwd: mockTargetDirectory,
        strip: 1,
      });

      // Verify streaming pipeline was used
      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    test('should handle progress callback', async () => {
      const mockProgressCallback: ProgressCallback = vi.fn();
      mockFetch.mockResolvedValue(createMockResponse());

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, mockProgressCallback, mockDeps);

      expect(mockFetch).toHaveBeenCalled();
      expect(mockPipeline).toHaveBeenCalled();
    });

    test('should retry on network failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse());

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 2 }, undefined, mockDeps);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should try fallback URLs on 404', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 404,
            headers: new Map(),
            body: null,
          } as unknown as Partial<Response>),
        )
        .mockResolvedValueOnce(createMockResponse());

      const repoInfoNoRef = { owner: 'yamadashy', repo: 'repomix' };

      await downloadGitHubArchive(repoInfoNoRef, mockTargetDirectory, mockOptions, undefined, mockDeps);

      // Should try HEAD first, then master branch
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/yamadashy/repomix/archive/HEAD.tar.gz',
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/yamadashy/repomix/archive/refs/heads/master.tar.gz',
        expect.any(Object),
      );
    });

    test('should throw error after all retries fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 2 }, undefined, mockDeps),
      ).rejects.toThrow(RepomixError);

      // 2 retries × 2 URLs (main + tag for "main" ref) = 4 total attempts
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    test('should handle extraction error', async () => {
      mockFetch.mockResolvedValue(createMockResponse());
      mockPipeline.mockRejectedValue(new Error('tar extraction failed'));

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, mockDeps),
      ).rejects.toThrow(RepomixError);
    });

    test('should not retry on extraction error', async () => {
      mockFetch.mockResolvedValue(createMockResponse());
      mockPipeline.mockRejectedValue(new RepomixError('Failed to extract archive: tar error'));

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 3 }, undefined, mockDeps),
      ).rejects.toThrow(RepomixError);

      // Should only fetch once - extraction errors should not trigger retries
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle missing response body', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: null } as unknown as Partial<Response>));

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, mockDeps),
      ).rejects.toThrow(RepomixError);
    });

    test('should handle timeout', async () => {
      mockFetch.mockImplementation(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              resolve(createMockResponse());
            }, 100);

            // Respect AbortSignal so timeout actually cancels the fetch
            init?.signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          }),
      );

      const shortTimeout = 50;

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
