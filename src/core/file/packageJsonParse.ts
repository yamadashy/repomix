import { createRequire } from 'node:module';
import { logger } from '../../shared/logger.js';

// Use synchronous require() to read package.json at module evaluation time.
// This eliminates the ~12ms cost of importing node:fs/promises, node:path,
// node:url and the ~1.7ms async readFile that were previously on the critical
// startup path (cliRun.ts → packageJsonParse.ts). createRequire handles path
// resolution natively, and JSON is parsed synchronously by Node's module loader.
const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json') as { name: string; version: string };

export const getVersion = async (): Promise<string> => {
  try {
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
