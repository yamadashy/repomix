import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../../shared/logger.js';

const execAsync = promisify(exec);

export const isGitInstalled = async (
  deps = {
    execAsync,
  },
) => {
  try {
    const result = await deps.execAsync('git --version');
    return !result.stderr;
  } catch (error) {
    logger.trace('Git is not installed:', (error as Error).message);
    return false;
  }
};

export const execGitShallowClone = async (
  url: string,
  directory: string,
  branchOrCommit?: string,
  deps = {
    execAsync,
  },
) => {
  await deps.execAsync(`git clone --depth 1 ${url} ${directory}`);
  if (branchOrCommit) {
    await deps.execAsync(`git -C ${directory} checkout ${branchOrCommit}`);
  }
};
