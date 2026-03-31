#!/bin/bash
# Run hyperfine benchmarks with different CPU core counts using taskset.
# Useful for measuring performance under CPU-constrained environments.
#
# Usage:
#   npm run bench:cores                     # Default: 2, 4, 8, all cores
#   npm run bench:cores -- 2 4              # Custom core counts
#   npm run bench:cores -- 2 4 -- --runs 20 # Custom cores + hyperfine flags
#
# Arguments before '--' are core counts, arguments after are passed to hyperfine.
#
# Requirements: hyperfine, taskset (util-linux)

set -euo pipefail

TOTAL_CORES=$(nproc)
CORE_COUNTS=()
HYPERFINE_ARGS=()

# Split arguments on '--'
parsing_cores=true
for arg in "$@"; do
  if [ "$arg" = "--" ]; then
    parsing_cores=false
    continue
  fi

  if $parsing_cores; then
    CORE_COUNTS+=("$arg")
  else
    HYPERFINE_ARGS+=("$arg")
  fi
done

# Default core counts if none specified
if [ ${#CORE_COUNTS[@]} -eq 0 ]; then
  for c in 2 4 8; do
    if [ "$c" -le "$TOTAL_CORES" ]; then
      CORE_COUNTS+=("$c")
    fi
  done
  CORE_COUNTS+=("$TOTAL_CORES")
fi

# Default hyperfine args if no flags provided
if [ ${#HYPERFINE_ARGS[@]} -eq 0 ]; then
  HYPERFINE_ARGS=(--warmup 2 --runs 10)
fi

echo "Total available cores: $TOTAL_CORES"
echo "Benchmarking with core counts: ${CORE_COUNTS[*]}"
echo "Hyperfine args: ${HYPERFINE_ARGS[*]}"
echo ""

for cores in "${CORE_COUNTS[@]}"; do
  if [ "$cores" -gt "$TOTAL_CORES" ]; then
    echo "Skipping $cores cores (only $TOTAL_CORES available)"
    continue
  fi

  core_range="0-$((cores - 1))"
  echo "=== $cores cores (taskset -c $core_range) ==="
  hyperfine "${HYPERFINE_ARGS[@]}" "taskset -c $core_range node bin/repomix.cjs"
  echo ""
done
