#!/usr/bin/env bash
# Apply (create or update) all log-based metrics defined in ./metrics/*.yaml
# against the repomix GCP project. Idempotent — run after editing any YAML.
#
# Usage:
#   ./apply-metrics.sh          # applies to project 'repomix'
#   PROJECT=my-proj ./apply-metrics.sh

set -euo pipefail

PROJECT="${PROJECT:-repomix}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
METRICS_DIR="$SCRIPT_DIR/metrics"

for yaml in "$METRICS_DIR"/*.yaml; do
  name="$(basename "$yaml" .yaml)"
  if gcloud logging metrics describe "$name" --project="$PROJECT" >/dev/null 2>&1; then
    echo "Updating metric: $name"
    gcloud logging metrics update "$name" --config-from-file="$yaml" --project="$PROJECT"
  else
    echo "Creating metric: $name"
    gcloud logging metrics create "$name" --config-from-file="$yaml" --project="$PROJECT"
  fi
done
