import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { reportCompletion, reportSecurityCheck, reportSummary, reportTopFiles, resolveOutputPath } from '../../src/cli/cliReport.js';
import type { SuspiciousFileResult } from '../../src/core/security/securityCheck.js';
import type { PackResult } from '../../src/index.js';
import { logger } from '../../src/shared/logger.js';
import { createMockConfig } from '../testing/testUtils.js';

vi.mock('../../src/shared/logger');
vi.mock('picocolors', () => ({
  default: {
    dim: (str: string) => `DIM:${str}`,
    green: (str: string) => `GREEN:${str}`,
    yellow: (str: string) => `YELLOW:${str}`,
    red: (str: string) => `RED:${str}`,
    cyan: (str: string) => `CYAN:${str}`,
    underline: (str: string) => `UNDERLINE:${str}`,
    bold: (str: string) => `BOLD:${str}`,
  },
}));

describe('cliReport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('reportSummary', () => {
    test('should print summary with suspicious files and security check enabled', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });
      const suspiciousFiles: SuspiciousFileResult[] = [
        { filePath: 'suspicious.txt', messages: ['Contains sensitive data'], type: 'file' },
      ];

      const packResult: PackResult = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        fileCharCounts: { 'file1.txt': 100 },
        fileTokenCounts: { 'file1.txt': 50 },
        suspiciousFilesResults: suspiciousFiles,
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 suspicious file(s) detected and excluded'));
    });

    test('should print summary with git diffs included', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
        output: { git: { includeDiffs: true } },
      });

      const packResult: PackResult = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        fileCharCounts: { 'file1.txt': 100 },
        fileTokenCounts: { 'file1.txt': 50 },
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        gitDiffTokenCount: 50,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Git diffs included'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('50 tokens'));
    });

    test('should print summary with no git diffs', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
        output: { git: { includeDiffs: true } },
      });

      const packResult: PackResult = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        fileCharCounts: { 'file1.txt': 100 },
        fileTokenCounts: { 'file1.txt': 50 },
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('No git diffs included'));
    });

    test('should print summary with git logs included', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
        output: { git: { includeLogs: true } },
      });

      const packResult: PackResult = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        fileCharCounts: { 'file1.txt': 100 },
        fileTokenCounts: { 'file1.txt': 50 },
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 30,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Git logs included'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('30 tokens'));
    });

    test('should print summary with no git logs', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
        output: { git: { includeLogs: true } },
      });

      const packResult: PackResult = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        fileCharCounts: { 'file1.txt': 100 },
        fileTokenCounts: { 'file1.txt': 50 },
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('No git logs included'));
    });

    test('should print summary with security check disabled', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: false },
      });

      const packResult: PackResult = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        fileCharCounts: { 'file1.txt': 100 },
        fileTokenCounts: { 'file1.txt': 50 },
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Security check disabled'));
    });

    test('should print absolute path for single file output', () => {
      const config = createMockConfig({
        output: { filePath: 'repomix-output.xml' },
        security: { enableSecurityCheck: false },
      });
      const packResult: PackResult = {
        totalFiles: 1,
        totalCharacters: 100,
        totalTokens: 20,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(`       Output: ${path.resolve('/test/project', 'repomix-output.xml')}`);
    });

    test('should print single path when outputFiles has one entry', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: false },
      });
      const packResult: PackResult = {
        totalFiles: 1,
        totalCharacters: 100,
        totalTokens: 20,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        outputFiles: ['repomix-output.xml'],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(`       Output: ${path.resolve('/test/project', 'repomix-output.xml')}`);
      expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('parts'));
    });

    test('should print range display for multi-part output', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: false },
      });
      const packResult: PackResult = {
        totalFiles: 2,
        totalCharacters: 200,
        totalTokens: 40,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        processedFiles: [],
        safeFilePaths: [],
        outputFiles: ['repomix-output-1.xml', 'repomix-output-2.xml'],
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
        skippedFiles: [],
      };

      reportSummary('/test/project', packResult, config);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(path.resolve('/test/project', 'repomix-output-1.xml')),
      );
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('(2 parts)'));
    });
  });

  describe('reportSecurityCheck', () => {
    test('should skip printing when security check is disabled', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: false },
      });

      reportSecurityCheck('/root', [], [], [], config);
      expect(logger.log).not.toHaveBeenCalled();
    });

    test('should print message when no suspicious files found', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });

      reportSecurityCheck('/root', [], [], [], config);

      expect(logger.log).toHaveBeenCalledWith('🔎 Security Check:');
      expect(logger.log).toHaveBeenCalledWith('DIM:──────────────────');
      expect(logger.log).toHaveBeenCalledWith('GREEN:✔ No suspicious files detected.');
    });

    test('should print details of suspicious files when found', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });
      const configRelativePath = path.join('config', 'secrets.txt');
      const suspiciousFiles: SuspiciousFileResult[] = [
        {
          filePath: path.join('/root', configRelativePath),
          messages: ['Contains API key', 'Contains password'],
          type: 'file',
        },
      ];

      reportSecurityCheck('/root', suspiciousFiles, [], [], config);

      expect(logger.log).toHaveBeenCalledWith('YELLOW:1 suspicious file(s) detected and excluded from the output:');
      expect(logger.log).toHaveBeenCalledWith(`1. ${configRelativePath}`);
      expect(logger.log).toHaveBeenCalledWith('DIM:   - 2 security issues detected');
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Please review these files for potential sensitive information.'),
      );
    });

    test('should print details of single security issue correctly', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });
      const suspiciousFiles: SuspiciousFileResult[] = [
        {
          filePath: path.join('/root', 'secret.txt'),
          messages: ['Contains API key'],
          type: 'file',
        },
      ];

      reportSecurityCheck('/root', suspiciousFiles, [], [], config);

      expect(logger.log).toHaveBeenCalledWith('DIM:   - 1 security issue detected');
    });

    test('should print details of suspicious git diffs when found', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });
      const suspiciousGitDiffResults: SuspiciousFileResult[] = [
        {
          filePath: 'work_tree',
          messages: ['Contains API key'],
          type: 'gitDiff',
        },
      ];

      reportSecurityCheck('/root', [], suspiciousGitDiffResults, [], config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 security issue(s) found in Git diffs:'));
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Note: Git diffs with security issues are still included'),
      );
    });

    test('should print details of suspicious git logs when found', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });
      const suspiciousGitLogResults: SuspiciousFileResult[] = [
        {
          filePath: 'commit_log',
          messages: ['Contains password', 'Contains secret'],
          type: 'gitLog',
        },
      ];

      reportSecurityCheck('/root', [], [], suspiciousGitLogResults, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 security issue(s) found in Git logs:'));
      expect(logger.log).toHaveBeenCalledWith('DIM:   - 2 security issues detected');
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Note: Git logs with security issues are still included'),
      );
    });
  });

  describe('reportTopFiles', () => {
    test('should print top files sorted by character count', () => {
      const fileCharCounts = {
        'src/index.ts': 1000,
        'src/utils.ts': 500,
        'README.md': 2000,
      };
      const fileTokenCounts = {
        'src/index.ts': 200,
        'src/utils.ts': 100,
        'README.md': 400,
      };

      reportTopFiles(fileCharCounts, fileTokenCounts, 2, 60);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Top 2 Files'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('README.md'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('src/index.ts'));
      expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('src/utils.ts'));
    });

    test('should handle empty file list', () => {
      reportTopFiles({}, {}, 5, 0);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Top 5 Files'));
    });
  });

  describe('reportCompletion', () => {
    test('should print completion message with output path', () => {
      reportCompletion('/home/user/project/repomix-output.xml');

      expect(logger.log).toHaveBeenCalledWith('GREEN:🎉 All Done!');
      expect(logger.log).toHaveBeenCalledWith('Your repository has been successfully packed.');
      expect(logger.log).toHaveBeenCalledWith('📁 Output generated at:');
      expect(logger.log).toHaveBeenCalledWith(
        '   BOLD:CYAN:UNDERLINE:/home/user/project/repomix-output.xml',
      );
    });
  });

  describe('resolveOutputPath', () => {
    const cwd = '/project';

    const basePackResult: PackResult = {
      totalFiles: 0,
      totalCharacters: 0,
      totalTokens: 0,
      fileCharCounts: {},
      fileTokenCounts: {},
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
      suspiciousGitLogResults: [],
      processedFiles: [],
      safeFilePaths: [],
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
      skippedFiles: [],
    };

    test('should return skillDir path when in skill-generate mode', () => {
      const config = createMockConfig({ skillGenerate: 'my-skill' });
      const packResult: PackResult = {
        ...basePackResult,
        outputFiles: ['repomix-output.xml'],
      };

      const result = resolveOutputPath(cwd, packResult, config, { skillDir: '/project/skills' });

      expect(result).toBe(path.resolve(cwd, '/project/skills'));
    });

    test('should return first outputFile path when outputFiles is present', () => {
      const config = createMockConfig({ output: { filePath: 'fallback.xml' } });
      const packResult: PackResult = {
        ...basePackResult,
        outputFiles: ['repomix-output-1.xml', 'repomix-output-2.xml'],
      };

      const result = resolveOutputPath(cwd, packResult, config, {});

      expect(result).toBe(path.resolve(cwd, 'repomix-output-1.xml'));
    });

    test('should fall back to config.output.filePath when no outputFiles', () => {
      const config = createMockConfig({ output: { filePath: 'repomix-output.xml' } });
      const packResult: PackResult = { ...basePackResult };

      const result = resolveOutputPath(cwd, packResult, config, {});

      expect(result).toBe(path.resolve(cwd, 'repomix-output.xml'));
    });

    test('should prefer outputFiles over config.output.filePath when no skill mode', () => {
      const config = createMockConfig({ output: { filePath: 'should-not-be-used.xml' } });
      const packResult: PackResult = {
        ...basePackResult,
        outputFiles: ['actual-output.xml'],
      };

      const result = resolveOutputPath(cwd, packResult, config, {});

      expect(result).toBe(path.resolve(cwd, 'actual-output.xml'));
      expect(result).not.toContain('should-not-be-used');
    });
  });
});
