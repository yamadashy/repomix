// Shared validation-error message strings used by both packRequestSchema (the
// producer — valibot issues) and packEventSchema.classifyRejectReason (the
// consumer — maps message back to a metric label). Keeping these in one
// module makes drift impossible by construction: a message rewrite propagates
// to both sides automatically, and the reject-reason bucket on the dashboard
// stays aligned with what valibot actually emits.
//
// Tests import the same constants, so there is no third copy to keep in sync.

export const MESSAGES = {
  URL_REQUIRED: 'Repository URL is required',
  URL_TOO_LONG: 'Repository URL is too long',
  INVALID_URL: 'Invalid repository URL',
  INVALID_FILE: 'Invalid file format',
  NOT_ZIP: 'Only ZIP files are allowed',
  FILE_TOO_LARGE: 'File size must be less than 10MB',
  INVALID_IGNORE_CHARS: 'Invalid characters in ignore patterns',
  INCLUDE_TOO_LONG: 'Include patterns too long',
  IGNORE_TOO_LONG: 'Ignore patterns too long',
  MISSING_INPUT: 'Either URL or file must be provided',
  BOTH_PROVIDED: 'Cannot provide both URL and file',
} as const;
