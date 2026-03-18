# Goal
Attempt improvements to the source code in the `src` folder without causing regressions in existing functionality.

* Performance tuning
* Memory usage reduction

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
