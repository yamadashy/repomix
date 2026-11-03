import { Transform, Writable } from 'node:stream';
import type { pipeline as pipelineType } from 'node:stream/promises';
import type * as zlib from 'node:zlib';
import type { extract as tarExtractType } from 'tar';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { createArchiveEntryFilter as createArchiveEntryFilterType } from '../../../src/core/git/archiveEntryFilter.js';
import {
  type ArchiveDownloadDeps,
  type ArchiveDownloadOptions,
  downloadGitHubArchive,
  isArchiveDownloadSupported,
  type ProgressCallback,
} from '../../../src/core/git/gitHubArchive.js';
import type { GitHubRepoInfo } from '../../../src/core/git/gitRemoteParse.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { type MockedDeps, mockOverloaded } from '../../testing/depsDoubles.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';

// Simple test data
const mockStreamData = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]); // gzip magic bytes

describe('gitHubArchive', () => {
  let mockDeps: MockedDeps<ArchiveDownloadDeps>;
  let mockFetch: MockedDeps<ArchiveDownloadDeps>['fetch'];
  let mockPipeline: MockedDeps<ArchiveDownloadDeps>['pipeline'];

  beforeEach(() => {
    vi.clearAllMocks();
    silenceLogger();

    mockDeps = {
      fetch: vi.fn<typeof globalThis.fetch>(),
      pipeline: mockOverloaded<typeof pipelineType>(),
      Transform,
      tarExtract: mockOverloaded<typeof tarExtractType>(),
      createGunzip: mockOverloaded<typeof zlib.createGunzip>(),
      createArchiveEntryFilter: vi.fn<typeof createArchiveEntryFilterType>(() => () => true),
    };
    mockFetch = mockDeps.fetch;
    mockPipeline = mockDeps.pipeline;
    mockPipeline.mockResolvedValue(undefined);
    // Stream stand-ins: only their place in the pipeline matters, since pipeline itself is a double.
    mockDeps.tarExtract.mockReturnValue(
      new Writable({
        write(_chunk, _enc, cb) {
          cb();
        },
      }) as unknown as ReturnType<typeof tarExtractType>,
    );
    mockDeps.createGunzip.mockReturnValue(
      new Transform({
        transform(chunk, _enc, cb) {
          cb(null, chunk);
        },
      }) as unknown as ReturnType<typeof zlib.createGunzip>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    // A real Response that streams the gzip bytes with a content-length, or has no body at all.
    const createMockResponse = ({ status = 200, body }: { status?: number; body?: null } = {}): Response => {
      if (body === null) {
        return new Response(null, { status });
      }
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(mockStreamData);
            controller.close();
          },
        }),
        { status, headers: { 'content-length': mockStreamData.length.toString() } },
      );
    };

    test('should successfully download and extract archive', async () => {
      mockFetch.mockResolvedValue(createMockResponse());

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, mockOptions, undefined, mockDeps);

      // Verify fetch was called with tar.gz URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://codeload.github.com/yamadashy/repomix/tar.gz/main',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );

      // Verify tar extract was called with correct options including filter
      expect(mockDeps.tarExtract).toHaveBeenCalledWith({
        cwd: mockTargetDirectory,
        strip: 1,
        filter: expect.any(Function),
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

    test('gives the caller signal to the extraction pipeline', async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValue(createMockResponse());

      await downloadGitHubArchive(
        mockRepoInfo,
        mockTargetDirectory,
        { ...mockOptions, signal: controller.signal },
        undefined,
        mockDeps,
      );

      expect(mockPipeline.mock.calls[0].at(-1)).toEqual({ signal: controller.signal });
    });

    test('aborts the fetch when the caller signal fires and does not retry', async () => {
      const controller = new AbortController();
      mockFetch.mockImplementation((_url, init) => {
        const fetchSignal = init?.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          fetchSignal.addEventListener('abort', () => reject(fetchSignal.reason), { once: true });
          controller.abort();
        });
      });

      await expect(
        downloadGitHubArchive(
          mockRepoInfo,
          mockTargetDirectory,
          { retries: 3, signal: controller.signal },
          undefined,
          mockDeps,
        ),
      ).rejects.toMatchObject({ name: 'AbortError' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should retry on network failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse());

      await downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 3 }, undefined, mockDeps);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should try fallback URLs on 404', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            status: 404,
            body: null,
          }),
        )
        .mockResolvedValueOnce(createMockResponse());

      const repoInfoNoRef = { owner: 'yamadashy', repo: 'repomix' };

      await downloadGitHubArchive(repoInfoNoRef, mockTargetDirectory, mockOptions, undefined, mockDeps);

      // Should try HEAD first, then master branch
      expect(mockFetch).toHaveBeenCalledWith(
        'https://codeload.github.com/yamadashy/repomix/tar.gz/HEAD',
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://codeload.github.com/yamadashy/repomix/tar.gz/master',
        expect.any(Object),
      );
    });

    test('should throw error after all retries fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 2 }, undefined, mockDeps),
      ).rejects.toThrow(RepomixError);

      // 2 retries × 1 URL (tag fallback is null with codeload.github.com) = 2 total attempts
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should handle extraction error', async () => {
      mockFetch.mockResolvedValue(createMockResponse());
      mockPipeline.mockRejectedValue(new Error('tar extraction failed'));

      await expect(
        downloadGitHubArchive(mockRepoInfo, mockTargetDirectory, { retries: 1 }, undefined, mockDeps),
      ).rejects.toThrow(RepomixError);
    });

    test('should handle missing response body', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: null }));

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
