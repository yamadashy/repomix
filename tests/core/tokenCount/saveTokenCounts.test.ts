import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { displayTokenCountTree } from '../../../src/core/tokenCount/displayTokenCountTree.js';
import { summarizeTokenCounts } from '../../../src/core/tokenCount/saveTokenCounts.js';

vi.mock('../../../src/core/metrics/TokenCounter.js');
vi.mock('../../../src/core/tokenCount/displayTokenCountTree.js');

describe('summarizeTokenCounts', () => {
  const mockTokenCounter = {
    countTokens: vi.fn(),
    free: vi.fn(),
  };
  const mockDisplayTokenCountTree = displayTokenCountTree as Mock;
  const mockProgressCallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (TokenCounter as unknown as Mock).mockImplementation(() => mockTokenCounter);
  });

  test('should calculate tokens for all files and display tree', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'src/file1.js', content: 'const a = 1;' },
      { path: 'src/file2.js', content: 'function test() {}' },
      { path: 'tests/test.js', content: 'test("example", () => {});' },
    ];

    mockTokenCounter.countTokens.mockReturnValueOnce(5).mockReturnValueOnce(7).mockReturnValueOnce(10);

    await summarizeTokenCounts(processedFiles, 'o200k_base', mockProgressCallback);

    // Verify token counting was called for each file
    expect(mockTokenCounter.countTokens).toHaveBeenCalledTimes(3);
    expect(mockTokenCounter.countTokens).toHaveBeenCalledWith('const a = 1;', 'src/file1.js');
    expect(mockTokenCounter.countTokens).toHaveBeenCalledWith('function test() {}', 'src/file2.js');
    expect(mockTokenCounter.countTokens).toHaveBeenCalledWith('test("example", () => {});', 'tests/test.js');

    // Verify display function was called with default threshold of 0
    expect(mockDisplayTokenCountTree).toHaveBeenCalledWith(
      [
        { path: 'src/file1.js', tokens: 5 },
        { path: 'src/file2.js', tokens: 7 },
        { path: 'tests/test.js', tokens: 10 },
      ],
      0,
    );

    // Verify progress callbacks
    expect(mockProgressCallback).toHaveBeenCalledWith('Calculating token counts for all files...');

    // Verify cleanup
    expect(mockTokenCounter.free).toHaveBeenCalled();
  });

  test('should free token counter even if error occurs', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'file.js', content: 'content' }];

    mockTokenCounter.countTokens.mockImplementation(() => {
      throw new Error('Token counting failed');
    });

    await expect(summarizeTokenCounts(processedFiles, 'o200k_base', mockProgressCallback)).rejects.toThrow(
      'Token counting failed',
    );

    // Verify cleanup was still called
    expect(mockTokenCounter.free).toHaveBeenCalled();
  });

  test('should handle empty file list', async () => {
    const processedFiles: ProcessedFile[] = [];

    await summarizeTokenCounts(processedFiles, 'cl100k_base', mockProgressCallback);

    expect(mockTokenCounter.countTokens).not.toHaveBeenCalled();
    expect(mockDisplayTokenCountTree).toHaveBeenCalledWith([], 0);
  });

  test('should pass minimum token count threshold to display function', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'src/file1.js', content: 'const a = 1;' },
      { path: 'src/file2.js', content: 'function test() {}' },
    ];

    mockTokenCounter.countTokens.mockReturnValueOnce(5).mockReturnValueOnce(15);

    await summarizeTokenCounts(processedFiles, 'o200k_base', mockProgressCallback, 10);

    // Verify display function was called with the specified threshold
    expect(mockDisplayTokenCountTree).toHaveBeenCalledWith(
      [
        { path: 'src/file1.js', tokens: 5 },
        { path: 'src/file2.js', tokens: 15 },
      ],
      10,
    );

    expect(mockTokenCounter.free).toHaveBeenCalled();
  });
});
