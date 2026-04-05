---
description: Address PR review feedback — fetch comments, fix code, commit, push, and resolve threads
---

# Address PR Review Feedback

Fetch all PR comments, classify them, apply code fixes where needed, commit + push, then reply and resolve all threads (including outdated bot comments).

$ARGUMENTS

## Steps

### 1. Identify the target PR

- If the user specifies a PR number, use that
- Otherwise, detect from the current branch: `gh pr view --json number,url,headRefName,baseRefName`
- Get OWNER/REPO: `gh repo view --json owner,name --jq '.owner.login + "/" + .name'`

### 2. Fetch the PR diff and all comments

Run in parallel:

**PR diff:**
```bash
gh pr diff
```

**Review comments (inline):**
```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --paginate
```

**Issue comments (general):**
```bash
gh pr view {pr_number} --comments --json comments
```

**Review threads via GraphQL** (to check resolution status and outdated flags):
```bash
gh api graphql -f query='
query($threadCursor: String, $commentCursor: String) {
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: NUM) {
      reviewThreads(first: 100, after: $threadCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          isOutdated
          comments(first: 20) {
            nodes { id body author { login } path line isMinimized }
          }
        }
      }
      comments(first: 100, after: $commentCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          body
          author { login }
          isMinimized
        }
      }
    }
  }
}'
```

Each connection (`reviewThreads`, `comments`) paginates independently. If either `pageInfo.hasNextPage` is `true`, pass its `endCursor` as the corresponding cursor variable in subsequent requests.

### 3. Classify each comment

First, skip comments that need no processing:
- **Already resolved threads** (`isResolved: true`) → skip entirely
- **Already minimized** (`isMinimized: true`) → skip entirely
- **Your own comments** (from `claude` / the current actor) → skip entirely
- **Pure praise or acknowledgments** ("LGTM", "looks good", etc.) → skip entirely

#### 3a. Bot comments

Identify bot authors: login containing `[bot]` or `-integration` (e.g., `coderabbitai[bot]`, `gemini-code-assist[bot]`, `codecov[bot]`, `cloudflare-workers-and-pages[bot]`). Do **NOT** touch comments from human reviewers in this category.

| Category | Condition | Action |
|----------|-----------|--------|
| **Outdated bot thread** | `isOutdated: true`, or the referenced code has been changed/removed | Reply + resolve + minimize |
| **Superseded bot comment** | A newer version of the same type of comment exists from the same bot | Minimize with `OUTDATED` |
| **Still relevant bot** | Latest/only comment from that bot with still-relevant info | Leave untouched |

#### 3b. Review feedback (human + meaningful bot reviews)

| Category | Description | Action |
|----------|-------------|--------|
| **Fix** | Clear defects, bugs, security issues, incorrect logic | Must fix in code |
| **Improve** | Valid suggestions for better code quality, naming, structure | Fix unless it conflicts with project conventions |
| **Discuss** | Ambiguous feedback, design disagreements, scope questions | Do nothing — ask user at the end |
| **Skip** | Already addressed, out of scope, false positives, style nitpicks | Reply with reason + resolve (no code change) |

### 4. Present the plan

Before making any changes, show a summary table:

| # | Type | Category | File / Author | Comment (summary) | Planned Action |
|---|------|----------|---------------|-------------------|----------------|
| 1 | Review | Fix | src/foo.ts:42 | Missing null check | Add guard clause |
| 2 | Review | Improve | src/bar.ts:10 | Rename variable | Rename `x` → `count` |
| 3 | Review | Discuss | src/baz.ts:55 | Architecture concern | Ask user after all other work is done |
| 4 | Review | Skip | src/foo.ts:20 | Style preference | No action — matches conventions |
| 5 | Bot | Outdated | coderabbitai[bot] | Old review summary | Resolve + minimize |
| 6 | Bot | Superseded | codecov[bot] | Older coverage report | Minimize |

**Discuss** items are NOT shown to the user at this stage. Do not reply to or resolve them. They will be presented to the user at the very end (Step 9) after all other work is complete.

### 5. Apply code fixes

For each **Fix** and **Improve** item:

