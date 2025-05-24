import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

export const isGitInstalled = async (
  deps = {
    execFileAsync,
  },
) => {
  try {
    const result = await deps.execFileAsync('git', ['--version']);
    return !result.stderr;
  } catch (error) {
    logger.trace('Git is not installed:', (error as Error).message);
    return false;
  }
};
