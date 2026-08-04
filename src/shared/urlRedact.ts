/**
 * Credential redaction for repository URLs.
 *
 * Remote URLs are routinely written with credentials inline
 * (`https://<token>@github.com/owner/repo.git`), especially in CI. Any such URL
 * that reaches console output, a trace log, or an error message persists the
 * credential in terminal scrollback, CI build logs, and log aggregation systems
 * (CWE-532), long after the command itself has finished.
 *
 * The helpers below accept either a bare URL or arbitrary text that embeds one:
 * git echoes the full command line back in its failure messages, so an error
 * from a failed clone carries the remote URL even though it is not a URL itself.
 */

const REDACTED = '***';

// Query parameters that carry a credential rather than a routing value.
const CREDENTIAL_QUERY_KEYS = [
  'access_token',
  'api_key',
  'apikey',
  'auth',
  'job_token',
  'password',
  'private_token',
  'pwd',
  'secret',
  'token',
];

// `scheme://userinfo@host`. The userinfo runs to the last '@' before the path,
// query, or fragment begins. All of it is replaced, not just the password half:
// the credential is often the username alone (`https://<token>@github.com/...`).
const SCHEME_USERINFO_PATTERN = /([a-z][a-z0-9+.-]*:\/\/)[^/?#\s]*@/gi;

// scp-style `user:password@host:path`, which carries no scheme. Redacted only
// when the userinfo contains a ':', so ordinary SSH remotes stay readable:
// in `git@github.com:owner/repo` the username is a fixed literal, never a secret,
// and authentication happens out of band via the SSH key.
const SCP_USERINFO_PATTERN = /(^|\s)[^/@\s:]+:[^/@\s]*@/g;

const CREDENTIAL_QUERY_PATTERN = new RegExp(`([?&])(${CREDENTIAL_QUERY_KEYS.join('|')})=[^&#\\s]*`, 'gi');

/**
 * Replaces credentials embedded in a URL with a placeholder.
 * Must be applied to every URL that reaches a logger or an error message.
 */
export const redactUrl = (value: string): string =>
  value
    .replace(SCHEME_USERINFO_PATTERN, `$1${REDACTED}@`)
    .replace(SCP_USERINFO_PATTERN, `$1${REDACTED}@`)
    .replace(CREDENTIAL_QUERY_PATTERN, `$1$2=${REDACTED}`);

/**
 * Extracts an error's message with any embedded credentials redacted.
 *
 * Node's `execFile` rejects with the full command line in `error.message`, so a
 * `git clone` against a credentialed remote leaks the credential to whoever
 * formats that message. Redacting at the point of formatting keeps the guarantee
 * from depending on which call site handles the failure.
 */
export const redactErrorMessage = (error: unknown): string =>
  redactUrl(error instanceof Error ? error.message : String(error));

/**
 * Returns a copy of CLI options with the remote URL redacted.
 *
 * Verbose runs dump the whole options object into the trace log, which would
 * otherwise print `remote` verbatim no matter how carefully the individual call
 * sites redact. Typed structurally so this module stays independent of `cli/`.
 */
export const redactOptionsForLog = <T extends { remote?: string }>(options: T): T =>
  typeof options.remote === 'string' ? { ...options, remote: redactUrl(options.remote) } : options;
