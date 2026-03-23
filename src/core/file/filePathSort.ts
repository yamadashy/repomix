import path from 'node:path';

// Sort paths for general use (not affected by git change count)
// Uses decorate-sort-undecorate to pre-compute path.split() once per path
// instead of O(N log N) repeated splits during comparisons
export const sortPaths = (filePaths: string[]): string[] => {
  const decorated = filePaths.map((p) => ({ original: p, parts: p.split(path.sep) }));

  decorated.sort((a, b) => {
    const partsA = a.parts;
    const partsB = b.parts;

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      if (partsA[i] !== partsB[i]) {
        const isLastA = i === partsA.length - 1;
        const isLastB = i === partsB.length - 1;

        if (!isLastA && isLastB) return -1; // Directory
        if (isLastA && !isLastB) return 1; // File

        const aLower = partsA[i].toLowerCase();
        const bLower = partsB[i].toLowerCase();
        return aLower < bLower ? -1 : aLower > bLower ? 1 : 0;
      }
    }

    // Sort by path length when all parts are equal
    return partsA.length - partsB.length;
  });

  return decorated.map((d) => d.original);
};
