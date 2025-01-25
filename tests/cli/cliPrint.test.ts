import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { printCompletion, printSecurityCheck, printSummary, printTopFiles } from '../../src/cli/cliPrint.js';
import type { SuspiciousFileResult } from '../../src/core/security/securityCheck.js';
import { logger } from '../../src/shared/logger.js';
import { createMockConfig } from '../testing/testUtils.js';

vi.mock('../../src/shared/logger');
vi.mock('picocolors', () => ({
  default: {
    white: (str: string) => `WHITE:${str}`,
    dim: (str: string) => `DIM:${str}`,
    green: (str: string) => `GREEN:${str}`,
    yellow: (str: string) => `YELLOW:${str}`,
    red: (str: string) => `RED:${str}`,
    cyan: (str: string) => `CYAN:${str}`,
    underline: (str: string) => `UNDERLINE:${str}`,
  },
}));

describe('cliPrint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('printSummary', () => {
    test('should print summary with suspicious files and security check enabled', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });
      const suspiciousFiles: SuspiciousFileResult[] = [
        { filePath: 'suspicious.txt', messages: ['Contains sensitive data'] },
      ];

      printSummary(10, 1000, 200, 'output.txt', suspiciousFiles, config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 suspicious file(s) detected and excluded'));
    });

    test('should print summary with security check disabled', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: false },
      });

      printSummary(10, 1000, 200, 'output.txt', [], config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Security check disabled'));
    });
  });

  describe('printSecurityCheck', () => {
    test('should skip printing when security check is disabled', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: false },
      });

      printSecurityCheck('/root', [], config);
      expect(logger.log).not.toHaveBeenCalled();
    });

    test('should print message when no suspicious files found', () => {
      const config = createMockConfig({
        security: { enableSecurityCheck: true },
      });

      printSecurityCheck('/root', [], config);

      expect(logger.log).toHaveBeenCalledWith('WHITE:🔎 Security Check:');
      expect(logger.log).toHaveBeenCalledWith('DIM:──────────────────');
      expect(logger.log).toHaveBeenCalledWith('GREEN:✔ WHITE:No suspicious files detected.');
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
        },
      ];

      printSecurityCheck('/root', suspiciousFiles, config);

      expect(logger.log).toHaveBeenCalledWith('YELLOW:1 suspicious file(s) detected and excluded from the output:');
      expect(logger.log).toHaveBeenCalledWith(`WHITE:1. WHITE:${configRelativePath}`);
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Contains API key'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Contains password'));
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Please review these files for potential sensitive information.'),
      );
    });
  });

  describe('printTopFiles', () => {
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

      printTopFiles(fileCharCounts, fileTokenCounts, 2);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Top 2 Files'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('README.md'));
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('src/index.ts'));
      expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('src/utils.ts'));
    });

    test('should handle empty file list', () => {
      printTopFiles({}, {}, 5);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Top 5 Files'));
    });
  });

  describe('printCompletion', () => {
    test('should print completion message', () => {
      printCompletion();

      expect(logger.log).toHaveBeenCalledWith('GREEN:🎉 All Done!');
      expect(logger.log).toHaveBeenCalledWith('WHITE:Your repository has been successfully packed.');
    });
  });
});
