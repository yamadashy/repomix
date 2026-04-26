import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { SuspiciousFileResult } from '../../../src/core/security/securityCheck.js';
import { validateFileSafety } from '../../../src/core/security/validateFileSafety.js';
import { logger } from '../../../src/shared/logger.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

describe('validateFileSafety', () => {
  it('should validate file safety and return safe files and paths', async () => {
    const rawFiles: RawFile[] = [
      { path: 'file1.txt', content: 'content1' },
      { path: 'file2.txt', content: 'content2' },
      { path: 'file3.txt', content: 'content3' },
    ];
    const safeRawFiles = [rawFiles[0], rawFiles[1]];
    const config: RepomixConfigMerged = {
      security: { enableSecurityCheck: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();
    const suspiciousFilesResults: SuspiciousFileResult[] = [
      { filePath: 'file2.txt', messages: ['something suspicious.'], type: 'file' },
    ];
    const deps = {
      runSecurityCheck: vi.fn().mockResolvedValue(suspiciousFilesResults),
      filterOutUntrustedFiles: vi.fn().mockReturnValue(safeRawFiles),
    };

    const result = await validateFileSafety(rawFiles, progressCallback, config, undefined, undefined, deps);

    expect(deps.runSecurityCheck).toHaveBeenCalledWith(rawFiles, progressCallback, undefined, undefined);
    expect(deps.filterOutUntrustedFiles).toHaveBeenCalledWith(rawFiles, suspiciousFilesResults);
    expect(result).toEqual({
      safeRawFiles,
      safeFilePaths: ['file1.txt', 'file2.txt'],
      suspiciousFilesResults,
      suspiciousGitDiffResults: [],
      suspiciousGitLogResults: [],
    });
  });

  describe('git content warnings', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('warns about each suspicious git diff/log entry with singular/plural form', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const config: RepomixConfigMerged = {
        security: { enableSecurityCheck: true },
      } as RepomixConfigMerged;
      const progressCallback: RepomixProgressCallback = vi.fn();

      const allResults: SuspiciousFileResult[] = [
        { filePath: 'work_tree', messages: ['leaked key'], type: 'gitDiff' },
        { filePath: 'staged', messages: ['leaked key', 'token'], type: 'gitDiff' },
        { filePath: 'commit_log', messages: ['secret', 'pw', 'token'], type: 'gitLog' },
      ];
      const deps = {
        runSecurityCheck: vi.fn().mockResolvedValue(allResults),
        filterOutUntrustedFiles: vi.fn().mockReturnValue([]),
      };

      const result = await validateFileSafety([], progressCallback, config, undefined, undefined, deps);

      expect(result.suspiciousGitDiffResults).toHaveLength(2);
      expect(result.suspiciousGitLogResults).toHaveLength(1);

      const warnings = warnSpy.mock.calls.map((c) => String(c[0]));
      // Header lines for each section
      expect(warnings).toContain('Security issues found in Git diffs, but they will still be included in the output');
      expect(warnings).toContain('Security issues found in Git logs, but they will still be included in the output');
      // Singular form for 1 message, plural for >1
      expect(warnings).toContain('  - work_tree: 1 issue detected');
      expect(warnings).toContain('  - staged: 2 issues detected');
      expect(warnings).toContain('  - commit_log: 3 issues detected');
    });

    it('does not log a header when no suspicious git content is found', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const config: RepomixConfigMerged = {
        security: { enableSecurityCheck: true },
      } as RepomixConfigMerged;

      await validateFileSafety([], vi.fn(), config, undefined, undefined, {
        runSecurityCheck: vi.fn().mockResolvedValue([]),
        filterOutUntrustedFiles: vi.fn().mockReturnValue([]),
      });

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  it('skips runSecurityCheck entirely when enableSecurityCheck is false', async () => {
    // Pin the negative path of the `if (config.security.enableSecurityCheck)` guard.
    // Dropping the guard would still pass every other test in this file because
    // they all enable the check; this one fails if the guard ever regresses.
    const config: RepomixConfigMerged = {
      security: { enableSecurityCheck: false },
    } as RepomixConfigMerged;
    const rawFiles: RawFile[] = [{ path: 'file1.txt', content: 'content' }];
    const deps = {
      runSecurityCheck: vi.fn(),
      filterOutUntrustedFiles: vi.fn().mockReturnValue(rawFiles),
    };

    const result = await validateFileSafety(rawFiles, vi.fn(), config, undefined, undefined, deps);

    expect(deps.runSecurityCheck).not.toHaveBeenCalled();
    expect(result.suspiciousFilesResults).toEqual([]);
    expect(result.suspiciousGitDiffResults).toEqual([]);
    expect(result.suspiciousGitLogResults).toEqual([]);
    expect(result.safeFilePaths).toEqual(['file1.txt']);
  });
});
