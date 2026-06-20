import path from 'node:path';
import type { RepomixOutputFilePathStyle } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';

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

export interface BuildFileDisplayPathParams {
  rootDir: string;
  filePath: string;
  cwd: string;
  filePathStyle: RepomixOutputFilePathStyle;
  rootLabel?: string;
}

export const buildFileDisplayPath = ({
  rootDir,
  filePath,
  cwd,
  filePathStyle,
  rootLabel,
}: BuildFileDisplayPathParams): string => {
  switch (filePathStyle) {
    case 'cwd-relative': {
      const absolutePath = path.resolve(rootDir, filePath);
      return toDisplayPath(path.relative(path.resolve(cwd), absolutePath)) || '.';
    }
    case 'target-relative':
      return rootLabel ? joinDisplayPath(rootLabel, filePath) : toDisplayPath(filePath);
    default:
      // Exhaustive: adding a new style to repomixOutputFilePathStyleSchema must
      // be handled here explicitly rather than silently falling through.
      throw new RepomixError(`Unsupported output file path style: ${filePathStyle}`);
  }
};

/**
 * Whether a file path style renders files with per-root display labels (and a
 * per-root tree). Centralizing this keeps the "which styles use root labels"
 * decision in one exhaustive place, so adding a new style surfaces here (and
 * errors if left unhandled) instead of silently defaulting in scattered checks.
 */
export const usesRootLabels = (filePathStyle: RepomixOutputFilePathStyle): boolean => {
  switch (filePathStyle) {
    case 'target-relative':
      return true;
    case 'cwd-relative':
      return false;
    default:
      throw new RepomixError(`Unsupported output file path style: ${filePathStyle}`);
  }
};
