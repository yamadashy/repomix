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
# All core counts are run in a single hyperfine invocation for comparison.
#
# Requirements: hyperfine, taskset (util-linux), nproc (coreutils)
# Note: taskset pins to logical CPUs. On SMT/HT systems, N logical cores
# may not correspond to N physical cores.

set -euo pipefail

# Preflight checks
for cmd in taskset hyperfine nproc; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd not found. This script requires Linux with util-linux and hyperfine." >&2
    exit 1
  fi
done

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
    if [[ ! "$arg" =~ ^[1-9][0-9]*$ ]]; then
      echo "Error: Core count must be a positive integer: $arg" >&2
      exit 1
    fi
    CORE_COUNTS+=("$arg")
  else
    HYPERFINE_ARGS+=("$arg")
  fi
done

# Default core counts if none specified
if [ ${#CORE_COUNTS[@]} -eq 0 ]; then
  for c in 2 4 8; do
    if [ "$c" -lt "$TOTAL_CORES" ]; then
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

# Build a single hyperfine invocation with --command-name for comparison
HYPERFINE_COMMANDS=()
for cores in "${CORE_COUNTS[@]}"; do
  if [ "$cores" -gt "$TOTAL_CORES" ]; then
    echo "Skipping $cores cores (only $TOTAL_CORES available)"
    continue
  fi

  core_range="0-$((cores - 1))"
  HYPERFINE_COMMANDS+=("--command-name" "$cores cores" "taskset -c $core_range node bin/repomix.cjs")
done

if [ ${#HYPERFINE_COMMANDS[@]} -gt 0 ]; then
  hyperfine "${HYPERFINE_ARGS[@]}" "${HYPERFINE_COMMANDS[@]}"
fi
