# Repomix server monitoring

Cloud Monitoring dashboard definition for `repomix-server-us`.

Log-based metrics used by the dashboard are managed directly in the GCP Console
(`logging.googleapis.com/user/oom_terminations` and `container_killed`). They
persist on the project and do not need to be redefined here.

## Apply the dashboard

```bash
# Create
gcloud monitoring dashboards create --config-from-file=dashboard.json --project=repomix

# Update (use the dashboard ID from `gcloud monitoring dashboards list`)
gcloud monitoring dashboards update projects/repomix/dashboards/<ID> \
  --config-from-file=dashboard.json --project=repomix
```
