# Goal
Improve performance or reduce memory consumption of `src`, `website/server`, and related code (tests, configs, dependencies) without causing regressions.

Think broadly — algorithm changes, architectural restructuring, parallelization, caching strategies, library replacements, dependency upgrades, I/O reduction, peak memory reduction, memory leak fixes, and startup time reduction are all fair game. Small logic tweaks that only shave a few milliseconds on a 1000-file run are not worth pursuing. Aim for changes with meaningful, measurable impact.

# Steps

## Investigation & Planning

First, define 5 non-overlapping investigation scopes — partition by directory boundaries, cross-cutting concerns (I/O, memory, parallelism, algorithmic complexity, dependency weight), or pipeline stages. Then spawn 5 agents in parallel, assigning each agent exactly one scope with an explicit description of what it covers. After all agents report back, synthesize findings and form an improvement plan.
Even if multiple improvements are identified, scope the work to what fits in a single PR — focus on the highest-impact change only.

## Implementation

Implement the plan.

## PR

Only create a PR if the improvement is definitively confirmed.

Do not create a PR if the benefit is uncertain or marginal.

# Rules

Always run benchmarks and confirm through measurement that the change is a genuine improvement before creating a PR.
Include the benchmark results in the PR description.
