import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getWorkTreeDiff } from '../../../src/core/git/getWorkTreeDiff.js';

describe('getWorkTreeDiff', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should call getDiff with empty options array', async () => {
    const mockGetDiff = vi.fn().mockResolvedValue('mock diff content');
    const directory = '/test/dir';

    const result = await getWorkTreeDiff(directory, { getDiff: mockGetDiff });

    expect(result).toBe('mock diff content');
    expect(mockGetDiff).toHaveBeenCalledWith(directory, []);
  });
});
