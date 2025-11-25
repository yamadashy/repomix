import { describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { getGitHistory } from '../../../src/core/git/gitHistoryHandle.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('gitHistoryHandle', () => {
  describe('getGitHistory', () => {
    const mockCommitMetadata = {
      hash: 'abc1234567890',
      abbreviatedHash: 'abc1234',
      parents: ['parent123'],
      author: { name: 'John Doe', email: 'john@example.com', date: '2025-11-20T12:00:00Z' },
      committer: { name: 'John Doe', email: 'john@example.com', date: '2025-11-20T12:00:00Z' },
      message: 'feat: add feature',
      body: '',
      files: ['src/feature.ts'],
    };

    const mockCommitGraph = {
      commits: [mockCommitMetadata],
      graph: '* abc1234 feat: add feature',
      mermaidGraph: 'gitGraph\n  commit id: "abc1234: feat: add feature"',
      mergeCommits: [],
      tags: { 'v1.0.0': 'abc1234567890' },
    };

    it('should return undefined when includeCommitHistory is not enabled', async () => {
      const config = createMockConfig({
        output: {
          git: { includeCommitHistory: false },
        },
      });

      const result = await getGitHistory(['/test/dir'], config);

      expect(result).toBeUndefined();
    });

    it('should return undefined when directory is not a git repository', async () => {
      const config = createMockConfig({
        output: {
          git: { includeCommitHistory: true },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(false),
        getCommitGraph: vi.fn(),
        getCommitPatch: vi.fn(),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(result).toBeUndefined();
      expect(mockDeps.isGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockDeps.getCommitGraph).not.toHaveBeenCalled();
    });

    it('should return git history with default options', async () => {
      const config = createMockConfig({
        output: {
          git: { includeCommitHistory: true },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(mockCommitGraph),
        getCommitPatch: vi.fn().mockResolvedValue('diff --git a/src/feature.ts'),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(result).toBeDefined();
      expect(result?.summary.totalCommits).toBe(1);
      expect(result?.summary.range).toBe('HEAD~50..HEAD'); // Default range
      expect(result?.summary.detailLevel).toBe('stat'); // Default detail level
      expect(result?.graph).toBeDefined();
      expect(result?.graph?.tags).toEqual({ 'v1.0.0': 'abc1234567890' });
      expect(result?.commits).toHaveLength(1);
      expect(result?.commits[0].metadata.hash).toBe('abc1234567890');
    });

    it('should use custom commit range from config', async () => {
      const config = createMockConfig({
        output: {
          git: {
            includeCommitHistory: true,
            commitRange: 'v1.0..HEAD',
          },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(mockCommitGraph),
        getCommitPatch: vi.fn().mockResolvedValue(''),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(mockDeps.getCommitGraph).toHaveBeenCalledWith('/test/dir', 'v1.0..HEAD');
      expect(result?.summary.range).toBe('v1.0..HEAD');
    });

    it('should use custom patch detail level from config', async () => {
      const config = createMockConfig({
        output: {
          git: {
            includeCommitHistory: true,
            commitPatchDetail: 'patch',
          },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(mockCommitGraph),
        getCommitPatch: vi.fn().mockResolvedValue('full diff content'),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(mockDeps.getCommitPatch).toHaveBeenCalledWith('/test/dir', 'abc1234567890', 'patch');
      expect(result?.summary.detailLevel).toBe('patch');
    });

    it('should exclude graph when includeCommitGraph is false', async () => {
      const config = createMockConfig({
        output: {
          git: {
            includeCommitHistory: true,
            includeCommitGraph: false,
          },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(mockCommitGraph),
        getCommitPatch: vi.fn().mockResolvedValue(''),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(result?.graph).toBeUndefined();
      expect(result?.commits).toHaveLength(1); // Commits still included
    });

    it('should exclude tags when includeGitTags is false', async () => {
      const config = createMockConfig({
        output: {
          git: {
            includeCommitHistory: true,
            includeGitTags: false,
          },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(mockCommitGraph),
        getCommitPatch: vi.fn().mockResolvedValue(''),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(result?.graph).toBeDefined();
      expect(result?.graph?.tags).toEqual({}); // Empty tags
    });

    it('should exclude patches when includeCommitPatches is false', async () => {
      const config = createMockConfig({
        output: {
          git: {
            includeCommitHistory: true,
            includeCommitPatches: false,
          },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(mockCommitGraph),
        getCommitPatch: vi.fn(),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(mockDeps.getCommitPatch).not.toHaveBeenCalled();
      expect(result?.commits[0].patch).toBe('');
    });

    it('should count merge commits correctly', async () => {
      const graphWithMerge = {
        ...mockCommitGraph,
        commits: [
          mockCommitMetadata,
          {
            ...mockCommitMetadata,
            hash: 'merge123',
            parents: ['parent1', 'parent2'], // Merge commit
          },
        ],
        mergeCommits: ['merge123'],
      };

      const config = createMockConfig({
        output: {
          git: { includeCommitHistory: true },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(graphWithMerge),
        getCommitPatch: vi.fn().mockResolvedValue(''),
      };

      const result = await getGitHistory(['/test/dir'], config, mockDeps);

      expect(result?.summary.totalCommits).toBe(2);
      expect(result?.summary.mergeCommits).toBe(1);
    });

    it('should throw RepomixError on failure', async () => {
      const config = createMockConfig({
        output: {
          git: { includeCommitHistory: true },
        },
      });

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockRejectedValue(new Error('Git command failed')),
        getCommitPatch: vi.fn(),
      };

      await expect(getGitHistory(['/test/dir'], config, mockDeps)).rejects.toThrow(
        'Failed to get git forensics: Git command failed',
      );
    });

    it('should use cwd when rootDirs is empty', async () => {
      const config = createMockConfig({
        output: {
          git: { includeCommitHistory: true },
        },
      }) as RepomixConfigMerged;
      // Override cwd after createMockConfig
      (config as { cwd: string }).cwd = '/fallback/dir';

      const mockDeps = {
        isGitRepository: vi.fn().mockResolvedValue(true),
        getCommitGraph: vi.fn().mockResolvedValue(mockCommitGraph),
        getCommitPatch: vi.fn().mockResolvedValue(''),
      };

      await getGitHistory([], config, mockDeps);

      expect(mockDeps.isGitRepository).toHaveBeenCalledWith('/fallback/dir');
    });
  });
});
