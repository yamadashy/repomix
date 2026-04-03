import isBinaryPath from 'is-binary-path';
import { logger } from '../../shared/logger.js';

/**
 * Creates a filter function for tar extraction that skips binary files.
 *
 * Binary files (images, fonts, archives, etc.) are never included in Repomix output,
 * so skipping them during extraction avoids unnecessary disk I/O.
 *
 * @param stripComponents Number of leading path components stripped by tar (e.g., 1 for the top-level dir)
 * @returns A filter function compatible with tar's filter option: (path) => boolean (true = extract, false = skip)
 */
export const createArchiveEntryFilter = (stripComponents: number): ((entryPath: string) => boolean) => {
  return (entryPath: string): boolean => {
    // Strip leading path components to match the extracted file path
    // tar archives from GitHub have a top-level directory like "repo-branch/"
    const parts = entryPath.split('/');
    if (parts.length <= stripComponents) {
      // This is the top-level directory entry itself, always extract
      return true;
    }
    const strippedPath = parts.slice(stripComponents).join('/');

    if (!strippedPath) {
      return true;
    }

    // Check binary extension (fast, no I/O)
    if (isBinaryPath(strippedPath)) {
      logger.trace(`Archive filter: skipping binary file: ${strippedPath}`);
      return false;
    }

    return true;
  };
};
