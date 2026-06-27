import type { FileInclusionLevel } from './fileLevelResolve.js';

export interface RawFile {
  path: string;
  content: string;
  /**
   * Per-file inclusion level, resolved by the packager against the file's
   * per-root-relative path (the same basis `include`/`ignore` match against),
   * before `path` is rewritten to its display form. Carried on the file object
   * so `processFiles` does not have to re-derive it from the display `path`.
   * Optional: callers that build RawFiles directly (e.g. tests) may omit it, in
   * which case `processFiles` falls back to resolving it from `path`.
   */
  level?: FileInclusionLevel;
}

export interface ProcessedFile {
  path: string;
  content: string;
}
