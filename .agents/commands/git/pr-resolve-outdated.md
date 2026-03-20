# Resolve and Hide Outdated Bot PR Comments

Clean up bot-generated PR comments by resolving addressed review threads and minimizing outdated comments.

## Target Bots

Only process comments authored by automated review bots:
- `claude[bot]`, `devin-ai-integration[bot]`, `coderabbitai[bot]`, `gemini-code-assist[bot]`
- `codecov[bot]`, `cloudflare-workers-and-pages[bot]`, `cursor[bot]`
- GitHub Actions bots
- Other automated reviewers (login containing `[bot]` or `-integration`)

Do **NOT** touch comments from human reviewers.

## Steps

### 1. Identify the target PR

- If the user specifies a PR number, use that
- Otherwise, detect from the current branch: `gh pr view --json number,url`
- Get OWNER/REPO: `gh repo view --json owner,name --jq '.owner.login + "/" + .name'`

### 2. Fetch all PR comments

Fetch both review threads and regular issue comments in a single query where possible.

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
          comments(first: 20) {
            nodes { id body author { login } isMinimized }
          }
        }
      }
    }
  }
}'

# Regular issue comments (non-review)
gh api repos/OWNER/REPO/issues/NUM/comments \
  --jq '.[] | {id: .node_id, author: .user.login, body: .body}'
```

### 3. Classify each comment

For each bot comment that is **not already minimized**, determine its status.

Note: Review threads expose `isMinimized` in the GraphQL response. For regular issue comments fetched via REST, minimized comments are hidden by default, so returned comments are not yet minimized.

**Review threads (unresolved):**
- If `isOutdated: true` (GitHub sets this when the referenced code has been updated) → likely **addressed**
- Check the current code to see if the suggested fix or concern has been addressed
- If the relevant code has been changed/removed, or the concern no longer applies → mark as **addressed**
- If the code is unchanged and the concern is still valid → leave untouched

**Regular issue comments:**
A bot comment is **outdated** if any of the following apply:
- The same bot posted a newer version of the same type of comment (e.g., multiple review summaries → only keep the latest)
- The comment references code that has since been significantly changed
- The comment is an initial summary that has been superseded by a final review (e.g., coderabbit summary before APPROVED)

Skip comments that are still the latest/only comment from that bot, or contain still-relevant information.

### 4. Present plan and confirm with user

Before executing any mutations, present a summary table:

| Action | Target | Reason |
|--------|--------|--------|
| resolve + minimize | Thread PRRT_xxx (author) | fix confirmed in code |
| minimize (OUTDATED) | Comment IC_xxx (author) | superseded by newer review |
| skip | Comment IC_xxx (author) | still relevant |

Wait for user confirmation before proceeding.

### 5. Execute mutations

```bash
# Resolve addressed review threads
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "PRRT_xxx"}) {
    thread { isResolved }
  }
}'

# Minimize comments
# Use RESOLVED for addressed review thread comments
# Use OUTDATED for superseded or stale comments
gh api graphql -f query='
mutation {
  minimizeComment(input: {subjectId: "ID_xxx", classifier: OUTDATED}) {
    minimizedComment { isMinimized }
  }
}'
```

Available classifiers: `SPAM`, `ABUSE`, `OFF_TOPIC`, `OUTDATED`, `DUPLICATE`, `RESOLVED`

### 6. Report results

Summarize what was done:
- How many threads resolved
- How many comments minimized (by classifier)
- What was left untouched and why

## Important

- Never hide human comments
- Skip comments that are already minimized
- Keep the **latest** bot review if it contains still-relevant information
- Use `RESOLVED` for addressed review threads, `OUTDATED` for superseded comments
- When unsure if a comment is still relevant, leave it untouched and include it in the "skip" list for the user to decide
