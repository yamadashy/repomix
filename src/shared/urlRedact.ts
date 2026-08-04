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

// Upper bounds on the credential-bearing spans. A real userinfo or host is far
// shorter than these, but the quantifiers must be bounded: the patterns below
// backtrack across every '@' in a token, and an unbounded search combined with
// the lookahead is quadratic in the token length, which an untrusted caller (an
// MCP client passing `remote`) could use to stall the event loop.
const MAX_USERINFO = 256;
const MAX_HOST = 256;

// `scheme://userinfo@host`. The userinfo runs to the last '@' before the path
// begins. All of it is replaced, not just the password half: the credential is
// often the username alone (`https://<token>@github.com/...`).
//
// Only '/' and whitespace terminate the search, deliberately not '?' or '#': a
// password containing either of those unencoded is malformed but still a real
// secret, and stopping early would leave it in the clear. The cost is that a
// path-less URL with an '@' inside its query gets over-redacted, which is a far
// better failure than printing a credential.
const SCHEME_USERINFO_PATTERN = new RegExp(`([a-z][a-z0-9+.-]{0,31}://)[^/\\s]{0,${MAX_USERINFO}}@`, 'gi');

// scp-style `user:password@host:path`, which carries no scheme. Redacted only
// when the userinfo contains a ':', so ordinary SSH remotes stay readable:
// in `git@github.com:owner/repo` the username is a fixed literal, never a secret,
// and authentication happens out of band via the SSH key. Matching to the last
// '@' in the token keeps a password that itself contains '@' from surviving, and
// the trailing lookahead requires the `host:path` that every scp-style remote
// has, so unrelated text like `failed at 12:30@example.com` is left alone.
const SCP_USERINFO_PATTERN = new RegExp(
  `(^|\\s)[^/@\\s:]{1,${MAX_USERINFO}}:[^/\\s]{0,${MAX_USERINFO}}@(?=[^\\s:]{1,${MAX_HOST}}:)`,
  'g',
);

// The value runs to the end of the parameter. Sub-delimiters such as ',' and '('
// are legal unencoded in a query value, so stopping at them would leave most of a
// credential in the clear — the trailing punctuation that log output wraps a URL
// in is restored afterwards instead.
const CREDENTIAL_QUERY_PATTERN = new RegExp(`([?&])(${CREDENTIAL_QUERY_KEYS.join('|')})=([^&#\\s]*)`, 'gi');

// Punctuation that ends a quoted or parenthesised URL in a log line. It is put
// back after the placeholder so redaction does not eat the rest of the message;
// a credential that genuinely ends with one of these loses only that character.
const TRAILING_PUNCTUATION_PATTERN = /['"`)\]}>,;:.]+$/;

/**
 * Replaces credentials embedded in a URL with a placeholder.
 * Must be applied to every URL that reaches a logger or an error message.
 */
export const redactUrl = (value: string): string =>
  value
    .replace(SCHEME_USERINFO_PATTERN, `$1${REDACTED}@`)
    .replace(SCP_USERINFO_PATTERN, `$1${REDACTED}@`)
    .replace(
      CREDENTIAL_QUERY_PATTERN,
      (_match, separator, key, paramValue) =>
        `${separator}${key}=${REDACTED}${TRAILING_PUNCTUATION_PATTERN.exec(paramValue)?.[0] ?? ''}`,
    );

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
 * Returns a copy of CLI options with every URL-bearing field redacted.
 *
 * Verbose runs dump the whole options object into the trace log, which would
 * otherwise print these verbatim no matter how carefully the individual call
 * sites redact. Typed structurally so this module stays independent of `cli/`.
 */
export const redactOptionsForLog = <T extends { remote?: string; skillSourceUrl?: string }>(options: T): T => {
  const redacted = { ...options };
  if (typeof redacted.remote === 'string') {
    redacted.remote = redactUrl(redacted.remote);
  }
  if (typeof redacted.skillSourceUrl === 'string') {
    redacted.skillSourceUrl = redactUrl(redacted.skillSourceUrl);
  }
  return redacted;
};
