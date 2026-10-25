import path from 'node:path';

// Brace patterns nested deeper than this are rejected. Real include patterns
// rarely nest at all, while deep nesting makes the brace expansion in the glob
// stack (braces/micromatch) build pathological regexes that can take down the
// process. Ignore patterns cannot contain braces at all (schema charset).
export const MAX_BRACE_DEPTH = 5;

export function getMaxBraceDepth(pattern: string): number {
  let depth = 0;
  let maxDepth = 0;
  for (const ch of pattern) {
    if (ch === '{') {
      depth++;
      if (depth > maxDepth) maxDepth = depth;
    } else if (ch === '}' && depth > 0) {
      depth--;
    }
  }
  return maxDepth;
}

export function sanitizePattern(patterns: string | undefined): string {
  if (!patterns) return '';

  return (
    patterns
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      // Additional security checks
      .filter((p) => {
        // Prevent absolute paths - POSIX
        if (p.startsWith('/')) return false;
        // Prevent absolute paths - Windows drive-letter or UNC
        if (path.win32.isAbsolute(p)) return false;
        // Extra defensive check for drive-letter paths
        if (/^[a-zA-Z]:[\\/]/.test(p)) return false;
        // Prevent UNC paths
        if (p.startsWith('\\\\')) return false;
        // Prevent directory traversal
        if (p.includes('../') || p.includes('..\\')) return false;
        // Prevent environment variable expansion
        if (p.includes('$')) return false;
        // Prevent command execution
        if (p.includes('`') || p.includes('$(')) return false;
        return true;
      })
      .join(',')
  );
}
