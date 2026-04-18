import { MESSAGES } from './packRequestMessages.js';

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
// Matches against the first zod issue's message — strings come from the
// shared MESSAGES module so schema and classifier cannot drift out of sync.
// Falls back to 'other' for unmapped paths so a sudden jump in `other`
// surfaces unknown failure modes in the dashboard. NOTE: only the first issue
// is classified — a request failing multiple validations (e.g. both URL and
// options) gets bucketed by whichever zod surfaces first.
//
// `validateRequest` wraps ZodError in AppError, so the original issues live on
// `error.cause`. We check both so callers don't need to know which layer is
// responsible for wrapping.
//
// Pre-zod paths (e.g. the JSON.parse failure in packAction) set
// `rejectReason: 'invalid_json'` directly at the call site since the label is
// statically known — no synthetic error needs to be routed through here.
const MESSAGE_TO_REASON: Record<string, string> = {
  [MESSAGES.MISSING_INPUT]: 'missing_input',
  [MESSAGES.BOTH_PROVIDED]: 'both_provided',
  [MESSAGES.INVALID_URL]: 'invalid_url',
  [MESSAGES.URL_TOO_LONG]: 'url_too_long',
  [MESSAGES.URL_REQUIRED]: 'url_empty',
  [MESSAGES.INVALID_FILE]: 'invalid_file',
  [MESSAGES.NOT_ZIP]: 'not_zip',
  [MESSAGES.FILE_TOO_LARGE]: 'file_too_large',
  [MESSAGES.INVALID_IGNORE_CHARS]: 'invalid_ignore_chars',
  [MESSAGES.INCLUDE_TOO_LONG]: 'include_too_long',
  [MESSAGES.IGNORE_TOO_LONG]: 'ignore_too_long',
};

export function classifyRejectReason(error: unknown): string {
  const issues = extractZodIssues(error);
  if (!issues || issues.length === 0) return 'unknown';

  const first = issues[0];
  const msg = first?.message ?? '';
  const byMessage = MESSAGE_TO_REASON[msg];
  if (byMessage) return byMessage;

  const path = Array.isArray(first?.path) ? first.path.join('.') : '';
  if (path === 'format') return 'invalid_format';
  return 'other';
}

type ZodIssueShape = { message?: string; path?: Array<string | number> };

// Pull `.issues` from either the error itself (raw ZodError) or the wrapped
// `.cause` (AppError wrapping). Shallow — doesn't walk the cause chain further.
function extractZodIssues(error: unknown): ZodIssueShape[] | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const direct = (error as { issues?: unknown }).issues;
  if (Array.isArray(direct)) return direct as ZodIssueShape[];
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === 'object') {
    const causeIssues = (cause as { issues?: unknown }).issues;
    if (Array.isArray(causeIssues)) return causeIssues as ZodIssueShape[];
  }
  return undefined;
}
