import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { FileWithTokens } from '../../../src/core/tokenCount/buildTokenCountStructure.js';
import { displayTokenCountTree } from '../../../src/core/tokenCount/displayTokenCountTree.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger.js');

describe('displayTokenCountTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should display simple file tree with token counts', () => {
    const files: FileWithTokens[] = [{ path: 'tests/test.txt', tokens: 3 }];

    displayTokenCountTree(files);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');
    expect(logger.log).toHaveBeenCalledWith('└── tests/ (3 tokens)');
    expect(logger.log).toHaveBeenCalledWith('    └── test.txt (3 tokens)');
  });

  test('should display complex nested structure with summed token counts', () => {
    const files: FileWithTokens[] = [
      { path: 'src/components/Button.js', tokens: 100 },
      { path: 'src/components/Card.js', tokens: 150 },
      { path: 'src/utils/format.js', tokens: 50 },
      { path: 'tests/unit.test.js', tokens: 20 },
      { path: 'README.md', tokens: 10 },
    ];

    displayTokenCountTree(files);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');

    // Should show README.md first (root file)
    expect(logger.log).toHaveBeenCalledWith('├── README.md (10 tokens)');

    // Should show src/ directory with total of all tokens in subdirectories (300 tokens)
    expect(logger.log).toHaveBeenCalledWith('├── src/ (300 tokens)');

    // Should show tests/ directory with its total (20 tokens)
    expect(logger.log).toHaveBeenCalledWith('└── tests/ (20 tokens)');
  });

  test('should handle multiple files in same directory', () => {
    const files: FileWithTokens[] = [
      { path: 'src/file1.js', tokens: 10 },
      { path: 'src/file2.js', tokens: 15 },
    ];

    displayTokenCountTree(files);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');
    expect(logger.log).toHaveBeenCalledWith('└── src/ (25 tokens)');
    expect(logger.log).toHaveBeenCalledWith('    ├── file1.js (10 tokens)');
    expect(logger.log).toHaveBeenCalledWith('    └── file2.js (15 tokens)');
  });

  test('should handle empty file list', () => {
    const files: FileWithTokens[] = [];

    displayTokenCountTree(files);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');
    expect(logger.log).toHaveBeenCalledWith('No files found.');
  });

  test('should sort files and directories alphabetically', () => {
    const files: FileWithTokens[] = [
      { path: 'z-dir/file.js', tokens: 5 },
      { path: 'a-dir/file.js', tokens: 10 },
      { path: 'zebra.txt', tokens: 3 },
      { path: 'apple.txt', tokens: 2 },
    ];

    displayTokenCountTree(files);

    const mockedLogger = vi.mocked(logger);
    const calls = mockedLogger.log.mock.calls.map((call: unknown[]) => call[0] as string);

    // Root files should be sorted alphabetically
    const appleIndex = calls.findIndex((call: string) => call.includes('apple.txt'));
    const zebraIndex = calls.findIndex((call: string) => call.includes('zebra.txt'));
    expect(appleIndex).toBeLessThan(zebraIndex);

    // Directories should be sorted alphabetically
    const aDirIndex = calls.findIndex((call: string) => call.includes('a-dir/'));
    const zDirIndex = calls.findIndex((call: string) => call.includes('z-dir/'));
    expect(aDirIndex).toBeLessThan(zDirIndex);
  });

  test('should filter files below minimum token count', () => {
    const files: FileWithTokens[] = [
      { path: 'small.txt', tokens: 5 },
      { path: 'medium.txt', tokens: 15 },
      { path: 'large.txt', tokens: 50 },
    ];

    displayTokenCountTree(files, 10);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('Showing entries with 10+ tokens:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');

    // Should show medium.txt and large.txt, but not small.txt
    expect(logger.log).toHaveBeenCalledWith('├── large.txt (50 tokens)');
    expect(logger.log).toHaveBeenCalledWith('└── medium.txt (15 tokens)');

    const mockedLogger = vi.mocked(logger);
    const calls = mockedLogger.log.mock.calls.map((call: unknown[]) => call[0] as string);
    const smallFileCall = calls.find((call: string) => call.includes('small.txt'));
    expect(smallFileCall).toBeUndefined();
  });

  test('should filter directories below minimum token count but show directories with sufficient total tokens', () => {
    const files: FileWithTokens[] = [
      { path: 'small-dir/tiny.txt', tokens: 2 },
      { path: 'large-dir/big1.txt', tokens: 20 },
      { path: 'large-dir/big2.txt', tokens: 30 },
      { path: 'mixed-dir/small.txt', tokens: 3 },
      { path: 'mixed-dir/large.txt', tokens: 25 },
    ];

    displayTokenCountTree(files, 10);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('Showing entries with 10+ tokens:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');

    // Should show large-dir (50 tokens total) and mixed-dir (28 tokens total)
    expect(logger.log).toHaveBeenCalledWith('├── large-dir/ (50 tokens)');
    expect(logger.log).toHaveBeenCalledWith('└── mixed-dir/ (28 tokens)');

    // Should not show small-dir (2 tokens total)
    const mockedLogger = vi.mocked(logger);
    const calls = mockedLogger.log.mock.calls.map((call: unknown[]) => call[0] as string);
    const smallDirCall = calls.find((call: string) => call.includes('small-dir/'));
    expect(smallDirCall).toBeUndefined();

    // Within mixed-dir, should only show large.txt, not small.txt
    expect(logger.log).toHaveBeenCalledWith('    └── large.txt (25 tokens)');
    const smallFileCall = calls.find((call: string) => call.includes('small.txt'));
    expect(smallFileCall).toBeUndefined();
  });

  test('should show message when no files meet minimum token threshold', () => {
    const files: FileWithTokens[] = [
      { path: 'small1.txt', tokens: 2 },
      { path: 'small2.txt', tokens: 3 },
    ];

    displayTokenCountTree(files, 10);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('Showing entries with 10+ tokens:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');
    expect(logger.log).toHaveBeenCalledWith('No files or directories found with 10+ tokens.');
  });

  test('should not show threshold message when minTokenCount is 0', () => {
    const files: FileWithTokens[] = [{ path: 'test.txt', tokens: 5 }];

    displayTokenCountTree(files, 0);

    expect(logger.log).toHaveBeenCalledWith('\n📊 Token Count Summary:');
    expect(logger.log).toHaveBeenCalledWith('────────────────────────');

    const mockedLogger = vi.mocked(logger);
    const calls = mockedLogger.log.mock.calls.map((call: unknown[]) => call[0] as string);
    const thresholdCall = calls.find((call: string) => call.includes('Showing entries with'));
    expect(thresholdCall).toBeUndefined();
  });
});
