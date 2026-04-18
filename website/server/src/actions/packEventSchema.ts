// Shared log schema for `pack_completed` events. Used by packAction (success /
// validation_error / pack_error) and rateLimitMiddleware (rate_limited) so that
// log-based metric filters and outcome labels stay in sync between the two
// emitters. If this file and the GCP metric definitions drift, the
// `pack_requests` metric will silently mislabel rows.
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
