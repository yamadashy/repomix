import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

export const getFileChangeCount = async (
  directory: string,
  maxCommits = 100,
  deps = {
    execFileAsync,
  },
): Promise<Record<string, number>> => {
  try {
    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '--pretty=format:',
      '--name-only',
      '-n',
      maxCommits.toString(),
    ]);

    const fileChangeCounts: Record<string, number> = {};
    const lines = result.stdout.split('\n').filter(Boolean);

    for (const line of lines) {
      fileChangeCounts[line] = (fileChangeCounts[line] || 0) + 1;
    }

    return fileChangeCounts;
  } catch (error) {
    logger.trace('Failed to get file change counts:', (error as Error).message);
    return {};
  }
};
