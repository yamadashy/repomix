import path from 'node:path';

type PathModule = Pick<typeof path, 'relative' | 'isAbsolute' | 'sep'>;

/**
 * Whether `child` is `parent` itself or lies inside it, decided via `path.relative`.
 *
 * Only a real parent traversal (`..` or `../...`) counts as outside, so a child whose
 * name merely starts with `..` (e.g. `..cache`) is still inside. An absolute relative
 * result (a different drive on Windows) also counts as outside. Equal paths count as
 * within; callers that need a strict descendant must check that separately.
 *
 * `pathModule` defaults to the host `path`; pass `path.win32` / `path.posix` to
 * evaluate paths of a specific platform.
 */
export const isPathWithin = (parent: string, child: string, pathModule: PathModule = path): boolean => {
  const relativePath = pathModule.relative(parent, child);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${pathModule.sep}`) && !pathModule.isAbsolute(relativePath))
  );
};

/**
 * Convert every backslash in `filePath` to a forward slash, regardless of the host OS.
 */
export const toPosixPath = (filePath: string): string => filePath.replaceAll('\\', '/');
