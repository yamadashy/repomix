// Parsing and rebasing of ignore-file rules (.gitignore / .ignore / .repomixignore) with git's
// semantics (gitignore(5)). Rebased rules are matched by the `ignore` package against paths
// relative to the matcher's base directory.

// Strip a byte order mark and unescaped trailing spaces, as git does. Only spaces: git keeps a
// trailing tab, so `x<TAB>` names a file ending in a tab. A backslash-escaped trailing space is
// kept, still escaped.
const normalizeIgnoreFileLine = (rawLine: string): string => {
  const line = rawLine.replace(/^\uFEFF/u, '');
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

// Lines end at LF; a CR right before it (or at the end of the file) belongs to a CRLF line end.
export const parseIgnoreFileLines = (content: string): string[] =>
  content
    .split('\n')
    .map((line) => normalizeIgnoreFileLine(line.endsWith('\r') ? line.slice(0, -1) : line))
    .filter((line) => line && !line.startsWith('#'));

// The directory name becomes part of each rebased rule, so gitignore syntax in it (`[`, `*`,
// `?`, `\`, a leading `!` or `#`) is escaped: the rules of `sp[1]/.gitignore` apply inside
// `sp[1]/` only, never to `sp1/`.
const escapeDirectoryForGitignore = (directory: string): string => {
  const escaped = directory.replace(/[\\*?[\]]/g, '\\$&');
  return escaped.startsWith('!') || escaped.startsWith('#') ? `\\${escaped}` : escaped;
};

// Rebase a rule from the ignore file in `base` (posix, relative to the matcher's base directory)
// per gitignore(5): a rule with no slash except a trailing one matches at any depth below the
// file's directory; any other rule is matched against the path relative to that directory, so
// it is anchored there (a single leading slash only marks the anchoring).
//
// The rule text is kept as written, never normalised: git compares it component by component
// with real paths, so a rule containing `.`, `..` or an empty component (`./x`, `sub/../x`,
// `a//b`, `x/..`) matches nothing, and the `ignore` package treats such a rule the same way. A
// rebased rule therefore never reaches outside `base`, which the per-directory matchers rely on.
export const rebaseIgnorePattern = (pattern: string, base: string): string => {
  if (!base) {
    return pattern;
  }
  const escapedBase = escapeDirectoryForGitignore(base);
  const isNegative = pattern.startsWith('!');
  const cleanPattern = isNegative ? pattern.slice(1) : pattern;
  // A lone `!` is no rule at all. Rebased it would become `dir/**/`, re-including every
  // directory below `dir`; kept as it is, the `ignore` package drops it.
  if (!cleanPattern) {
    return pattern;
  }
  const slashIndex = cleanPattern.indexOf('/');
  const hasNonTrailingSlash = slashIndex !== -1 && slashIndex !== cleanPattern.length - 1;
  let result: string;
  if (!hasNonTrailingSlash) {
    result = `${escapedBase}/**/${cleanPattern}`;
  } else if (slashIndex === 0) {
    result = `${escapedBase}${cleanPattern}`;
  } else {
    result = `${escapedBase}/${cleanPattern}`;
  }
  return isNegative ? `!${result}` : result;
};
