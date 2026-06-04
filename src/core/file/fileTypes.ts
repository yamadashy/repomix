export interface RawFile {
  path: string;
  content: string;
}

export interface ProcessedFile {
  path: string;
  content: string;
  // Optional, precomputed token-count cache key for `content` under the active
  // token encoding (format: `${encoding}:${byteLength}:${md5_16}`, identical to
  // `contentCacheKey`). Populated during the security-check window — where the
  // main thread is otherwise idle waiting on the secretlint worker pool — so the
  // per-file MD5 hashing overlaps that wait instead of landing on the later
  // metrics critical path. `calculateFileMetrics` reuses it when present (and the
  // encoding prefix matches), otherwise it recomputes the key as before.
  tokenCacheKey?: string;
}
