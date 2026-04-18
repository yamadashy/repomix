// Shared log schema for `pack_completed` events. Used by packAction (success /
// validation_error / pack_error) and rateLimitMiddleware (rate_limited) so that
// log-based metric filters and outcome labels stay in sync between the two
// emitters. If this file and the GCP metric definitions drift, the
// `pack_requests` metric will silently mislabel rows.
//
// Named `pack_completed` as a lifecycle event — it covers all pack-request
// terminal outcomes (success / validation_error / pack_error / rate_limited),
// not just successful packs. The alternative of per-outcome event names would
// require N metric filters instead of one filter + outcome label.
export const PACK_EVENT = 'pack_completed';

export type PackOutcome = 'success' | 'validation_error' | 'pack_error' | 'rate_limited';

// Extract a stable `repoHost` label for log-based metrics (e.g. 'github.com',
// 'gitlab.com', 'upload'). Repomix accepts shorthand like 'owner/repo' which
// isn't a parseable URL — default those to 'github.com' since that's the
// shorthand target.
export function getRepoHost(input: { file?: unknown; url?: string }): string {
  if (input.file) return 'upload';
  const url = input.url;
  if (!url) return 'unknown';
  try {
    return new URL(url).hostname;
  } catch {
    return 'github.com';
  }
}

// Map a validation error to a stable `rejectReason` label for log-based metrics.
// Matches against the zod issue message (strings are stable because they are
// defined in this project's schema). Falls back to 'other' for unmapped paths
// so a sudden jump in `other` surfaces unknown failure modes in the dashboard.
export function classifyRejectReason(error: unknown): string {
  if (error instanceof Error && error.message === 'Invalid JSON in options') {
    return 'invalid_json';
  }
  if (!error || typeof error !== 'object') return 'unknown';

  const issues = (error as { issues?: Array<{ message?: string; path?: Array<string | number> }> }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return 'unknown';

  const first = issues[0];
  const msg = first?.message ?? '';
  switch (msg) {
    case 'Either URL or file must be provided':
      return 'missing_input';
    case 'Cannot provide both URL and file':
      return 'both_provided';
    case 'Invalid repository URL':
      return 'invalid_url';
    case 'Repository URL is too long':
      return 'url_too_long';
    case 'Repository URL is required':
      return 'url_empty';
    case 'Invalid file format':
      return 'invalid_file';
    case 'Only ZIP files are allowed':
      return 'not_zip';
    case 'File size must be less than 10MB':
      return 'file_too_large';
    case 'Invalid characters in ignore patterns':
      return 'invalid_ignore_chars';
    case 'Include patterns too long':
      return 'include_too_long';
    case 'Ignore patterns too long':
      return 'ignore_too_long';
  }
  const path = Array.isArray(first?.path) ? first.path.join('.') : '';
  if (path === 'format') return 'invalid_format';
  return 'other';
}
