// Fast pre-filter for the secretlint security check.
//
// This module is intentionally free of any `@secretlint/*` import so it can be
// used from BOTH the worker thread (`securityCheckWorker.ts`) and the main
// thread (`securityCheck.ts`) without pulling secretlint's ~75ms module-load
// cost onto the main thread.
//
// `lintSource` from @secretlint/core carries a large fixed per-call overhead
// (it builds fresh context/event objects, instantiates every rule in the preset
// and registers their listeners) that dominates the security phase — the single
// most expensive phase of a warm pack. Every rule in
// `@secretlint/secretlint-rule-preset-recommend`, however, can only *report*
// when the scanned content contains at least one rule-specific literal. If none
// of those literals appear in a file, `lintSource` is guaranteed to return no
// findings, so the whole call can be skipped for that file with no change in
// results.
//
// SECRET_INDICATOR_PATTERN is the union of the necessary literal conditions of
// every rule in the recommended preset (pinned via package.json). The match is
// case-insensitive and deliberately over-inclusive: a false positive (scanning a
// file that turns out clean) only costs an unnecessary `lintSource` call, while a
// false negative would skip a real finding. Coverage by rule family:
//   - Token-prefix rules (AWS AKIA; GitHub ghp_/gho_/ghu_/ghs_/ghr_/github_pat_;
//     GitLab glpat-/glsa_/glc_; Slack xoxb-/xoxa-/xoxp-/xoxr-/xapp-/xoxo-;
//     SendGrid SG.; Shopify shp*_; Stripe sk_live_/sk_test_/rk_live_/rk_test_;
//     OpenAI/Anthropic sk-ant-/sk-proj-/T3BlbkFJ; Groq gsk_; HuggingFace hf_;
//     Linear lin_api_; npm npm_/_authToken; Docker dckr_pat_; Figma figd_;
//     Tailscale tskey-; 1Password ops_ey; Notion ntn_; Vault hvs./hvb./hvr.;
//     Databricks dapi; Cloudflare cf*_; Vercel v{cp,ci,ca,cr,ck}_): each
//     literal alternative of the rule's prefix set is listed.
//   - AWS Secret Access Key / AWS Account ID: require the words `secret` /
//     `account` respectively.
//   - GCP service-account JSON: requires the `private_key_id` field. (The GCP
//     `.p12` sub-rule reads binary PKCS#12 files, which never reach the security
//     worker — repomix excludes binary content upstream in fileRead.)
//   - Private keys: require the `-----BEGIN` PEM header.
//   - Slack incoming webhooks: require the `hooks.slack.com/services/` path
//     literal (the secret is encoded in the URL path, not in credentials).
//   - npm XOAuth GitHub tokens: require the `x-oauth-basic` scheme literal (the
//     token may contain `/`, so it is not always reachable via the credential
//     pattern below — match the literal directly).
//   - Basic-auth URLs / database connection strings (basicauth + mongodb/mysql/
//     postgresql connection-string rules): handled separately by
//     SECRET_URL_CREDENTIAL_PATTERN below rather than by a bare `://`. Every one
//     of these rules only reports when the URI carries inline credentials
//     (`scheme://user:password@host`) — the DB rules `continue` unless both a
//     username and password group are captured, and basicauth's regex requires
//     `user:password@`. A bare `://` (a plain URL, an import path, a doc link)
//     can never trigger them, so matching the full `://user:password@` shape
//     here skips the ~400 credential-free URL-bearing files that a bare `://`
//     would otherwise force through `lintSource`.
//
// IMPORTANT: when bumping `@secretlint/*`, re-verify these patterns still cover
// every rule's necessary literal — a rule whose prefix set gains a new member
// (e.g. a new Slack/GitHub/Stripe token kind) must be added here, and any new
// URL/connection-string rule that can fire without inline `user:password@`
// credentials must be added to (or relax) SECRET_URL_CREDENTIAL_PATTERN. The
// securityCheckWorker behavior-preservation test cross-checks realistic secrets
// against the live engine and fails loudly if a flagged secret is not matched
// here.
const SECRET_INDICATOR_PATTERN =
  /AKIA|ghp_|gho_|ghs_|ghu_|ghr_|github_pat_|glpat-|glsa_|glc_|xoxb-|xoxa-|xoxp-|xoxs-|xoxr-|xapp-|xoxo-|SG\.|shppa_|shpca_|shpat_|shpss_|sk_live_|sk_test_|pk_live_|pk_test_|rk_live_|rk_test_|sk-ant-|sk-proj-|sk-svcacct-|sk-admin-|T3BlbkFJ|gsk_|hf_|lin_api_|npm_|_authToken|dckr_pat_|figd_|tskey-|ops_ey|ntn_|hvs\.|hvb\.|hvr\.|dapi|cfk_|cfut_|cfat_|vcp_|vci_|vca_|vcr_|vck_|-----BEGIN|secret|account|private_key_id|hooks\.slack\.com\/services\/|x-oauth-basic/i;

// Necessary-literal pattern for the only rules keyed on a URI: basicauth and the
// mongodb/mysql/postgresql connection-string rules. All four require inline
// credentials of the form `scheme://user:password@host`. The username/password
// character classes here are the *broadest* used by any of those rules
// (basicauth: `[-a-zA-Z0-9_]`; the DB rules: username `[^:/\s]`, password
// `[^@/\s]`), so this pattern matches a superset of every credential portion any
// of them can match — guaranteeing no false negative — while a bare `://` no
// longer forces credential-free URLs through the engine. Bounded quantifiers and
// disjoint delimiters (`:`/`@`) keep it linear (no ReDoS).
const SECRET_URL_CREDENTIAL_PATTERN = /:\/\/[^\s:/]{1,256}:[^\s@/]{1,256}@/;

/**
 * Returns true if `content` contains any literal that a recommended-preset
 * secretlint rule needs in order to report a finding. When this returns false
 * the file cannot trigger any rule, so the (expensive) `lintSource` call is
 * skipped. Exported for behavior-preservation testing.
 */
export const mightContainSecret = (content: string): boolean =>
  SECRET_INDICATOR_PATTERN.test(content) || SECRET_URL_CREDENTIAL_PATTERN.test(content);
