# Resolve and Hide Outdated Bot PR Comments

Clean up bot-generated PR comments by resolving addressed review threads and minimizing outdated comments.

## Target Bots

Only process comments from automated review bots:
- `claude[bot]`, `devin-ai-integration[bot]`, `coderabbitai[bot]`, `gemini-code-assist[bot]`
- `codecov[bot]`, `cloudflare-workers-and-pages[bot]`, `cursor[bot]`
- GitHub Actions bots
- Other automated reviewers

Do **NOT** touch comments from human reviewers.

## Steps

### 1. Fetch PR data

Get all review threads and issue comments for the target PR.

```bash
# Review threads with resolution status
gh api graphql -f query='
query {
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: NUM) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          comments(first: 5) {
            nodes { id body author { login } isMinimized }
          }
        }
      }
    }
  }
}'

# Regular issue comments
gh api repos/OWNER/REPO/issues/NUM/comments \
  --jq '.[] | {id: .node_id, author: .user.login, body: .body[:150]}'
```

### 2. Resolve addressed review threads

For **unresolved** bot review threads, check if the issue has been addressed in the current code. If addressed or no longer relevant, resolve the thread.

```bash
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "PRRT_xxx"}) {
    thread { isResolved }
  }
}'
```

### 3. Minimize outdated comments

Minimize bot comments that are **outdated or superseded**:
- Resolved review thread comments → classifier: `RESOLVED`
- Superseded review comments (e.g., earlier bot reviews replaced by newer ones) → classifier: `OUTDATED`
- Bot summary comments that are no longer current → classifier: `OUTDATED`

```bash
gh api graphql -f query='
mutation {
  minimizeComment(input: {subjectId: "ID_xxx", classifier: OUTDATED}) {
    minimizedComment { isMinimized }
  }
}'
```

Available classifiers: `SPAM`, `ABUSE`, `OFF_TOPIC`, `OUTDATED`, `DUPLICATE`, `RESOLVED`

### 4. Report results

Summarize what was done:
- How many threads resolved
- How many comments minimized
- What was left untouched and why

## Important

- Only target bot-generated comments — never hide human comments
- Keep the **latest** bot review if it contains still-relevant information
- Use appropriate classifier (`RESOLVED` for addressed threads, `OUTDATED` for superseded comments)
- When unsure if a comment is still relevant, leave it untouched and ask the user
