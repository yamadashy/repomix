import isBinaryPath from 'is-binary-path';
import { minimatch } from 'minimatch';
import { defaultIgnoreList } from '../../config/defaultIgnore.js';
import { logger } from '../../shared/logger.js';

/**
 * Creates a filter function for tar extraction that skips files matching
 * default ignore patterns or binary extensions.
 *
 * This runs during archive extraction, so only patterns that don't depend on
 * repo-internal config files (.gitignore, .repomixignore) can be applied.
 *
 * @param stripComponents Number of leading path components stripped by tar (e.g., 1 for the top-level dir)
 * @param customIgnorePatterns Additional ignore patterns from CLI options
 * @returns A filter function compatible with tar's filter option: (path) => boolean (true = extract, false = skip)
 */
export const createArchiveEntryFilter = (
  stripComponents: number,
  customIgnorePatterns: string[] = [],
): ((entryPath: string) => boolean) => {
  // Use raw patterns without normalizeGlobPattern, which is designed for globby
  // and would incorrectly append /** to file patterns like **/*.log
  const allPatterns = [...defaultIgnoreList, ...customIgnorePatterns];

  // Pre-compile minimatch instances for performance
  const matchers = allPatterns.map(
    (pattern) =>
      new minimatch.Minimatch(pattern, {
        dot: true,
        matchBase: false,
      }),
  );

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
      logger.trace(`Archive filter: skipping binary extension: ${strippedPath}`);
      return false;
    }

    // Check against ignore patterns
    for (const matcher of matchers) {
      if (matcher.match(strippedPath)) {
        logger.trace(`Archive filter: skipping ignored path: ${strippedPath}`);
        return false;
      }
    }

    return true;
  };
};
