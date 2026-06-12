/**
 * Gitignore pattern parsing and matching, replicating globby v16's internal
 * `ignore.js` semantics exactly (`applyBaseToPattern`, `parseIgnoreFile`,
 * `createIgnoreMatcher`, `toRelativePath`, `convertPatternsForFastGlob`).
 *
 * Repomix builds its own ignore-file predicate instead of using globby's
 * `gitignore: true` machinery so that matched paths can be filtered with a
 * synchronous `Array.filter` rather than globby's one-Promise-per-path async
 * filter (see `buildIgnoreFileFilter` in gitignoreFilter.ts). Behavioral
 * equivalence with globby is the invariant: any change here must keep output
 * byte-identical with the `gitignore: true` path it replaces.
 */

import nodePath from 'node:path';
import ignore from 'ignore';

export interface IgnoreFileRecord {
  filePath: string;
  content: string;
}

export type IgnoreTestResult = { ignored: boolean; unignored: boolean };
export type IgnoreMatcher = (fileOrDirectory: string) => IgnoreTestResult;

const NOT_IGNORED: IgnoreTestResult = { ignored: false, unignored: false };

/** Convert backslashes to forward slashes (replaces globby's `slash` dependency). */
const toSlash = (value: string): string => value.replace(/\\/g, '/');

const isNegativePattern = (pattern: string): boolean => pattern[0] === '!';

/**
 * Returns true if `child` is strictly inside `parent` (not equal to it).
 * Replaces globby's `is-path-inside` dependency.
 */
const isInsidePath = (child: string, parent: string): boolean => {
  const relativePath = nodePath.relative(parent, child);
  return Boolean(relativePath) && !relativePath.startsWith('..') && !nodePath.isAbsolute(relativePath);
};

/**
 * Anchor a raw ignore-file pattern to its file's location, per gitignore spec
 * §2.22.1 (https://git-scm.com/docs/gitignore#_pattern_format).
 *
 * @param pattern Raw pattern line from an ignore file (comments already stripped).
 * @param base    POSIX-style path from the matcher's base directory to the ignore
 *                file's directory. Empty string when the file sits at the base.
 */
export const applyBaseToPattern = (pattern: string, base: string): string => {
  if (!base) {
    return pattern;
  }

  const isNegative = isNegativePattern(pattern);
  const cleanPattern = isNegative ? pattern.slice(1) : pattern;

  const slashIndex = cleanPattern.indexOf('/');
  const hasNonTrailingSlash = slashIndex !== -1 && slashIndex !== cleanPattern.length - 1;

  let result: string;
  if (!hasNonTrailingSlash) {
    // No separator at the beginning or middle (e.g. `*.log`, `temp`, `build/`):
    // the pattern matches at any level below the ignore file's directory.
    result = nodePath.posix.join(base, '**', cleanPattern);
  } else if (cleanPattern.startsWith('/')) {
    // Leading slash anchors the pattern to the ignore file's directory.
    result = nodePath.posix.join(base, cleanPattern.slice(1));
  } else {
    // Separator in the middle: relative to the ignore file's directory.
    result = nodePath.posix.join(base, cleanPattern);
  }

  return isNegative ? `!${result}` : result;
};

/** Parse an ignore file's content into patterns anchored relative to `baseDir`. */
export const parseIgnoreFile = (file: IgnoreFileRecord, baseDir: string): string[] => {
  const base = toSlash(nodePath.relative(baseDir, nodePath.dirname(file.filePath)));
  return file.content
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((pattern) => applyBaseToPattern(pattern, base));
};

/**
 * Converts a path to the form the `ignore` package expects: relative to `cwd`,
 * with paths outside `cwd` (which cannot be ignored by its patterns) mapped to
 * `undefined`. `./foo` is normalized to `foo`, matching Git's treatment.
 */
