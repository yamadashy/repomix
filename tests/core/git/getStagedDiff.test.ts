import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStagedDiff } from '../../../src/core/git/getStagedDiff.js';

describe('getStagedDiff', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should call getDiff with --cached option', async () => {
    const mockGetDiff = vi.fn().mockResolvedValue('mock staged diff content');
    const directory = '/test/dir';

    const result = await getStagedDiff(directory, { getDiff: mockGetDiff });

    expect(result).toBe('mock staged diff content');
    expect(mockGetDiff).toHaveBeenCalledWith(directory, ['--cached']);
  });
});
