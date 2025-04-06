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
      if (currentPattern) {
        result.push(currentPattern.trim());
        currentPattern = '';
      }
    } else {
      currentPattern += char;
    }
  }

  // Add the last pattern
  if (currentPattern) {
    result.push(currentPattern.trim());
  }

  return result;
};
