import { minimatch } from 'minimatch';
import type { OutputPattern } from '../../config/configSchema.js';

/**
 * The effective inclusion level for a single file in the packed output:
 * - `full`: the file's full content is included (the default behavior).
 * - `compress`: the content is passed through the Tree-sitter compression pipeline.
 * - `directory-only`: the file is listed in the directory structure but its
 *   content block is omitted from the output entirely.
 */
export type FileInclusionLevel = 'full' | 'compress' | 'directory-only';

/** Subset of the output config that affects a file's inclusion level. */
export interface FileLevelOutputConfig {
  compress?: boolean;
  patterns?: OutputPattern[];
}

/**
 * Resolve the inclusion level for a file from `output.patterns`, falling back to
 * the global `output.compress` setting when no pattern matches.
 *
 * Patterns are evaluated in array order and the first match wins. A matched
 * pattern's flags override the global `output.compress` setting for that file,
 * with `directoryStructureOnly` taking precedence over `compress`. A pattern
 * that matches without setting either flag forces full content for that file.
 *
 * `filePath` is expected to be the file's per-root-relative path — the same
 * basis `include`/`ignore` match against — so `output.patterns` globs match
 * exactly like include/ignore. The packager resolves the level before rewriting
 * the path to its display form (which, with multiple roots or
 * `output.filePathStyle`, would otherwise shift what the globs match).
 *
 * Globs are matched the same way as include/ignore patterns in fileSearch:
 * minimatch with `{ dot: true }`, against the posix (forward-slash) form of the
 * path so Windows backslash paths still match forward-slash globs.
 */
export const resolveFileLevel = (filePath: string, output: FileLevelOutputConfig): FileInclusionLevel => {
  const patterns = output.patterns;

  if (patterns && patterns.length > 0) {
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const entry of patterns) {
      if (minimatch(normalizedPath, entry.pattern, { dot: true })) {
        if (entry.directoryStructureOnly) {
          return 'directory-only';
        }
        if (entry.compress) {
          return 'compress';
        }
        return 'full';
      }
    }
  }

  return output.compress ? 'compress' : 'full';
};
