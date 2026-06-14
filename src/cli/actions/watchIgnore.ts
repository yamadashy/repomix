import path from 'node:path';
import { isGitIgnored, isIgnoredByIgnoreFiles } from 'globby';
import { Minimatch } from 'minimatch';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { getIgnoreFilePatterns, getIgnorePatterns } from '../../core/file/fileSearch.js';

/**
 * Builds a chokidar `ignored` predicate that mirrors the packer's ignore rules,
 * so watch mode skips exactly what the packer skips.
 *
 * chokidar v4+ dropped glob support in `ignored` (it accepts only literal
 * strings, RegExps, or functions), so the packer's glob patterns must be
 * evaluated through minimatch instead. The predicate also matches the ignored
 * directory itself (e.g. `node_modules`, `.git`), not just its descendants, so
 * chokidar never descends into huge or gitignored trees and exhausts file
 * descriptors (EMFILE). Rules are resolved per watched root, reusing the same
 * ignore resolution (default patterns, custom patterns, .git/info/exclude,
 * .gitignore, and .ignore/.repomixignore files) the packer uses.
 */
export const buildWatchIgnoreFilter = async (
  targetPaths: string[],
  config: RepomixConfigMerged,
): Promise<(watchedPath: string) => boolean> => {
  const rootFilters = await Promise.all(
    targetPaths.map(async (root) => {
      // Default + custom + output + .git/info/exclude patterns (relative to this root).
      const patterns = await getIgnorePatterns(root, config);
      const fileMatchers = patterns.map((pattern) => new Minimatch(pattern, { dot: true }));
      // Directory form of every `foo/**` pattern, so the directory itself matches and
      // chokidar stops before descending into it (the part that actually prevents EMFILE).
      const dirMatchers = patterns
        .filter((pattern) => pattern.endsWith('/**'))
        .map((pattern) => new Minimatch(pattern.slice(0, -3), { dot: true }));

      // .gitignore and .ignore/.repomixignore are read by globby; reuse the same matchers
      // so gitignored directories (build caches, etc.) are skipped too.
      const ignoreFilePatterns = await getIgnoreFilePatterns(config);
      const gitIgnored = config.ignore.useGitignore ? await isGitIgnored({ cwd: root }) : null;
      const ignoreFileIgnored =
        ignoreFilePatterns.length > 0 ? await isIgnoredByIgnoreFiles(ignoreFilePatterns, { cwd: root }) : null;

      return { root, fileMatchers, dirMatchers, gitIgnored, ignoreFileIgnored };
    }),
  );

  return (watchedPath: string): boolean => {
    for (const { root, fileMatchers, dirMatchers, gitIgnored, ignoreFileIgnored } of rootFilters) {
      const relative = path.relative(root, watchedPath);
      if (relative === '' || relative.startsWith('..')) {
        continue; // not under this root
      }
      const normalized = relative.split(path.sep).join('/');
      for (const matcher of fileMatchers) {
        if (matcher.match(normalized)) {
          return true;
        }
      }
      for (const matcher of dirMatchers) {
        if (matcher.match(normalized)) {
          return true;
        }
      }
      // Query with a trailing slash too: a `dir/` ignore rule matches the directory
      // only when treated as a directory, and that is what prunes chokidar's descent
      // (without it, chokidar walks into the dir and opens fds before ignoring files -> EMFILE).
      if (gitIgnored && (gitIgnored(normalized) || gitIgnored(`${normalized}/`))) {
        return true;
      }
      if (ignoreFileIgnored && (ignoreFileIgnored(normalized) || ignoreFileIgnored(`${normalized}/`))) {
        return true;
      }
      return false; // path belongs to this root but matched no ignore rule
    }

    return false;
  };
};
