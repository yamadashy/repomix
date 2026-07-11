import path from 'node:path';

// Sort paths for general use (not affected by git change count)
// Uses decorate-sort-undecorate to pre-compute path.split() once per path
// instead of O(N log N) repeated splits during comparisons.
// Paths arrive normalized to POSIX separators (globby output, buildFileDisplayPath),
// so split on "/" instead of the OS separator: on Windows path.sep is "\\", so a
// "/"-separated path would never split and the directory-aware ordering below would
// silently degrade to a flat whole-string comparison.
export const sortPaths = (filePaths: string[]): string[] => {
  const decorated = filePaths.map((p) => ({
    original: p,
    parts: p.replaceAll(path.win32.sep, path.posix.sep).split(path.posix.sep),
  }));

  decorated.sort((a, b) => {
    const partsA = a.parts;
    const partsB = b.parts;

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      if (partsA[i] !== partsB[i]) {
        const isLastA = i === partsA.length - 1;
        const isLastB = i === partsB.length - 1;

        if (!isLastA && isLastB) return -1; // Directory
        if (isLastA && !isLastB) return 1; // File

        return partsA[i].localeCompare(partsB[i]); // Alphabetical order
      }
    }

    // Sort by path length when all parts are equal
    return partsA.length - partsB.length;
  });

  return decorated.map((d) => d.original);
};
