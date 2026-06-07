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

const getDuplicateLabels = (labels: string[]): Set<string> => {
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const duplicates = new Set<string>();
  for (const [label, count] of counts) {
    if (count > 1) {
      duplicates.add(label);
    }
  }
  return duplicates;
};

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
  const resolvedRootDirs = rootDirs.map((rootDir) => path.resolve(rootDir));
  const labelCandidates = resolvedRootDirs.map((rootDir) => {
    const relativeRootDir = path.relative(resolvedCwd, rootDir);
    if (isCwdRelativePath(relativeRootDir)) {
      const label = toDisplayPath(relativeRootDir);
      return {
        label,
        segments: label.split('/').filter(Boolean),
      };
    }

    return {
      label: toDisplayPath(path.basename(rootDir) || rootDir),
      segments: undefined,
    };
  });
  const labels = labelCandidates.map(({ label }) => label);

  if (new Set(labels).size === labels.length) {
    return labels;
  }

  const duplicateLabels = getDuplicateLabels(labels);
  const maxDepth = Math.max(...labelCandidates.map(({ segments }) => segments?.length ?? 1), 1);
  let candidates = labels;

  for (let depth = 1; depth <= maxDepth; depth++) {
    candidates = labels.map((label, index) => {
      if (!duplicateLabels.has(label)) {
        return label;
      }

      const segments = labelCandidates[index]?.segments;
      if (!segments) {
        return label || `root-${index + 1}`;
      }

      return segments.slice(-depth).join('/') || label || `root-${index + 1}`;
    });

    if (new Set(candidates).size === candidates.length) {
      return candidates;
    }
  }

  return uniquifyLabelsWithSuffixes(candidates);
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
