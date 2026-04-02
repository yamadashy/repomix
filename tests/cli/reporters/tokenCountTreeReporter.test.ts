import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import { reportTokenCountTree } from '../../../src/cli/reporters/tokenCountTreeReporter.js';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
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
    const fileTokenCounts = {
      'src/file1.js': 5,
      'src/file2.js': 7,
      'tests/test.js': 10,
    };

    const config = {
      output: { tokenCountTree: true },
    } as RepomixConfigMerged;

    reportTokenCountTree(fileTokenCounts, config);

    // Verify token count tree is displayed
    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
    expect(calls.some((call) => call.includes('src/'))).toBe(true);
    expect(calls.some((call) => call.includes('file1.js'))).toBe(true);
    expect(calls.some((call) => call.includes('file2.js'))).toBe(true);
  });

  test('should handle empty file list', () => {
    const fileTokenCounts = {};
    const config = {
      output: { tokenCountTree: true },
    } as RepomixConfigMerged;

    reportTokenCountTree(fileTokenCounts, config);

    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
    expect(calls.some((call) => call.includes('No files found.'))).toBe(true);
  });

  test('should pass minimum token count threshold to display function', () => {
    const fileTokenCounts = {
      'src/file1.js': 5,
      'src/file2.js': 15,
    };

    const config = {
      output: { tokenCountTree: 10 },
    } as RepomixConfigMerged;

    reportTokenCountTree(fileTokenCounts, config);

    // Verify threshold message is displayed
    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('Showing entries with 10+ tokens:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
  });

  test('should include only files with token counts', () => {
    const fileTokenCounts = {
      'src/file1.js': 5,
      'src/file2.js': 7,
      // 'src/file3.js' is not present, so it won't appear in tree
    };

    const config = {
      output: { tokenCountTree: true },
    } as RepomixConfigMerged;

    reportTokenCountTree(fileTokenCounts, config);

    // Verify tree is displayed with only files that have token counts
    const calls = mockLogger.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(calls.some((call) => call.includes('🔢 Token Count Tree:'))).toBe(true);
    expect(calls.some((call) => call.includes('DIM:────────────────────'))).toBe(true);
    expect(calls.some((call) => call.includes('file1.js'))).toBe(true);
    expect(calls.some((call) => call.includes('file2.js'))).toBe(true);
    expect(calls.some((call) => call.includes('file3.js'))).toBe(false); // Not in fileTokenCounts
  });
});
