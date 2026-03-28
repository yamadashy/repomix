---
description: Iterative review-and-fix loop
---

Repeat the following cycle on the current branch's changes against `main` (max 3 iterations):

1. **Review** — Spawn 6 review agents in parallel, each using the corresponding agent definition from `.agents/agents/`:
   - **review-code-quality**: Bugs, logic errors, edge cases, code smells
   - **review-security**: Vulnerabilities, injection risks, secret exposure, unsafe patterns
   - **review-performance**: Inefficiencies, resource leaks, unnecessary allocations
   - **review-test-coverage**: Missing tests, untested edge cases, test quality
   - **review-conventions**: Project conventions, naming, structure
   - **review-holistic**: Overall design concerns, side effects of changes, integration risks that individual agents may miss
   Each agent should only report noteworthy findings.
2. **Triage** — Review agent findings and keep only what you also deem noteworthy. Classify each as **Fix** (clear defects, must fix) or **Skip** (style, nitpicks, scope creep). Show a brief table before changing anything.
3. **Fix** only the "Fix" items. Keep changes minimal.
4. **Verify** with `npm run lint` and `npm run test`. Fix any regressions and repeat this step until all checks pass before continuing.
5. **Re-review** only the newly changed lines. Do not re-raise skipped items.

Stop when no "Fix" items remain or 3 iterations are reached. Print a summary of what was fixed and what was skipped.
