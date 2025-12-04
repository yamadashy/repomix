import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { GIT_LOG_FORMAT_SEPARATOR, getGitLog, getGitLogs } from '../../../src/core/git/gitLogHandle.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

// Format constants - NUL only (git rejects NUL in commit content, making it 100% safe)
const NUL = '\x00';

// Test hashes - must be 40 hex chars to match real git hashes
const HASH1 = 'abc123def456abc123def456abc123def456abc1';
const HASH2 = 'def456abc123def456abc123def456abc123def4';

/**
 * Helper to create mock structured output for execGitLogStructured
 * Uses -z --raw format: all fields NUL-separated, commits separated by double-NUL
 *
 * Format: hash + NUL + abbrevHash + NUL + ... + body + NUL + rawFileEntries + NUL + NUL (end of record)
 */
const createStructuredOutput = (
  commits: Array<{
    hash: string;
    abbrevHash: string;
    parents?: string;
    authorName: string;
    authorEmail: string;
    authorDate: string;
    committerName: string;
    committerEmail: string;
    committerDate: string;
    subject: string;
    body?: string;
    files: Array<{ filename: string; status: string }>;
  }>,
): string => {
  return commits
    .map((c) => {
      // All metadata fields NUL-separated (safe because git prevents NUL in commits)
      const metadata = [
        c.hash,
        c.abbrevHash,
        c.parents || '',
        c.authorName,
        c.authorEmail,
        c.authorDate,
        c.committerName,
        c.committerEmail,
        c.committerDate,
        c.subject,
        c.body || '',
      ].join(NUL);

      // Raw file entries: ":mode mode blob blob STATUS\x00filename\x00"
      const rawEntries = c.files.map((f) => `:100644 100644 abc123 def456 ${f.status}${NUL}${f.filename}`).join(NUL);

      return `${metadata}${NUL}${rawEntries}`;
    })
    .join(NUL); // Single NUL between commits - parser finds boundaries by 40-char hash
};

