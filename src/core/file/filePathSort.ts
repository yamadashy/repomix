import path from 'node:path';

// Sort paths for general use (not affected by git change count)
// Uses decorate-sort-undecorate to pre-compute path.split() and toLowerCase() once per path
// instead of O(N log N) repeated splits and case conversions during comparisons.
// For 1000 files with ~4 segments each, this eliminates ~20,000 toLowerCase() allocations.
export const sortPaths = (filePaths: string[]): string[] => {
  const decorated = filePaths.map((p) => {
    const parts = p.split(path.sep);
    // Single-pass toLowerCase instead of parts.map() to avoid intermediate array allocation.
    // For 1000 files with ~4 segments each, eliminates 1000 Array.map() calls.
    const lowerParts = new Array<string>(parts.length);
    for (let i = 0; i < parts.length; i++) {
      lowerParts[i] = parts[i].toLowerCase();
    }
    return { original: p, parts, lowerParts };
  });

  decorated.sort((a, b) => {
    const partsA = a.parts;
    const partsB = b.parts;
    const lowerA = a.lowerParts;
    const lowerB = b.lowerParts;

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      if (partsA[i] !== partsB[i]) {
        const isLastA = i === partsA.length - 1;
        const isLastB = i === partsB.length - 1;

        if (!isLastA && isLastB) return -1; // Directory
        if (isLastA && !isLastB) return 1; // File

        const al = lowerA[i];
        const bl = lowerB[i];
        return al < bl ? -1 : al > bl ? 1 : 0;
      }
    }

    // Sort by path length when all parts are equal
    return partsA.length - partsB.length;
  });

  return decorated.map((d) => d.original);
};
