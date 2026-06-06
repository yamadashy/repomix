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

// Check the short form of the GitHub URL. e.g. yamadashy/repomix
const VALID_NAME_PATTERN = '[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?';
const validShorthandRegex = new RegExp(`^${VALID_NAME_PATTERN}/${VALID_NAME_PATTERN}$`);

/**
 * Checks if a string matches the GitHub shorthand format (owner/repo).
 * Note: a relative local path like `src/utils` also matches this pattern,
 * so callers must disambiguate against the local filesystem before treating
 * a shorthand match as a remote repository.
 */
export const isValidShorthand = (remoteValue: string): boolean => {
  return validShorthandRegex.test(remoteValue);
};
