/**
 * Splits comma-separated glob patterns while preserving brace expansion patterns.
 * This ensures patterns with braces are treated as a single pattern,
 * rather than being split at commas inside the braces.
 * Whitespace around patterns is also trimmed.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export const splitPatterns = (patterns?: string): string[] => {
  if (!patterns) return [];

  const result: string[] = [];
  let currentPattern = "";
  let braceLevel = 0;

  for (let i = 0; i < patterns.length; i++) {
    const char = patterns[i];

    if (char === "{") {
      braceLevel++;
      currentPattern += char;
    } else if (char === "}") {
      braceLevel--;
      currentPattern += char;
    } else if (char === "," && braceLevel === 0) {
      // Only split on commas when not inside braces
      if (currentPattern) {
        result.push(currentPattern.trim());
        currentPattern = "";
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

/**
 * Detects whether a pattern is a plain path (literal directory/file name)
 * or an advanced glob pattern with metacharacters.
 *
 * Note: Parentheses are NOT considered glob metacharacters here, as they
 * are commonly used in literal directory names (e.g., Next.js route groups).
 *
 * @param pattern The pattern to check
 * @returns true if pattern contains no glob metacharacters (is a literal path)
 */
export const isPlainPathPattern = (pattern: string): boolean => {
  // Glob metacharacters: *, ?, [], {}, !, +, @, |
  // We intentionally do NOT include () here - that's the whole point
  // | is included because foo/(a|b) is a micromatch alternation feature
  const GLOB_META_REGEX = /[*?[\]{}!+@|]/;
  return !GLOB_META_REGEX.test(pattern);
};

/**
 * Escapes glob metacharacters in a literal path string.
 * This makes parentheses and other special characters literal for fast-glob.
 *
 * @param pathLike A literal path that may contain special characters
 * @returns The escaped path safe for use as a fast-glob pattern
 */
export const escapeGlobMetacharacters = (pathLike: string): string => {
  // Normalize backslashes to forward slashes
  let p = pathLike.replace(/\\/g, "/");

  // Escape characters that micromatch treats specially in regex/glob
  // Note: we don't escape '/' obviously, as it's a path separator
  p = p.replace(/([()[\]{}^$+*?.!\\|])/g, "\\$1");

  return p;
};

/**
 * Expands a literal include path to a proper glob pattern.
 * For directories, expands to directory/**\/* to include all contents.
 * For files, returns the escaped path as-is.
 *
 * @param rootDir The root directory to resolve paths relative to
 * @param pattern The literal path pattern to expand
 * @returns Array of glob patterns (usually one, but could be empty if validation fails)
 */
export const expandLiteralInclude = (
  rootDir: string,
  pattern: string
): string[] => {
  const absolute = path.resolve(rootDir, pattern);
  const escaped = escapeGlobMetacharacters(pattern);

  try {
    if (fs.existsSync(absolute)) {
      const stat = fs.statSync(absolute);
      if (stat.isDirectory()) {
        // Directory: include everything under it
        // Remove trailing slash before appending /**/*
        const normalizedEscaped = escaped.replace(/\/+$/, "");
        return [`${normalizedEscaped}/**/*`];
      }
      // Single file: just the escaped path itself
      return [escaped];
    }
  } catch (error) {
    // If we can't stat the file (permissions, etc.), fall through
  }

  // If path doesn't exist, return as-is (maybe the user actually meant a glob)
  return [pattern];
};
