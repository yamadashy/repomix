# Goal
Improve performance or memory usage of the source code in the `src` folder without causing regressions.

Think broadly — algorithm changes, architectural restructuring, parallelization, caching strategies, dependency replacements, and I/O reduction are all fair game. Small logic tweaks that only shave a few milliseconds on a 1000-file run are not worth pursuing. Aim for changes with meaningful, measurable impact.

# Steps

## Investigation & Planning

Spawn an agent team to investigate efficiently and thoroughly, then form an improvement plan.
Even if multiple improvements are identified, scope the work to what fits in a single PR — focus on the highest-impact change only.

## Implementation

Implement the plan.

## PR

Only create a PR if the improvement is definitively confirmed.

Do not create a PR if the benefit is uncertain or marginal.

# Rules

Always run benchmarks and confirm through measurement that the change is a genuine improvement before creating a PR.
Include the benchmark results in the PR description.
