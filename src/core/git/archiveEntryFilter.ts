import isBinaryPath from 'is-binary-path';
import { logger } from '../../shared/logger.js';

/**
 * Creates a filter function for tar extraction that skips binary files.
 * The filter is called with the raw tar entry path (before strip is applied),
 * so we manually remove the leading segment (e.g. "repo-branch/") before checking.
 */
export const createArchiveEntryFilter = (deps = { isBinaryPath }) => {
  return (entryPath: string): boolean => {
    // Remove the leading directory segment that tar's strip:1 would remove
    const strippedPath = entryPath.replace(/^[^/]+\//, '');

    if (!strippedPath) {
      // Root directory entry — always allow
      return true;
    }

    if (deps.isBinaryPath(strippedPath)) {
      logger.trace(`Skipping binary file in archive: ${strippedPath}`);
      return false;
    }

    return true;
  };
};
