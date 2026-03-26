import path from 'node:path';

const SEP = path.sep;

/**
 * Compare two lowercased paths for sorting: directories before files, case-insensitive.
 * Extracted as a named function to satisfy the linter's requirement that sort callbacks
 * always return a value (the while(true) loop confuses flow analysis).
 */
const comparePaths = (al: string, bl: string): number => {
  let aPos = 0;
  let bPos = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Find next segment boundary
    let aEnd = al.indexOf(SEP, aPos);
    if (aEnd === -1) aEnd = al.length;
    let bEnd = bl.indexOf(SEP, bPos);
    if (bEnd === -1) bEnd = bl.length;

    // Compare segments character by character using pre-lowered strings
    const aSegLen = aEnd - aPos;
    const bSegLen = bEnd - bPos;
    const minLen = aSegLen < bSegLen ? aSegLen : bSegLen;

    let diff = 0;
    for (let i = 0; i < minLen; i++) {
      const ac = al.charCodeAt(aPos + i);
      const bc = bl.charCodeAt(bPos + i);
      if (ac !== bc) {
        diff = ac - bc;
        break;
      }
    }

    if (diff !== 0 || aSegLen !== bSegLen) {
      // Segments differ: directories (non-last segment) sort before files (last segment)
      const isLastA = aEnd >= al.length;
      const isLastB = bEnd >= bl.length;
      if (!isLastA && isLastB) return -1;
      if (isLastA && !isLastB) return 1;
      return diff !== 0 ? diff : aSegLen - bSegLen;
    }

    // Segments are identical — advance to next segment
    if (aEnd >= al.length && bEnd >= bl.length) return 0;
    if (aEnd >= al.length) return -1; // a is shorter (fewer segments)
    if (bEnd >= bl.length) return 1; // b is shorter

    aPos = aEnd + 1;
    bPos = bEnd + 1;
  }
};

/**
 * Sort file paths with directories before files at each level, case-insensitive.
 *
 * Optimized for low allocation: pre-computes a single lowercased string per path
 * instead of splitting into arrays + lowercasing each segment + creating decorated objects.
 * For 1000 files, this reduces allocations from ~10,000 objects to ~1,000 strings.
 *
 * Comparison uses inline segment scanning via indexOf + charCodeAt, avoiding per-segment
 * string extraction during the O(n log n) sort phase.
 */
export const sortPaths = (filePaths: string[]): string[] => {
  const len = filePaths.length;
  if (len <= 1) return filePaths;

  // Pre-compute lowercase version of each path (1 allocation per path instead of ~10)
  const lowerPaths = new Array<string>(len);
  for (let i = 0; i < len; i++) {
    lowerPaths[i] = filePaths[i].toLowerCase();
  }

  // Sort indices to avoid moving original strings during sort
  const indices = Array.from({ length: len }, (_, i) => i);

  indices.sort((ai, bi) => comparePaths(lowerPaths[ai], lowerPaths[bi]));

  const result = new Array<string>(len);
  for (let i = 0; i < len; i++) {
    result[i] = filePaths[indices[i]];
  }
  return result;
};