describe('gitLogHandle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getGitLog', () => {
    test('should return git log content when directory is a git repository', async () => {
      const mockExecGitLog = vi.fn().mockResolvedValue('mock log content');
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);

      const result = await getGitLog('/test/dir', 10, {
        execGitLog: mockExecGitLog,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe('mock log content');
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitLog).toHaveBeenCalledWith('/test/dir', 10, GIT_LOG_FORMAT_SEPARATOR);
    });

    test('should return empty string when directory is not a git repository', async () => {
      const mockExecGitLog = vi.fn();
      const mockIsGitRepository = vi.fn().mockResolvedValue(false);

      const result = await getGitLog('/test/dir', 10, {
        execGitLog: mockExecGitLog,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe('');
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitLog).not.toHaveBeenCalled();
      expect(logger.trace).toHaveBeenCalledWith('Directory /test/dir is not a git repository');
    });

    test('should throw error when git log command fails', async () => {
      const mockError = new Error('git command failed');
      const mockExecGitLog = vi.fn().mockRejectedValue(mockError);
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);

      await expect(
        getGitLog('/test/dir', 10, {
          execGitLog: mockExecGitLog,
          isGitRepository: mockIsGitRepository,
        }),
      ).rejects.toThrow('git command failed');

      expect(logger.trace).toHaveBeenCalledWith('Failed to get git log:', 'git command failed');
    });
  });

  describe('getGitLogs', () => {
    test('should return git logs when includeLogs is enabled', async () => {
      // Mock output using two-pass structured format
      const mockStructuredOutput = createStructuredOutput([
        {
          hash: HASH1,
          abbrevHash: 'abc12',
          authorName: 'Author One',
          authorEmail: 'author1@example.com',
          authorDate: '2024-01-01T10:00:00+09:00',
          committerName: 'Author One',
          committerEmail: 'author1@example.com',
          committerDate: '2024-01-01T10:00:00+09:00',
          subject: 'Initial commit',
          files: [
            { filename: 'file1.txt', status: 'A' },
            { filename: 'file2.txt', status: 'A' },
          ],
        },
        {
          hash: HASH2,
          abbrevHash: 'def45',
          parents: HASH1,
          authorName: 'Author Two',
          authorEmail: 'author2@example.com',
          authorDate: '2024-01-02T11:00:00+09:00',
          committerName: 'Author Two',
          committerEmail: 'author2@example.com',
          committerDate: '2024-01-02T11:00:00+09:00',
          subject: 'Add feature',
          files: [{ filename: 'src/feature.ts', status: 'A' }],
        },
      ]);

      const mockExecGitLogStructured = vi.fn().mockResolvedValue(mockStructuredOutput);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
            includeLogsCount: 25,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project/src'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(result).toEqual({
        logCommits: [
          {
            date: '2024-01-01T10:00:00+09:00',
            message: 'Initial commit',
            files: ['file1.txt', 'file2.txt'],
          },
          {
            date: '2024-01-02T11:00:00+09:00',
            message: 'Add feature',
            files: ['src/feature.ts'],
          },
        ],
        graph: undefined,
        summary: undefined,
      });

      expect(mockExecGitLogStructured).toHaveBeenCalledWith({
        directory: '/project/src',
        range: undefined,
        maxCommits: 25,
      });
    });

    test('should return undefined when includeLogs is disabled', async () => {
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: false,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project/src'], config);

      expect(result).toBeUndefined();
    });

    test('should use default commit count when includeLogsCount is not specified', async () => {
      const mockStructuredOutput = createStructuredOutput([
        {
          hash: HASH1,
          abbrevHash: 'abc12',
          authorName: 'Author One',
          authorEmail: 'author1@example.com',
          authorDate: '2024-01-01T10:00:00+09:00',
          committerName: 'Author One',
          committerEmail: 'author1@example.com',
          committerDate: '2024-01-01T10:00:00+09:00',
          subject: 'Test commit',
          files: [{ filename: 'test.txt', status: 'M' }],
        },
      ]);

      const mockExecGitLogStructured = vi.fn().mockResolvedValue(mockStructuredOutput);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs(['/project/src'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitLogStructured).toHaveBeenCalledWith({
        directory: '/project/src',
        range: undefined,
        maxCommits: 50,
      });
    });

    test('should use first directory as git root', async () => {
      const mockExecGitLogStructured = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/fallback',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs(['/first/dir', '/second/dir'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitLogStructured).toHaveBeenCalledWith({
        directory: '/first/dir',
        range: undefined,
        maxCommits: 50,
      });
    });

    test('should fallback to config.cwd when no directories provided', async () => {
      const mockExecGitLogStructured = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/fallback',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await getGitLogs([], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitLogStructured).toHaveBeenCalledWith({
        directory: '/fallback',
        range: undefined,
        maxCommits: 50,
      });
    });

    test('should throw RepomixError when execGitLogStructured fails', async () => {
      const mockError = new Error('git failed');
      const mockExecGitLogStructured = vi.fn().mockRejectedValue(mockError);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      await expect(
        getGitLogs(['/project'], config, {
          execGitLogStructured: mockExecGitLogStructured,
          execGitLogTextBlob: vi.fn().mockResolvedValue(''),
          execGitGraph: vi.fn().mockResolvedValue(''),
          getTags: vi.fn().mockResolvedValue({}),
          isGitRepository: vi.fn().mockResolvedValue(true),
        }),
      ).rejects.toThrow(RepomixError);

      await expect(
        getGitLogs(['/project'], config, {
          execGitLogStructured: mockExecGitLogStructured,
          execGitLogTextBlob: vi.fn().mockResolvedValue(''),
          execGitGraph: vi.fn().mockResolvedValue(''),
          getTags: vi.fn().mockResolvedValue({}),
          isGitRepository: vi.fn().mockResolvedValue(true),
        }),
      ).rejects.toThrow('Failed to get git logs: git failed');
    });

    test('should handle empty git log output', async () => {
      const mockExecGitLogStructured = vi.fn().mockResolvedValue('');
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(result).toEqual({
        logCommits: [],
      });
    });

    test('should parse git log correctly with malformed separator content', async () => {
      // Test behavior when log content doesn't match expected separator format
      const malformedLogContent = 'random content without proper RECORD_SEP or FIELD_SEP';

      const mockExecGitLogStructured = vi.fn().mockResolvedValue(malformedLogContent);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      // Should return empty logCommits array when content cannot be parsed properly
      expect(result?.logCommits).toEqual([]);
    });

    test('should correctly parse filenames that look like git hashes', async () => {
      // A 40-char hex filename should be treated as a filename, not a commit boundary
      const hashLikeFilename = 'abcdef1234567890abcdef1234567890abcdef12';
      const mockStructuredOutput = createStructuredOutput([
        {
          hash: HASH1,
          abbrevHash: 'abc12',
          authorName: 'Author One',
          authorEmail: 'author1@example.com',
          authorDate: '2024-01-01T10:00:00+09:00',
          committerName: 'Author One',
          committerEmail: 'author1@example.com',
          committerDate: '2024-01-01T10:00:00+09:00',
          subject: 'Test commit with hash-like filename',
          files: [
            { filename: hashLikeFilename, status: 'A' },
            { filename: 'normal-file.txt', status: 'A' },
          ],
        },
      ]);

      const mockExecGitLogStructured = vi.fn().mockResolvedValue(mockStructuredOutput);
      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      // Both files should be captured, including the hash-like filename
      expect(result?.logCommits[0].files).toContain(hashLikeFilename);
      expect(result?.logCommits[0].files).toContain('normal-file.txt');
      expect(result?.logCommits[0].files.length).toBe(2);
    });

    test('should call execGitLogTextBlob when patch is requested', async () => {
      const mockStructuredOutput = createStructuredOutput([
        {
          hash: HASH1,
          abbrevHash: 'abc12',
          authorName: 'Author One',
          authorEmail: 'author1@example.com',
          authorDate: '2024-01-01T10:00:00+09:00',
          committerName: 'Author One',
          committerEmail: 'author1@example.com',
          committerDate: '2024-01-01T10:00:00+09:00',
          subject: 'Test commit',
          files: [{ filename: 'test.txt', status: 'M' }],
        },
      ]);

      // Patch output uses double-NUL as separator (matches execGitLogTextBlob format)
      const mockPatchOutput = `${NUL}${NUL}diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1 +1 @@
-old
+new`;

      const mockExecGitLogStructured = vi.fn().mockResolvedValue(mockStructuredOutput);
      const mockExecGitLogTextBlob = vi.fn().mockResolvedValue(mockPatchOutput);

      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
            includeCommitPatches: true,
            commitPatchDetail: 'patch',
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: mockExecGitLogTextBlob,
        execGitGraph: vi.fn().mockResolvedValue(''),
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitLogTextBlob).toHaveBeenCalledWith({
        directory: '/project',
        range: 'HEAD~50..HEAD',
        maxCommits: 50,
        patchDetail: 'patch',
      });

      // Verify patch is included in result
      expect(result?.logCommits[0].patch).toContain('diff --git');
    });

    test('should call execGitGraph when graph is requested', async () => {
      const mockStructuredOutput = createStructuredOutput([
        {
          hash: HASH1,
          abbrevHash: 'abc12',
          authorName: 'Author One',
          authorEmail: 'author1@example.com',
          authorDate: '2024-01-01T10:00:00+09:00',
          committerName: 'Author One',
          committerEmail: 'author1@example.com',
          committerDate: '2024-01-01T10:00:00+09:00',
          subject: 'Test commit',
          files: [{ filename: 'test.txt', status: 'M' }],
        },
      ]);

      const mockGraphOutput = '* abc12 Test commit\n* def45 Previous commit';

      const mockExecGitLogStructured = vi.fn().mockResolvedValue(mockStructuredOutput);
      const mockExecGitGraph = vi.fn().mockResolvedValue(mockGraphOutput);

      const config: RepomixConfigMerged = {
        cwd: '/project',
        output: {
          git: {
            includeLogs: true,
            includeCommitGraph: true,
          },
        },
      } as RepomixConfigMerged;

      const result = await getGitLogs(['/project'], config, {
        execGitLogStructured: mockExecGitLogStructured,
        execGitLogTextBlob: vi.fn().mockResolvedValue(''),
        execGitGraph: mockExecGitGraph,
        getTags: vi.fn().mockResolvedValue({}),
        isGitRepository: vi.fn().mockResolvedValue(true),
      });

      expect(mockExecGitGraph).toHaveBeenCalledWith({
        directory: '/project',
        range: 'HEAD~50..HEAD',
        maxCommits: 50,
      });

      // Verify graph is included in result
      expect(result?.graph?.graph).toBe(mockGraphOutput);
    });
  });
});
