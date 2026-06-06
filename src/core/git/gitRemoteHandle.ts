import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execLsRemote, execLsRemoteHead, validateGitUrl } from './gitCommand.js';

/**
 * Checks if a remote repository exists and is reachable without cloning it.
 * Uses a HEAD-only `git ls-remote` so the probe is cheap even for large repositories.
 * Returns false for unreachable, non-existent, or auth-gated repositories
 * (interactive credential prompts are disabled for remote git commands).
 */
export const checkRemoteRepoExists = async (
  url: string,
  deps = {
    execLsRemoteHead,
  },
): Promise<boolean> => {
  validateGitUrl(url);

  try {
    await deps.execLsRemoteHead(url);
    return true;
  } catch (error) {
    logger.trace(`Remote repository not reachable: ${url}:`, (error as Error).message);
    return false;
  }
};

export const getRemoteRefs = async (
  url: string,
  deps = {
    execLsRemote,
  },
): Promise<string[]> => {
  validateGitUrl(url);

  try {
    const stdout = await deps.execLsRemote(url);

    // Extract ref names from the output
    // Format is: hash\tref_name
    const refs = stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        // Skip the hash part and extract only the ref name
        const parts = line.split('\t');
        if (parts.length < 2) return '';

        // Remove 'refs/heads/' or 'refs/tags/' prefix
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
