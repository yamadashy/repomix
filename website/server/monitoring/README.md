# Repomix server monitoring

Log-based metric definitions for `repomix-server-us` on Google Cloud Run.

## Why these exist

Prior to this setup, analyzing traffic spikes / bot detection / OOM rates required
ad-hoc `gcloud logging read` + shell pipeline gymnastics. These metric definitions
turn the common signals into time series that feed Cloud Monitoring dashboards
and alert policies.

## Files

| File | Kind | What it measures |
|---|---|---|
| `metrics/pack_requests.yaml` | counter (labels: outcome, source, input_type, cached, format) | Every terminal `/api/pack` request — QPS and outcome mix |
| `metrics/pack_duration.yaml` | distribution (ms, labels: input_type, cached) | Pack latency P50/P95/P99, cache speedup |
| `metrics/oom_terminations.yaml` | counter | Cloud Run OOM kills (`Memory limit … exceeded`) |
| `metrics/container_killed.yaml` | counter | Runtime memory-kill detection |
| `metrics/direct_access.yaml` | counter | Requests that bypassed Cloudflare (should be ~0) |

## Applying

Requires `gcloud` logged in with `logging.configWriter` on the `repomix` project.

```bash
./apply-metrics.sh                 # applies all YAMLs (create or update)
PROJECT=my-proj ./apply-metrics.sh # override project
```

The script is idempotent — safe to re-run after edits.

## Depends on

The counters assume the application emits unified `event=pack_completed` log
entries with `outcome`, `source`, `inputType`, `cached`, `format`, `durationMs`
fields. Added in `packAction.ts` and `rateLimitMiddleware.ts`. If you delete or
rename those fields, update the `labelExtractors` here as well.
