import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getFileChangeCount } from '../../../src/core/git/getFileChangeCount.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('getFileChangeCount', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should count file changes correctly', async () => {
    const mockOutput = `
file1.ts
file2.ts
file1.ts
file3.ts
file2.ts
`.trim();
    const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

    const result = await getFileChangeCount('/test/dir', 5, { execFileAsync: mockFileExecAsync });

    expect(result).toEqual({
      'file1.ts': 2,
      'file2.ts': 2,
      'file3.ts': 1,
    });
    expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
      '-C',
      '/test/dir',
      'log',
      '--pretty=format:',
      '--name-only',
      '-n',
      '5',
    ]);
  });

  test('should return empty object when git command fails', async () => {
    const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

    const result = await getFileChangeCount('/test/dir', 5, { execFileAsync: mockFileExecAsync });

    expect(result).toEqual({});
    expect(logger.trace).toHaveBeenCalledWith('Failed to get file change counts:', 'git command failed');
  });
});
