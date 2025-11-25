import { describe, expect, it, vi } from 'vitest';
import {
  getCommitGraph,
  getCommitMetadata,
  getCommitPatch,
  getTags,
  parseCommitRange,
} from '../../../src/core/git/gitHistory.js';

describe('gitHistory', () => {
  describe('parseCommitRange', () => {
    it('should parse HEAD~10..HEAD range', () => {
      const result = parseCommitRange('HEAD~10..HEAD');
      expect(result).toEqual({
        from: 'HEAD~10',
        to: 'HEAD',
        raw: 'HEAD~10..HEAD',
      });
    });

    it('should parse tag range v1.0..v2.0', () => {
      const result = parseCommitRange('v1.0..v2.0');
      expect(result).toEqual({
        from: 'v1.0',
        to: 'v2.0',
        raw: 'v1.0..v2.0',
      });
    });

    it('should parse branch range main..feature', () => {
      const result = parseCommitRange('main..feature');
      expect(result).toEqual({
        from: 'main',
        to: 'feature',
        raw: 'main..feature',
      });
    });

    it('should handle single commit by adding ^', () => {
      const result = parseCommitRange('abc1234');
      expect(result).toEqual({
        from: 'abc1234^',
        to: 'abc1234',
        raw: 'abc1234',
      });
    });

    it('should trim whitespace', () => {
      const result = parseCommitRange('  HEAD~5 .. HEAD  ');
      expect(result).toEqual({
        from: 'HEAD~5',
        to: 'HEAD',
        raw: '  HEAD~5 .. HEAD  ',
      });
    });

    it('should throw error for empty range', () => {
      expect(() => parseCommitRange('')).toThrow('Commit range must be a non-empty string');
    });

    it('should throw error for invalid range format', () => {
      expect(() => parseCommitRange('HEAD~10..')).toThrow('Invalid commit range format');
    });
  });

  describe('getCommitMetadata', () => {
    it('should parse commit metadata correctly', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: [
          'abc1234567890abcdef1234567890abcdef123456', // Full hash
          'abc1234', // Abbreviated hash
          'parent1234 parent5678', // Parents
          'John Doe', // Author name
          'john@example.com', // Author email
          '2025-11-23T19:16:54+00:00', // Author date
          'Jane Committer', // Committer name
          'jane@example.com', // Committer email
          '2025-11-23T19:20:00+00:00', // Committer date
          'feat: add new feature', // Subject
          '', // Empty line before body
          '  This is the commit body', // Body line 1
          '  with multiple lines', // Body line 2
          '', // Empty line after body
          'src/file1.ts', // File 1
          'src/file2.ts', // File 2
        ].join('\n'),
      });

      const result = await getCommitMetadata('/test/dir', 'abc1234', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result).toEqual({
        hash: 'abc1234567890abcdef1234567890abcdef123456',
        abbreviatedHash: 'abc1234',
        parents: ['parent1234', 'parent5678'],
        author: {
          name: 'John Doe',
          email: 'john@example.com',
          date: '2025-11-23T19:16:54+00:00',
        },
        committer: {
          name: 'Jane Committer',
          email: 'jane@example.com',
          date: '2025-11-23T19:20:00+00:00',
        },
        message: 'feat: add new feature',
        body: 'This is the commit body\n  with multiple lines',
        files: ['src/file1.ts', 'src/file2.ts'],
      });
    });

    it('should handle commit with no parents (initial commit)', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: [
          'abc1234567890abcdef1234567890abcdef123456',
          'abc1234',
          '', // No parents
          'John Doe',
          'john@example.com',
          '2025-11-23T19:16:54+00:00',
          'Jane Committer',
          'jane@example.com',
          '2025-11-23T19:20:00+00:00',
          'Initial commit',
          '',
          'README.md',
        ].join('\n'),
      });

      const result = await getCommitMetadata('/test/dir', 'abc1234', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result.parents).toEqual([]);
    });

    it('should throw error for invalid commit', async () => {
      const mockExecFileAsync = vi.fn().mockRejectedValue(new Error('fatal: bad revision'));

      await expect(
        getCommitMetadata('/test/dir', 'invalid', { execFileAsync: mockExecFileAsync as never }),
      ).rejects.toThrow('Failed to get commit metadata for invalid');
    });
  });

  describe('getTags', () => {
    it('should parse tags correctly', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: [
          'v1.0.0 abc1234567890abcdef1234567890abcdef123456',
          'v1.1.0 def5678901234abcdef5678901234abcdef567890',
          'v2.0.0 ghi9012345678abcdef9012345678abcdefgh1234',
        ].join('\n'),
      });

      const result = await getTags('/test/dir', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result).toEqual({
        'v1.0.0': 'abc1234567890abcdef1234567890abcdef123456',
        'v1.1.0': 'def5678901234abcdef5678901234abcdef567890',
        'v2.0.0': 'ghi9012345678abcdef9012345678abcdefgh1234',
      });
    });

    it('should return empty object if no tags', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: '',
      });

      const result = await getTags('/test/dir', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result).toEqual({});
    });

    it('should return empty object on error', async () => {
      const mockExecFileAsync = vi.fn().mockRejectedValue(new Error('Not a git repository'));

      const result = await getTags('/test/dir', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result).toEqual({});
    });
  });

  describe('getCommitPatch', () => {
    it('should get full patch', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: 'diff --git a/file.ts b/file.ts\n@@ -1,3 +1,4 @@\n...',
      });

      const result = await getCommitPatch('/test/dir', 'abc1234', 'full', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(mockExecFileAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'show',
        '--no-color',
        '--patch',
        'abc1234',
      ]);
      expect(result).toContain('diff --git');
    });

    it('should get stat patch', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: ' src/file.ts | 5 +++--\n 1 file changed, 3 insertions(+), 2 deletions(-)',
      });

      const result = await getCommitPatch('/test/dir', 'abc1234', 'stat', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(mockExecFileAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'show',
        '--no-color',
        '--stat',
        'abc1234',
      ]);
      expect(result).toContain('file changed');
    });

    it('should get files only', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: 'src/file1.ts\nsrc/file2.ts\n',
      });

      const result = await getCommitPatch('/test/dir', 'abc1234', 'files', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(mockExecFileAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'show',
        '--no-color',
        '--name-only',
        'abc1234',
      ]);
      expect(result).toContain('src/file1.ts');
    });

    it('should get metadata only', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: 'commit abc1234\nAuthor: John\nDate: 2025-11-23\n\n    commit message\n',
      });

      const result = await getCommitPatch('/test/dir', 'abc1234', 'metadata', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(mockExecFileAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'show',
        '--no-color',
        '--no-patch',
        'abc1234',
      ]);
      expect(result).toContain('commit abc1234');
    });

    it('should throw error for invalid detail level', async () => {
      await expect(
        getCommitPatch('/test/dir', 'abc1234', 'invalid' as never, {
          execFileAsync: vi.fn() as never,
        }),
      ).rejects.toThrow('Invalid detail level');
    });
  });

  describe('getCommitGraph', () => {
    it('should get commit graph with metadata', async () => {
      const mockExecFileAsync = vi
        .fn()
        // First call: graph visualization
        .mockResolvedValueOnce({
          stdout: '* abc1234 (HEAD) feat: add feature\n* def5678 fix: bug fix\n',
        })
        // Second call: commit hashes
        .mockResolvedValueOnce({
          stdout: 'abc1234567890\ndef5678901234\n',
        })
        // Third call: tags
        .mockResolvedValueOnce({
          stdout: 'v1.0.0 abc1234567890\n',
        });

      const mockGetCommitMetadata = vi
        .fn()
        .mockResolvedValueOnce({
          hash: 'abc1234567890',
          abbreviatedHash: 'abc1234',
          parents: ['def5678901234'],
          author: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
          committer: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
          message: 'feat: add feature',
          body: '',
          files: ['src/file.ts'],
        })
        .mockResolvedValueOnce({
          hash: 'def5678901234',
          abbreviatedHash: 'def5678',
          parents: ['parent123'],
          author: { name: 'John', email: 'john@example.com', date: '2025-11-22' },
          committer: { name: 'John', email: 'john@example.com', date: '2025-11-22' },
          message: 'fix: bug fix',
          body: '',
          files: ['src/fix.ts'],
        });

      const result = await getCommitGraph('/test/dir', 'HEAD~2..HEAD', {
        execFileAsync: mockExecFileAsync as never,
        parseCommitRange,
        getCommitMetadata: mockGetCommitMetadata,
        getTags: async () => ({ 'v1.0.0': 'abc1234567890' }),
      });

      expect(result.commits).toHaveLength(2);
      expect(result.graph).toContain('feat: add feature');
      expect(result.mermaidGraph).toContain('gitGraph');
      expect(result.tags).toEqual({ 'v1.0.0': 'abc1234567890' });
    });
  });
});
