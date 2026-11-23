import path from 'node:path';

// Parsing and rebasing of ignore-file rules, following globby 16.2.4 (`readIgnoreFileLines` /
// `applyBaseToPattern` in globby/ignore.js), which repomix used to apply .gitignore / .ignore /
// .repomixignore. Producing the same rule text keeps the `ignore` package's decisions the same
// as globby's, apart from the git-conforming fixes noted below.

// Strip unescaped trailing spaces. Only spaces, as git does: globby also stripped a trailing tab
// or other whitespace, which in git is part of the rule.
// A backslash-escaped trailing space is kept, still escaped.
const normalizeIgnoreFileLine = (line: string): string => {
  let spaceStart = line.length;
  while (spaceStart > 0 && line[spaceStart - 1] === ' ') {
    spaceStart--;
  }
  if (spaceStart === line.length) {
    return line;
  }
  let backslashCount = 0;
  for (let index = spaceStart - 1; index >= 0 && line[index] === '\\'; index--) {
    backslashCount++;
  }
  return backslashCount % 2 === 1 ? `${line.slice(0, spaceStart)} ` : line.slice(0, spaceStart);
};

// A byte order mark is stripped from the start of the file only, as git does (globby stripped one
// from every line). Lines end at LF; one CR before it (or at the end of the file) belongs to the
// line ending.
export const parseIgnoreFileLines = (content: string): string[] =>
  content
    .replace(/^\uFEFF/u, '')
    .split('\n')
    .map((line) => normalizeIgnoreFileLine(line.endsWith('\r') ? line.slice(0, -1) : line))
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

// Whether a rule can never match in git: git compares rules with paths as they are, and a path
// never has a `.`, `..` or empty segment. `path.posix.join` (globby's rebasing) would normalise such
// a rule into one that does match (`x/..` into the directory itself, `../x` into a parent's rule,
// `./y` into `y`), so such rules are dropped instead of rebased.
const neverMatches = (cleanPattern: string): boolean => {
  const segments = cleanPattern.replace(/^\//, '').replace(/\/$/, '').split('/');
  return segments.some((segment) => segment === '' || segment === '.' || segment === '..');
};

// Rebase a rule from the ignore file in `base` (posix, relative to the matcher's base directory)
// per the gitignore spec: a rule without a slash before its end matches at any depth below the
// file's directory, any other rule is anchored to it. Returns undefined for a rule that matches
// nothing. Every rebased rule starts with `base/` and stays below that directory, which the
// per-directory matchers of ignoreFileFilter.ts rely on.
export const rebaseIgnorePattern = (pattern: string, base: string): string | undefined => {
  if (!base) {
    return pattern;
  }
  const escapedBase = escapeDirectoryForGitignore(base);
  const isNegative = pattern.startsWith('!');
  const cleanPattern = isNegative ? pattern.slice(1) : pattern;
  // A lone `!` is no rule at all. Rebased it would become `!base/**`, re-including everything
  // below the directory; kept as it is, the `ignore` package drops it, as git does.
  if (!cleanPattern) {
    return pattern;
  }
  if (neverMatches(cleanPattern)) {
    return undefined;
  }
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
  return isNegative ? `!${result}` : result;
};
