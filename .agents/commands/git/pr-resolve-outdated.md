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

Fetch both review threads and regular issue comments in a single GraphQL query. Use two independent cursor variables for pagination.

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
            nodes { id body author { login } isMinimized }
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

Each connection (`reviewThreads`, `comments`) paginates independently. If either `pageInfo.hasNextPage` is `true`, pass its `endCursor` as the corresponding cursor variable (`$threadCursor` or `$commentCursor`) in subsequent requests. Repeat until both connections are fully fetched.

### 3. Classify each comment

First, filter out threads/comments that need no processing:
- **Already resolved** (`isResolved: true`) → skip entirely
- **Already minimized** (`isMinimized: true`) → skip entirely
- **Human authors** (login does NOT contain `[bot]` or `-integration`) → skip entirely

For each remaining bot comment, determine its status.

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

### 4. Execute mutations

Proceed directly without asking for confirmation. Before executing, log the planned actions as a summary table for transparency:

| Action | Target | Reason |
|--------|--------|--------|
| reply + resolve + minimize | Thread PRRT_xxx (author) | fix confirmed in code |
| minimize (OUTDATED) | Comment IC_xxx (author) | superseded by newer review |
| skip | Thread PRRT_xxx (author) | concern still valid |

#### 4a. Reply and resolve review threads

For each review thread classified as **addressed**, reply with a brief explanation of why it is no longer applicable, then resolve and minimize it.

**Reply to the thread** explaining why it is being resolved:

```bash
# Reply to the review thread with the reason
gh api graphql -f query='
mutation {
  addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: "PRRT_xxx", body: "REASON"}) {
    comment { id }
  }
}'
```

The reply should be concise (1-2 sentences) and specific. Always end with a `🤖` marker so it is clearly identifiable as an automated reply. Examples:
- "This has been addressed — the variable was renamed in commit abc1234. 🤖"
- "No longer applicable — the function was removed in a later refactor. 🤖"
- "Superseded — a newer review covers this concern. 🤖"

**Then resolve and minimize:**

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

#### 4b. Minimize outdated regular issue comments

For each regular issue comment classified as **outdated**, minimize it with the `OUTDATED` classifier. These comments do not have threads to resolve or reply to.

```bash
gh api graphql -f query='
mutation {
  minimizeComment(input: {subjectId: "IC_xxx", classifier: OUTDATED}) {
    minimizedComment { isMinimized }
  }
}'
```

### 5. Report results

Summarize what was done:
- How many threads resolved
- How many comments minimized (by classifier)
- What was left untouched and why

## Important

- Never hide human comments
- Keep the **latest** bot review if it contains still-relevant information
- Use `RESOLVED` for addressed review threads, `OUTDATED` for superseded comments
- When unsure if a comment is still relevant, leave it untouched and include it in the "skip" list for the user to decide
