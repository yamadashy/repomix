import path from 'node:path';

// Parsing and rebasing of ignore-file rules, following globby 16.2.4 (`readIgnoreFileLines` /
// `applyBaseToPattern` in globby/ignore.js), which repomix used to apply .gitignore / .ignore /
// .repomixignore. Producing the same rule text keeps the `ignore` package's decisions the same
// as globby's, apart from the two git-conforming fixes marked below.

// Strip a byte order mark and unescaped trailing whitespace, as git does. A backslash-escaped
// trailing space is kept, still escaped.
const normalizeIgnoreFileLine = (rawLine: string): string => {
  const line = rawLine.replace(/^\uFEFF/u, '');
  let whitespaceStart = line.length;
  while (whitespaceStart > 0 && /\s/u.test(line[whitespaceStart - 1])) {
    whitespaceStart--;
  }
  if (whitespaceStart === line.length) {
    return line;
  }
  let backslashCount = 0;
  for (let index = whitespaceStart - 1; index >= 0 && line[index] === '\\'; index--) {
    backslashCount++;
  }
  return backslashCount % 2 === 1 ? `${line.slice(0, whitespaceStart)} ` : line.slice(0, whitespaceStart);
};

export const parseIgnoreFileLines = (content: string): string[] =>
  content
    .split(/\r?\n/)
    .map((line) => normalizeIgnoreFileLine(line))
    .filter((line) => line && !line.startsWith('#'));

// globby joined the raw directory path in front of each rule, so gitignore syntax in a directory
// name (`[`, `*`, `?`, `\`, a leading `!` or `#`) became part of the pattern. Its traversal
// pruning escaped the directory name, so rules still applied inside such a directory; escaping
// here keeps that, without globby's leak of those rules to other directories (`sp[1]/` rules
// also matching `sp1/`), which git does not do either.
const escapeDirectoryForGitignore = (directory: string): string => {
  const escaped = directory.replace(/[\\*?[\]]/g, '\\$&');
  return escaped.startsWith('!') || escaped.startsWith('#') ? `\\${escaped}` : escaped;
};

// Rebase a rule from the ignore file in `base` (posix, relative to the matcher's base directory)
// per the gitignore spec: a rule without a slash before its end matches at any depth below the
// file's directory, any other rule is anchored to it.
export const rebaseIgnorePattern = (pattern: string, base: string): string => {
  if (!base) {
    return pattern;
  }
  const escapedBase = escapeDirectoryForGitignore(base);
  const isNegative = pattern.startsWith('!');
  const cleanPattern = isNegative ? pattern.slice(1) : pattern;
  const slashIndex = cleanPattern.indexOf('/');
  const hasNonTrailingSlash = slashIndex !== -1 && slashIndex !== cleanPattern.length - 1;
  let result: string;
  if (!hasNonTrailingSlash) {
    result = path.posix.join(escapedBase, '**', cleanPattern);
  } else if (cleanPattern.startsWith('/')) {
    result = path.posix.join(escapedBase, cleanPattern.slice(1));
  } else {
    result = path.posix.join(escapedBase, cleanPattern);
  }
  // globby's join let `../x` climb out of the ignore file's directory (`a/.gitignore` with
  // `../x` became the rule `x`). Git never matches `..`, and the per-directory matchers rely on
  // every rule staying below its directory, so such a rule is kept under it, where it matches
  // nothing real.
  if (!result.startsWith(`${escapedBase}/`)) {
    result = `${escapedBase}/${cleanPattern.replace(/^\/+/, '')}`;
  }
  return isNegative ? `!${result}` : result;
};
