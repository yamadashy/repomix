import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { validateGitUrl } from './gitHandle.js';

const execFileAsync = promisify(execFile);

export const getRemoteRefs = async (
  url: string,
  deps = {
    execFileAsync,
  },
): Promise<string[]> => {
  validateGitUrl(url);

  try {
    const result = await deps.execFileAsync('git', ['ls-remote', '--heads', '--tags', url]);

    const refs = result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('\t');
        if (parts.length < 2) return '';

        return parts[1].replace(/^refs\/(heads|tags)\//, '');
      })
      .filter(Boolean);

    logger.trace(`Found ${refs.length} refs in repository: ${url}`);
    return refs;
  } catch (error) {
    logger.trace('Failed to get remote refs:', (error as Error).message);
    throw new RepomixError(`Failed to get remote refs: ${(error as Error).message}`);
  }
};
