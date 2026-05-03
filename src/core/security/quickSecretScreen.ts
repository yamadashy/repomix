// Pre-screen regex carrying one over-inclusive marker per detection rule in
// `@secretlint/secretlint-rule-preset-recommend`. Asymmetric on purpose:
// false positives fall through to `lintSource` (correct, slightly slower);
// false negatives would silently drop real secrets. The matching rule-count
// pin in `securityCheckWorker.test.ts` forces an audit when the preset
// gains a new detector.
//
// Lives in its own module so the main thread can pre-screen without paying
// `@secretlint/core`'s ~30-50ms top-level import cost; the worker re-exports
// it for the existing test imports.
export const QUICK_SECRET_SCREEN =
  /A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA|secret_?access_?key|account|-----BEGIN|hooks\.slack\.com|x(?:app|oxa|oxb|oxp|oxo|oxr)-|gh[oprsu]_|github_pat_|sk-ant-api0|sk-(?:proj|svcacct|admin)-|T3BlbkFJ|lin_api_|ops_ey|SG\.[\w-]+\.|sh(?:pat|pss|pca|ppa)_|x-oauth-basic|_authToken|npm_[A-Za-z0-9_]{20}|mongodb(?:\+srv)?:\/\/|(?:jdbc:)?mysqlx?:\/\/|postgres(?:ql)?:\/\/|:\/\/[^\s/?#@]+:[^\s/?#@]+@/i;
