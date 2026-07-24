import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Raised when a caller-supplied path is not a valid plain-relative path inside
 * the allowed directory. Tools translate this into a user-facing MCP error.
 */
export class PathScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathScopeError';
  }
}

const isInside = (root: string, candidate: string): boolean =>
  candidate === root || candidate.startsWith(root + path.sep);

/**
 * True when `input` is not a plain relative path safely inside a root: an absolute
 * path per the host OS (`path.isAbsolute` covers "/x" on POSIX and "C:\x" / "\x" /
 * UNC on Windows), a "~" or "~/" home ref, or any ".." traversal segment (either
 * separator). A filename that merely starts with "~" (e.g. "~$lock.docx") is
 * allowed — only the home-ref forms are rejected. Shared by resolveWithinRoot and
 * the sandbox pattern guard so both agree on what "escapes the workspace".
 */
export const isEscapingPath = (input: string): boolean =>
  path.isAbsolute(input) ||
  // Windows drive-RELATIVE (e.g. "C:foo", "C:"): a drive letter + colon NOT followed
  // by a separator. path.isAbsolute misses this form, which on Windows resolves against
  // that drive's own cwd (escaping root). Rooted "C:\x"/"C:/x" are already caught by
  // isAbsolute on Windows and are legitimate relative filenames on POSIX, so exclude them.
  /^[a-zA-Z]:(?![/\\])/.test(input) ||
  input === '~' ||
  input.startsWith('~/') ||
  input === '..' ||
  input.split(/[/\\]/).includes('..');

// Narrow realpath type so tests can inject a simple string→string stub. Binding
// to the full overloaded `fs.realpath` signature would make such stubs fail tsc.
type RealpathFn = (path: string) => Promise<string>;

/**
 * Resolve a relative `input` against the allowed `root` and guarantee the result
 * stays inside it. Paths must be relative (e.g. "src/index.ts", "a/b/file.txt");
 * "." (or "") selects the root; a redundant leading "./" (or ".\") is tolerated
 * but not recommended.
 * Rejected: absolute paths ("/x", "C:\x", "\x", UNC), "~" home refs, and any
 * ".." traversal segment (either separator). Symlink escapes are caught via
 * realpath. Returns the resolved absolute path (realpath when the target exists).
 */
export const resolveWithinRoot = async (
  root: string,
  input: string,
  deps: { realpath: RealpathFn } = { realpath: (p) => fs.realpath(p) },
): Promise<string> => {
  const rootResolved = path.resolve(root);

  if (input === '' || input === '.') {
    return rootResolved;
  }

  // Reject anything that escapes the workspace root — absolute/drive/UNC, a "~"
  // home ref, or any ".." segment. A redundant leading "./" or ".\" is allowed.
  if (isEscapingPath(input)) {
    throw new PathScopeError(
      `Path "${input}" must be relative to workspace root — no "/", "~/", "../", drive, or ".." segment. Use e.g. "src/index.ts" or "." for whole workspace.`,
    );
  }

  const candidate = path.resolve(rootResolved, input);

  if (!isInside(rootResolved, candidate)) {
    throw new PathScopeError(`Path "${input}" resolves outside workspace root.`);
  }

  // Resolve symlinks to catch a link inside root that points back out. If a path
  // can't be resolved via realpath (e.g. the target does not exist yet, or the
  // root itself can't be stat'd), fall back to the lexical path — it is already
  // confined lexically above.
  let realRoot: string;
  try {
    realRoot = (await deps.realpath(rootResolved)) as string;
  } catch {
    realRoot = rootResolved;
  }
  let realCandidate: string;
  try {
    realCandidate = (await deps.realpath(candidate)) as string;
  } catch {
    return candidate;
  }
  if (!isInside(realRoot, realCandidate)) {
    throw new PathScopeError(`Path "${input}" resolves outside workspace root.`);
  }
  return realCandidate;
};

/** Convert an absolute path inside `root` to a plain, root-relative path ("src/x.ts"); root itself → ".". */
export const toVirtualPath = (root: string, absPath: string): string => {
  const rootResolved = path.resolve(root);
  const rel = path.relative(rootResolved, path.resolve(absPath));
  if (rel === '') {
    return '.';
  }
  return rel.split(path.sep).join('/');
};