1. Read the relevant file and understand the surrounding context
2. Apply the minimal change that addresses the feedback
3. Do NOT refactor surrounding code or make unrelated improvements

### 6. Verify

```bash
npm run lint
npm run test
```

If any check fails, fix the regression before continuing. Repeat until all checks pass.

### 7. Commit and push

- Create a commit following the rules in CLAUDE.md
- Typical format: `fix(scope): Address PR review feedback`
- In the commit body, briefly list what was addressed
- Push to the current branch:
  ```bash
  git push
  ```

If there are no code changes (only bot cleanup), skip this step.

### 8. Reply to comments and resolve threads

**After push is confirmed**, process all classified comments.

#### 8a. Addressed review comments (Fix / Improve)

Reply indicating the fix, then resolve:

- "Addressed in `<commit_sha>` — `<brief description>`. 🤖"

#### 8b. Skipped review comments (no code change needed)

Reply with a brief reason, then resolve:

- **Already addressed**: "Already handled — this was fixed in `<commit or prior change>`. 🤖"
- **False positive**: "No action needed — `<brief explanation>`. 🤖"
- **Out of scope**: "Out of scope for this PR — tracked separately. 🤖"
- **Matches conventions**: "No action needed — this matches the project's existing conventions. 🤖"

#### 8c. Outdated bot threads

Reply with a brief reason, then resolve and minimize:

- "No longer applicable — the referenced code has been updated. 🤖"
- "Superseded — a newer review covers this. 🤖"

#### 8d. Superseded bot issue comments

Minimize with `OUTDATED` classifier. No reply needed for regular issue comments.

#### API reference

**Reply to inline review comments (REST):**
```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies \
  -f body="REPLY"
```

**Reply to review threads (GraphQL):**
```bash
gh api graphql -f query='
mutation {
  addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: "PRRT_xxx", body: "REPLY"}) {
    comment { id }
  }
}'
```

**Resolve review threads:**
```bash
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "PRRT_xxx"}) {
    thread { isResolved }
  }
}'
```

**Minimize comments:**
```bash
gh api graphql -f query='
mutation {
  minimizeComment(input: {subjectId: "ID_xxx", classifier: OUTDATED}) {
    minimizedComment { isMinimized }
  }
}'
```

Available classifiers: `SPAM`, `ABUSE`, `OFF_TOPIC`, `OUTDATED`, `DUPLICATE`, `RESOLVED`

### 9. Final report

Present a structured report to the user covering all processed comments.

#### ✅ Addressed (code changed)

List each comment that was fixed with a code change:

| # | File | Comment (summary) | What was done | Commit |
|---|------|-------------------|---------------|--------|
| 1 | src/foo.ts:42 | Missing null check | Added guard clause | `abc1234` |
| 2 | src/bar.ts:10 | Rename variable | Renamed `x` → `count` | `abc1234` |

#### ⏭️ No action needed (resolved with reason)

List each comment that was resolved without code changes, with the reason:

| # | File / Author | Comment (summary) | Reason |
|---|---------------|-------------------|--------|
| 1 | src/foo.ts:20 | Style preference | Matches project conventions |
| 2 | coderabbitai[bot] | Old review summary | Outdated — code was updated |
| 3 | codecov[bot] | Coverage report | Superseded by newer report |

#### 🔍 Needs your input

If there are **Discuss** items, present them with full context so the user can decide:

| # | File | Comment (full text or summary) | Assessment |
|---|------|-------------------------------|------------|
| 1 | src/baz.ts:55 | "Consider splitting this into..." | Valid concern but may be out of scope |

For each item, ask the user to choose:
- **Address** — make the code change (will trigger another commit + push cycle)
- **Skip** — reply with a reason and resolve the thread
- **Leave** — do nothing, let the user handle it manually

Do NOT reply to or resolve these threads until the user decides.

## Important

- Never modify code beyond what the review feedback asks for
- Never hide or resolve human comments without replying with a reason
- When a comment is ambiguous, ask the user rather than guessing
- Always verify with lint + test before pushing
- Always push before resolving threads — ensure changes are committed first
- Keep the **latest** bot review if it contains still-relevant information
- Keep commit messages descriptive of the actual changes
- If multiple comments suggest conflicting changes, present the conflict to the user
