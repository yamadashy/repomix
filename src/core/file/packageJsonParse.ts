import * as fs from 'node:fs/promises';
import path from 'node:path';
import * as url from 'node:url';
import { logger } from '../../shared/logger.js';

interface PackageJsonParseDeps {
  readFile: (filePath: string, encoding: 'utf-8') => Promise<string>;
  fileURLToPath: (url: URL) => string;
}

export const getVersion = async (
  deps: PackageJsonParseDeps = {
    readFile: fs.readFile,
    fileURLToPath: url.fileURLToPath,
  },
): Promise<string> => {
  try {
    const packageJson = await parsePackageJson(deps);

    if (!packageJson.version) {
      logger.warn('No version found in package.json');
      return 'unknown';
    }

    return packageJson.version;
  } catch (error) {
    logger.error('Error reading package.json:', error);
    return 'unknown';
  }
};

const parsePackageJson = async (
  deps: PackageJsonParseDeps,
): Promise<{
  name: string;
  version: string;
}> => {
  const dirName = deps.fileURLToPath(new URL('.', import.meta.url));
  const packageJsonPath = path.join(dirName, '..', '..', '..', 'package.json');
  const packageJsonFile = await deps.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonFile);
  return packageJson;
};
