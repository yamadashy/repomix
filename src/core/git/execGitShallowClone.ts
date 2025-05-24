import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { validateGitUrl } from './gitHandle.js';

const execFileAsync = promisify(execFile);

export const execGitShallowClone = async (
  url: string,
  directory: string,
  remoteBranch?: string,
  deps = {
    execFileAsync,
  },
) => {
  validateGitUrl(url);

  if (remoteBranch) {
    await deps.execFileAsync('git', ['-C', directory, 'init']);
    await deps.execFileAsync('git', ['-C', directory, 'remote', 'add', 'origin', url]);
    try {
      await deps.execFileAsync('git', ['-C', directory, 'fetch', '--depth', '1', 'origin', remoteBranch]);
      await deps.execFileAsync('git', ['-C', directory, 'checkout', 'FETCH_HEAD']);
    } catch (err: unknown) {
      const isRefNotfoundError =
        err instanceof Error && err.message.includes(`couldn't find remote ref ${remoteBranch}`);

      if (!isRefNotfoundError) {
        throw err;
      }

      const isNotShortSHA = !remoteBranch.match(/^[0-9a-f]{4,39}$/i);

      if (isNotShortSHA) {
        throw err;
      }

      await deps.execFileAsync('git', ['-C', directory, 'fetch', 'origin']);
      await deps.execFileAsync('git', ['-C', directory, 'checkout', remoteBranch]);
    }
  } else {
    await deps.execFileAsync('git', ['clone', '--depth', '1', url, directory]);
  }

  await fs.rm(path.join(directory, '.git'), { recursive: true, force: true });
};
