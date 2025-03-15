import path from 'node:path';

// Sort paths for general use (not affected by git change count)
export const sortPaths = (filePaths: string[]): string[] => {
  return filePaths.sort((a, b) => {
    const partsA = a.split(path.sep);
    const partsB = b.split(path.sep);

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
};
