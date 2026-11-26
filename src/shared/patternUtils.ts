/**
 * Splits comma-separated glob patterns while preserving brace expansion patterns.
 * This ensures patterns with braces are treated as a single pattern,
 * rather than being split at commas inside the braces.
 * Whitespace around patterns is also trimmed.
 */
export const splitPatterns = (patterns?: string): string[] => {
  if (!patterns) return [];

  const result: string[] = [];
  let currentPattern = '';
  let braceLevel = 0;

  // A segment holding only whitespace carries no pattern. Keeping it would be
  // worse than dropping it: an empty string in a glob list matches every file,
  // so a stray comma in `--include "src/**, ,tests/**"` would silently disable
  // the include filter instead of just adding nothing.
  const pushPattern = () => {
    const pattern = currentPattern.trim();
    if (pattern) {
      result.push(pattern);
    }
    currentPattern = '';
  };

  for (let i = 0; i < patterns.length; i++) {
    const char = patterns[i];

    if (char === '{') {
      braceLevel++;
      currentPattern += char;
    } else if (char === '}') {
      braceLevel--;
      currentPattern += char;
    } else if (char === ',' && braceLevel === 0) {
      // Only split on commas when not inside braces
      pushPattern();
    } else {
      currentPattern += char;
    }
  }

  // Add the last pattern
  pushPattern();

  return result;
};
