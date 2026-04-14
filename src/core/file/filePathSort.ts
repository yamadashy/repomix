// Sort paths with directory-first ordering at each level.
// Assumes forward-slash separated paths (both git ls-files and tinyglobby
// normalize to '/' on all platforms).
// Uses an in-place comparator with lazy segment extraction (indexOf + slice)
// instead of pre-splitting all paths into arrays, which avoids N array + object
// allocations. For nearly-sorted input (e.g. git ls-files output), TimSort does
// ~O(N) comparisons, so the per-comparison indexOf cost is amortized.
export const sortPaths = (filePaths: string[]): string[] => {
  if (filePaths.length <= 1) return filePaths;

  return [...filePaths].sort((a, b) => {
    let ia = 0;
    let ib = 0;

    for (;;) {
      let ea = a.indexOf('/', ia);
      let eb = b.indexOf('/', ib);
      const aIsLast = ea === -1;
      const bIsLast = eb === -1;
      if (aIsLast) ea = a.length;
      if (bIsLast) eb = b.length;

      // Fast equality check via charCode before allocating substring
      const lenA = ea - ia;
      const lenB = eb - ib;
      let equal = lenA === lenB;
      if (equal) {
        for (let j = 0; j < lenA; j++) {
          if (a.charCodeAt(ia + j) !== b.charCodeAt(ib + j)) {
            equal = false;
            break;
          }
        }
      }

      if (!equal) {
        // When segments differ: directories (more segments ahead) sort
        // before files (this is the last segment) at the same level.
        if (!aIsLast && bIsLast) return -1;
        if (aIsLast && !bIsLast) return 1;
        return a.slice(ia, ea).localeCompare(b.slice(ib, eb));
      }

      // Segments are equal — shorter path sorts first (matches the
      // original partsA.length - partsB.length tiebreaker).
      if (aIsLast && bIsLast) return 0;
      if (aIsLast) return -1;
      if (bIsLast) return 1;
      ia = ea + 1;
      ib = eb + 1;
    }
  });
};
