/**
 * Lightweight remote URL detection utilities.
 *
 * Separated from gitRemoteParse.ts so callers can check URL prefixes
 * without pulling in the heavy `git-url-parse` dependency.
 */

export const remoteUrlPrefixes = ['https://', 'git@', 'ssh://', 'git://'] as const;

/**
 * Checks if a string is an explicit remote URL (e.g., https://, git@, ssh://, git://).
 * This intentionally does NOT match shorthand (owner/repo) to avoid ambiguity with local directory paths.
 */
export const isExplicitRemoteUrl = (value: string): boolean => {
  return remoteUrlPrefixes.some((prefix) => value.startsWith(prefix));
};