const toRelativePath = (fileOrDirectory: string, cwd: string): string | undefined => {
  if (nodePath.isAbsolute(fileOrDirectory)) {
    const relativePath = nodePath.relative(cwd, fileOrDirectory);
    if (relativePath && !isInsidePath(fileOrDirectory, cwd)) {
      return undefined;
    }
    return relativePath;
  }

  if (fileOrDirectory.startsWith('./')) {
    return fileOrDirectory.slice(2);
  }

  if (fileOrDirectory.startsWith('../')) {
    return undefined;
  }

  return fileOrDirectory;
};

/**
 * Build a matcher over anchored patterns. A trailing separator on the input
 * path is preserved so directory-only rules (`dir/`) are honored; callers test
 * directories both with and without the separator, as globby's filter does.
 *
 * @param patterns Anchored patterns (output of `parseIgnoreFile`).
 * @param cwd      Scan root; the cwd itself is never reported as ignored.
 * @param baseDir  Directory the patterns are anchored to (git root or cwd).
 */
export const createIgnoreMatcher = (patterns: string[], cwd: string, baseDir: string): IgnoreMatcher => {
  const matcher = ignore().add(patterns);
  const resolvedCwd = nodePath.normalize(nodePath.resolve(cwd));
  const resolvedBaseDir = nodePath.normalize(nodePath.resolve(baseDir));

  return (fileOrDirectory: string): IgnoreTestResult => {
    const hasTrailingSeparator = /[/\\]$/.test(fileOrDirectory);

    const normalizedPath = nodePath.normalize(nodePath.resolve(fileOrDirectory));
    if (normalizedPath === resolvedCwd) {
      return NOT_IGNORED;
    }

    let relativePath = toRelativePath(fileOrDirectory, resolvedBaseDir);
    if (relativePath === undefined || relativePath === '') {
      return NOT_IGNORED;
    }

    if (hasTrailingSeparator && !relativePath.endsWith(nodePath.sep)) {
      relativePath += nodePath.sep;
    }

    return matcher.test(toSlash(relativePath));
  };
};

/**
 * Normalize a trailing-slash directory pattern into a fast-glob ignore entry:
 * `build/` becomes `**\/build/**` (recursive prefix added only for bare names).
 * Replicates globby's `normalizeDirectoryPatternForFastGlob`.
 */
const normalizeDirectoryPatternForFastGlob = (pattern: string): string => {
  if (!pattern.endsWith('/')) {
    return pattern;
  }

  const trimmedPattern = pattern.replace(/\/+$/u, '');
  if (!trimmedPattern) {
    return '/**';
  }

  // Special case for '**/' to avoid producing '**/**/**'
  if (trimmedPattern === '**') {
    return '**/**';
  }

  const hasLeadingSlash = trimmedPattern.startsWith('/');
  const patternBody = hasLeadingSlash ? trimmedPattern.slice(1) : trimmedPattern;
  const hasInnerSlash = patternBody.includes('/');
  const needsRecursivePrefix = !hasLeadingSlash && !hasInnerSlash && !trimmedPattern.startsWith('**/');

  return `${needsRecursivePrefix ? '**/' : ''}${trimmedPattern}/**`;
};

/**
 * Returns the subset of anchored ignore-file patterns that can be injected into
 * fast-glob's `ignore` option so ignored directories are pruned during traversal.
 *
 * Returns an empty array when any negation pattern is present (fast-glob cannot
 * re-include negated paths, so the predicate must see everything) or when the
 * patterns are anchored to a git root above `cwd` (they would not be
 * cwd-relative). Replicates globby's `convertPatternsForFastGlob`.
 */
export const convertPatternsForFastGlob = (patterns: string[], usingGitRoot: boolean): string[] => {
  if (usingGitRoot) {
    return [];
  }

  const result: string[] = [];
  for (const pattern of patterns) {
    if (isNegativePattern(pattern)) {
      return [];
    }
    result.push(normalizeDirectoryPatternForFastGlob(pattern));
  }

  return result;
};
