import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import { reportTokenCountTree } from '../../../src/cli/reporters/tokenCountTreeReporter.js';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');
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

describe('reportTokenCountTree', () => {
  const mockLogger = logger.log as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should use existing token counts and display tree', () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'src/file1.js', content: 'const a = 1;' },
      { path: 'src/file2.js', content: 'function test() {}' },
      { path: 'tests/test.js', content: 'test("example", () => {});' },
    ];

    const fileTokenCounts = {
      'src/file1.js': 5,
      'src/file2.js': 7,
      'tests/test.js': 10,
    };

    const config = {
      output: { tokenCountTree: true },
    } as RepomixConfigMerged;

    reportTokenCountTree(processedFiles, fileTokenCounts, config);

    // Verify token count tree is displayed
    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
    expect(calls.some((call) => call.includes('src/'))).toBe(true);
    expect(calls.some((call) => call.includes('file1.js'))).toBe(true);
    expect(calls.some((call) => call.includes('file2.js'))).toBe(true);
  });

  test('should display directories whose name starts with an underscore', () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'src/__tests__/foo.test.js', content: 'test("example", () => {});' },
      { path: 'src/index.js', content: 'const a = 1;' },
    ];

    const fileTokenCounts = {
      'src/__tests__/foo.test.js': 100,
      'src/index.js': 50,
    };

    const config = {
      output: { tokenCountTree: true },
    } as RepomixConfigMerged;

    reportTokenCountTree(processedFiles, fileTokenCounts, config);

    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    // The __tests__ directory must appear, and src must sum both children (150).
    expect(calls.some((call) => call.includes('__tests__/'))).toBe(true);
    expect(calls.some((call) => call.includes('src/') && call.includes('150'))).toBe(true);
  });

  test('should handle empty file list', () => {
    const processedFiles: ProcessedFile[] = [];
    const fileTokenCounts = {};
    const config = {
      output: { tokenCountTree: true },
    } as RepomixConfigMerged;

    reportTokenCountTree(processedFiles, fileTokenCounts, config);

    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
    expect(calls.some((call) => call.includes('No files found.'))).toBe(true);
  });

  test('should pass minimum token count threshold to display function', () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'src/file1.js', content: 'const a = 1;' },
      { path: 'src/file2.js', content: 'function test() {}' },
    ];

    const fileTokenCounts = {
      'src/file1.js': 5,
      'src/file2.js': 15,
    };

    const config = {
      output: { tokenCountTree: 10 },
    } as RepomixConfigMerged;

    reportTokenCountTree(processedFiles, fileTokenCounts, config);

    // Verify threshold message is displayed
    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('Showing entries with 10+ tokens:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
  });

  test('should skip files without token counts', () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'src/file1.js', content: 'const a = 1;' },
      { path: 'src/file2.js', content: 'function test() {}' },
      { path: 'src/file3.js', content: 'missing tokens' },
    ];

    const fileTokenCounts = {
      'src/file1.js': 5,
      'src/file2.js': 7,
      // 'src/file3.js' is missing
    };

    const config = {
      output: { tokenCountTree: true },
    } as RepomixConfigMerged;

    reportTokenCountTree(processedFiles, fileTokenCounts, config);

    // Verify tree is displayed (files without token counts should be skipped)
    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
    expect(calls.some((call) => call.includes('file1.js'))).toBe(true);
    expect(calls.some((call) => call.includes('file2.js'))).toBe(true);
    expect(calls.some((call) => call.includes('file3.js'))).toBe(false); // Should be skipped
  });
});
