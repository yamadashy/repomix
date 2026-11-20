import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getVersion } from '../../../src/core/file/packageJsonParse.js';
import { logger } from '../../../src/shared/logger.js';

describe('packageJsonParse', () => {
  const readFile = vi.fn<(filePath: string, encoding: 'utf-8') => Promise<string>>();
  const fileURLToPath = vi.fn<(url: URL) => string>();
  const deps = { readFile, fileURLToPath };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('getVersion should return correct version from package.json', async () => {
    const mockPackageJson = {
      name: 'repomix',
      version: '1.2.3',
    };

    fileURLToPath.mockReturnValue('/mock/path/to/src/core/file');
    readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

    const version = await getVersion(deps);

    expect(version).toBe('1.2.3');
    expect(fileURLToPath).toHaveBeenCalledWith(expect.any(URL));
    expect(readFile).toHaveBeenCalledWith(
      path.join('/mock/path/to/src/core/file', '..', '..', '..', 'package.json'),
      'utf-8',
    );
  });

  test('getVersion should handle missing version in package.json', async () => {
    const mockPackageJson = {
      name: 'repomix',
    };

    const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(vi.fn());

    fileURLToPath.mockReturnValue('/mock/path/to/src/core/file2');
    readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

    const version = await getVersion(deps);

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('No version found in package.json'));

    expect(version).toBe('unknown');
  });
});
