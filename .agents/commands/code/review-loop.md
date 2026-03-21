---
description: Iterative review-and-fix loop
---

Repeat the following cycle on the current branch's changes against `main` (max 3 iterations):

1. **Review** — Spawn 5 agents in parallel, each reviewing the current diff from a different angle:
   - **Agent 1 — Correctness**: Bugs, logic errors, edge cases, regressions
   - **Agent 2 — Security**: Vulnerabilities, injection risks, secret exposure, unsafe patterns
   - **Agent 3 — Performance**: Inefficiencies, resource leaks, unnecessary allocations
   - **Agent 4 — Conventions**: Project conventions (.agents/rules/base.md), naming, structure, test coverage
   - **Agent 5 — Free review**: Anything else worth flagging that the other agents may have missed
2. **Triage** — Merge all agent findings and classify each as **Fix** (clear defects, must fix) or **Skip** (style, nitpicks, scope creep). Show a brief table before changing anything.
3. **Fix** only the "Fix" items. Keep changes minimal.
4. **Verify** with `npm run lint` and `npm run test`. Fix any regressions and repeat this step until all checks pass before continuing.
5. **Re-review** only the newly changed lines. Do not re-raise skipped items.

Stop when no "Fix" items remain or 3 iterations are reached. Print a summary of what was fixed and what was skipped.
