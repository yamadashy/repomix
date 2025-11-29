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
    // Null byte delimiter used by getCommitMetadata to separate format output from file list
    // Matches the %x00 format specifier used in git log
    const NULL_BYTE = '\0';

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
          NULL_BYTE, // Null byte separating body from files
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
          NULL_BYTE, // Null byte separating body from files
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

    it('should handle body text without leading spaces (edge case)', async () => {
      // This tests the fix for the fragile heuristic that assumed body lines start with spaces
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: [
          'abc1234567890abcdef1234567890abcdef123456',
          'abc1234',
          'parent123',
          'John Doe',
          'john@example.com',
          '2025-11-23T19:16:54+00:00',
          'Jane Committer',
          'jane@example.com',
          '2025-11-23T19:20:00+00:00',
          'fix: important bug fix',
          'This body line has no leading space', // Body without leading space
          'Neither does this one', // Another line without spaces
          '',
          'And this continues after blank', // More body after blank
          NULL_BYTE, // Null byte reliably separates body from files
          'src/bugfix.ts',
        ].join('\n'),
      });

      const result = await getCommitMetadata('/test/dir', 'abc1234', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result.body).toBe(
        'This body line has no leading space\nNeither does this one\n\nAnd this continues after blank',
      );
      expect(result.files).toEqual(['src/bugfix.ts']);
    });

    it('should handle empty body', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: [
          'abc1234567890abcdef1234567890abcdef123456',
          'abc1234',
          'parent123',
          'John Doe',
          'john@example.com',
          '2025-11-23T19:16:54+00:00',
          'Jane Committer',
          'jane@example.com',
          '2025-11-23T19:20:00+00:00',
          'chore: quick change',
          NULL_BYTE, // No body, just null byte
          'config.json',
        ].join('\n'),
      });

      const result = await getCommitMetadata('/test/dir', 'abc1234', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result.body).toBe('');
      expect(result.files).toEqual(['config.json']);
    });

    it('should handle files with special characters in paths', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: [
          'abc1234567890abcdef1234567890abcdef123456',
          'abc1234',
          'parent123',
          'John Doe',
          'john@example.com',
          '2025-11-23T19:16:54+00:00',
          'Jane Committer',
          'jane@example.com',
          '2025-11-23T19:20:00+00:00',
          'docs: update readme',
          NULL_BYTE,
          'docs/README (copy).md',
          'src/utils/date-time.ts',
          'tests/fixtures/data[1].json',
        ].join('\n'),
      });

      const result = await getCommitMetadata('/test/dir', 'abc1234', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result.files).toEqual(['docs/README (copy).md', 'src/utils/date-time.ts', 'tests/fixtures/data[1].json']);
    });

    it('should handle commit with no files changed', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: [
          'abc1234567890abcdef1234567890abcdef123456',
          'abc1234',
          'parent123',
          'John Doe',
          'john@example.com',
          '2025-11-23T19:16:54+00:00',
          'Jane Committer',
          'jane@example.com',
          '2025-11-23T19:20:00+00:00',
          'chore: empty commit',
          'Some body text',
          NULL_BYTE,
          // No files after null byte
        ].join('\n'),
      });

      const result = await getCommitMetadata('/test/dir', 'abc1234', {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(result.body).toBe('Some body text');
      expect(result.files).toEqual([]);
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

      const result = await getCommitPatch('/test/dir', 'abc1234', 'patch', false, {
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

      const result = await getCommitPatch('/test/dir', 'abc1234', 'stat', false, {
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

      const result = await getCommitPatch('/test/dir', 'abc1234', 'name-only', false, {
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

    it('should add --summary flag when includeSummary is true', async () => {
      const mockExecFileAsync = vi.fn().mockResolvedValue({
        stdout: 'diff --git a/file.ts b/file.ts\n create mode 100644 file.ts',
      });

      const result = await getCommitPatch('/test/dir', 'abc1234', 'patch', true, {
        execFileAsync: mockExecFileAsync as never,
      });

      expect(mockExecFileAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'show',
        '--no-color',
        '--patch',
        '--summary',
        'abc1234',
      ]);
      expect(result).toContain('diff --git');
    });

    it('should throw error for invalid detail level', async () => {
      await expect(
        getCommitPatch('/test/dir', 'abc1234', 'invalid' as never, false, {
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

    it('should generate valid Mermaid syntax for regular commits', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '* abc1234 feat: add feature\n' })
        .mockResolvedValueOnce({ stdout: 'abc1234567890\n' });

      const mockGetCommitMetadata = vi.fn().mockResolvedValueOnce({
        hash: 'abc1234567890',
        abbreviatedHash: 'abc1234',
        parents: ['parent123'],
        author: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        committer: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        message: 'feat: add feature',
        body: '',
        files: ['src/file.ts'],
      });

      const result = await getCommitGraph('/test/dir', 'HEAD~1..HEAD', {
        execFileAsync: mockExecFileAsync as never,
        parseCommitRange,
        getCommitMetadata: mockGetCommitMetadata,
        getTags: async () => ({}),
      });

      // Valid Mermaid syntax: commit id: "..."
      expect(result.mermaidGraph).toMatch(/commit id: "abc1234: feat: add feature"/);
      // Should NOT contain invalid merge syntax
      expect(result.mermaidGraph).not.toMatch(/merge abc1234/);
    });

    it('should generate valid Mermaid syntax for merge commits', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '* abc1234 Merge branch feature\n' })
        .mockResolvedValueOnce({ stdout: 'abc1234567890\n' });

      const mockGetCommitMetadata = vi.fn().mockResolvedValueOnce({
        hash: 'abc1234567890',
        abbreviatedHash: 'abc1234',
        parents: ['parent1', 'parent2'], // Multiple parents = merge commit
        author: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        committer: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        message: 'Merge branch feature',
        body: '',
        files: [],
      });

      const result = await getCommitGraph('/test/dir', 'HEAD~1..HEAD', {
        execFileAsync: mockExecFileAsync as never,
        parseCommitRange,
        getCommitMetadata: mockGetCommitMetadata,
        getTags: async () => ({}),
      });

      // Merge commits should use commit syntax with (merge) indicator and HIGHLIGHT type
      expect(result.mermaidGraph).toMatch(/commit id: "abc1234: \(merge\) Merge branch feature"/);
      expect(result.mermaidGraph).toContain('type: HIGHLIGHT');
      // Should NOT use invalid "merge <hash>" syntax
      expect(result.mermaidGraph).not.toMatch(/^\s*merge\s+abc/m);
    });

    it('should generate valid Mermaid syntax for tagged commits', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '* abc1234 (tag: v1.0.0) Release v1.0.0\n' })
        .mockResolvedValueOnce({ stdout: 'abc1234567890\n' });

      const mockGetCommitMetadata = vi.fn().mockResolvedValueOnce({
        hash: 'abc1234567890',
        abbreviatedHash: 'abc1234',
        parents: ['parent123'],
        author: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        committer: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        message: 'Release v1.0.0',
        body: '',
        files: ['package.json'],
      });

      const result = await getCommitGraph('/test/dir', 'HEAD~1..HEAD', {
        execFileAsync: mockExecFileAsync as never,
        parseCommitRange,
        getCommitMetadata: mockGetCommitMetadata,
        getTags: async () => ({ 'v1.0.0': 'abc1234567890' }),
      });

      // Tag should be on the same line as commit (valid Mermaid syntax)
      expect(result.mermaidGraph).toMatch(/commit id: "abc1234: Release v1\.0\.0" tag: "v1\.0\.0"/);
      // Should NOT have tag as separate commit line
      expect(result.mermaidGraph).not.toMatch(/^\s*commit tag:/m);
    });

    it('should escape quotes in commit messages for Mermaid', async () => {
      const mockExecFileAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '* abc1234 fix: handle "quoted" strings\n' })
        .mockResolvedValueOnce({ stdout: 'abc1234567890\n' });

      const mockGetCommitMetadata = vi.fn().mockResolvedValueOnce({
        hash: 'abc1234567890',
        abbreviatedHash: 'abc1234',
        parents: ['parent123'],
        author: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        committer: { name: 'John', email: 'john@example.com', date: '2025-11-23' },
        message: 'fix: handle "quoted" strings',
        body: '',
        files: ['src/parser.ts'],
      });

      const result = await getCommitGraph('/test/dir', 'HEAD~1..HEAD', {
        execFileAsync: mockExecFileAsync as never,
        parseCommitRange,
        getCommitMetadata: mockGetCommitMetadata,
        getTags: async () => ({}),
      });

      // Quotes should be escaped (replaced with single quotes) to avoid breaking Mermaid syntax
      expect(result.mermaidGraph).toContain("'quoted'");
      expect(result.mermaidGraph).not.toContain('"quoted"');
    });
  });
});
