---
description: Iterative review-and-fix loop
---

Repeat the following cycle on the current working changes (max 3 iterations):

1. **Review** the current diff for bugs, security issues, logic errors, and convention violations.
2. **Triage** each finding as **Fix** (clear defects, must fix) or **Skip** (style, nitpicks, scope creep). Show a brief table before changing anything.
3. **Fix** only the "Fix" items. Keep changes minimal.
4. **Verify** with `npm run lint` and `npm run test`.
5. **Re-review** only the newly changed lines. Do not re-raise skipped items.

Stop when no "Fix" items remain or 3 iterations are reached. Print a summary of what was fixed and what was skipped.
