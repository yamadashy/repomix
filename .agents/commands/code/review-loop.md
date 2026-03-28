---
description: Iterative review-and-fix loop
---

Repeat the following cycle on the current branch's changes against `main` (max 3 iterations):

1. **Review** — Spawn 6 reviewer agents in parallel:
   - reviewer-code-quality
   - reviewer-security
   - reviewer-performance
   - reviewer-test-coverage
   - reviewer-conventions
   - reviewer-holistic
2. **Triage** — Review agent findings and keep only what you also deem noteworthy. Classify each as **Fix** (clear defects, must fix) or **Skip** (style, nitpicks, scope creep). Show a brief table before changing anything.
3. **Fix** only the "Fix" items. Keep changes minimal.
4. **Verify** with `npm run lint` and `npm run test`. Fix any regressions and repeat this step until all checks pass before continuing.
5. **Re-review** only the newly changed lines. Do not re-raise skipped items.

Stop when no "Fix" items remain or 3 iterations are reached. Print a summary of what was fixed and what was skipped.
