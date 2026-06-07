import path from 'node:path';

/**
 * Helpers for building stable, unique per-root display labels and display
 * paths used when packing multiple roots. These keep files with the same
 * relative path (e.g. `README.md` in two roots) distinguishable in the output
 * and avoid key collisions in styles that key files by path (e.g. JSON).
 */

const toDisplayPath = (filePath: string): string => filePath.replaceAll(path.win32.sep, path.posix.sep);

const isCwdRelativePath = (relativePath: string): boolean =>
  relativePath !== '' &&
  relativePath !== '..' &&
  !relativePath.startsWith(`..${path.sep}`) &&
  !path.isAbsolute(relativePath);

const uniquifyLabelsWithSuffixes = (labels: string[]): string[] => {
  const seen = new Set<string>();
  return labels.map((label, index) => {
    const baseLabel = label || `root-${index + 1}`;
    let candidate = baseLabel;
    let suffix = 2;
    while (seen.has(candidate)) {
      candidate = `${baseLabel}-${suffix}`;
      suffix++;
    }
    seen.add(candidate);
    return candidate;
  });
};

/**
 * Compute a unique display label for each root directory.
 *
 * - Roots inside cwd use their cwd-relative path (e.g. `packages/a`).
 * - Roots outside cwd use only their basename, to avoid leaking host/parent
 *   directory names into the output.
 * - On collision, labels fall back to a numeric suffix (`app`, `app-2`, ...).
 *   - The suffixed label is a display path that does not exist on disk, but
 *     collisions (same label across roots) are expected to be uncommon.
 */
export const buildRootLabels = (rootDirs: string[], cwd: string): string[] => {
  const resolvedCwd = path.resolve(cwd);
  const labels = rootDirs.map((rootDir) => {
    const resolvedRootDir = path.resolve(rootDir);
    const relativeRootDir = path.relative(resolvedCwd, resolvedRootDir);
    return isCwdRelativePath(relativeRootDir)
      ? toDisplayPath(relativeRootDir)
      : toDisplayPath(path.basename(resolvedRootDir) || resolvedRootDir);
  });

  // uniquifyLabelsWithSuffixes leaves already-unique labels untouched and only
  // appends a numeric suffix to collisions, so it covers both cases.
  return uniquifyLabelsWithSuffixes(labels);
};

/**
 * Join a root label and a file path into a single display path
 * (e.g. `app` + `src/index.ts` -> `app/src/index.ts`), normalizing separators
 * and trimming redundant slashes.
 */
export const joinDisplayPath = (rootLabel: string, filePath: string): string => {
  const normalizedRootLabel = toDisplayPath(rootLabel).replace(/^\/+|\/+$/g, '') || 'root';
  const normalizedFilePath = toDisplayPath(filePath).replace(/^\/+/, '');
  return normalizedFilePath ? `${normalizedRootLabel}/${normalizedFilePath}` : normalizedRootLabel;
};
