// Pre-scan regex covering all rules in @secretlint/secretlint-rule-preset-recommend v11.4.1.
// Each alternative is a necessary substring/prefix for at least one rule to fire.
// If content does not match, lintSource() is guaranteed to produce zero messages,
// so we can skip the expensive per-file setup (~0.079ms saved per skipped file):
//   - StructuredSource creation (regex scan to build line-index array)
//   - ContextEvents + RunningEvents allocation (EventEmitter setup)
//   - Re-registration of all 15 rules (createRuleContext + handler binding)
//
// False positives (clean file matches pre-scan) → full lintSource runs. Acceptable.
// False negatives (file with secret skips pre-scan) → MUST NOT happen.
//
// Rules covered (in order of alternatives):
//   AWS access key IDs:   AKIA, AGPA, AIDA, AROA, AIPA, ANPA, ANVA, ASIA, A3T[A-Z0-9]
//   AWS secret/account:   SECRET_?ACCESS_?KEY, ACCOUNT (ID suffix optional in rule)
//   GCP / PrivateKey:     PRIVATE KEY (PEM headers)
//   NPM:                  npm_, _authToken
//   Slack:                xox[bpaor], xapp-, hooks.slack.com
//   BasicAuth:            ://user:pass@ (bounded to prevent backtracking)
//   OpenAI:               sk-proj-, sk-svcacct-, sk-admin-, T3BlbkFJ
//   Anthropic:            sk-ant-
//   Linear:               lin_api_
//   SendGrid:             SG.[alphanumeric]
//   Shopify:              shp(pa|ca|at|ss)_
//   GitHub:               gh[pousr]_, github_pat_
//   1Password:            ops_ey
//   Database conn:        mongodb[+srv]://, mysql[x]://, postgres[ql]://
// secretlint-disable
export const SECRETLINT_PRESCAN =
  /AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA|A3T[A-Z0-9]|SECRET_?ACCESS_?KEY|ACCOUNT|PRIVATE KEY|npm_|_authToken|xox[bpaor]|xapp-|hooks\.slack\.com|:\/\/[^\s@]{1,256}:[^\s@]{1,256}@|sk-ant-|sk-proj-|sk-svcacct-|sk-admin-|T3BlbkFJ|lin_api_|SG\.[A-Za-z0-9]|shp(?:pa|ca|at|ss)_|gh[pousr]_|github_pat_|ops_ey|mongodb(?:\+srv)?:\/\/|mysqlx?:\/\/|postgres(?:ql)?:\/\//i;
// secretlint-enable
