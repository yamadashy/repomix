---
allowed-tools: mcp__github_inline_comment__create_inline_comment,Bash(gh issue view:*),Bash(gh search:*),Bash(gh issue list:*),Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),Bash(gh pr list:*),Bash(gh api repos/*/pulls/*/comments:*),Bash(gh api repos/*/pulls/*/comments/*/replies:*)
description: Review a pull request
---

$ARGUMENTS

If REPO and PR_NUMBER are not provided above, use `gh pr view` to detect the current PR.

Spawn 6 review agents in parallel, each using the corresponding agent definition from `.agents/agents/`:
- **review-code-quality**: Bugs, logic errors, edge cases, code smells
- **review-security**: Vulnerabilities, injection risks, secret exposure, unsafe patterns
- **review-performance**: Inefficiencies, resource leaks, unnecessary allocations
- **review-test-coverage**: Missing tests, untested edge cases, test quality
- **review-conventions**: Project conventions, naming, structure
- **review-holistic**: Overall design concerns, side effects, integration risks, and premortem analysis

Each agent should only report noteworthy findings. After all agents report back, review their findings and keep only what you also deem noteworthy. Be constructive and helpful in your feedback.

## AI Bot Inline Comment Evaluation

Before spawning review agents, evaluate existing AI bot inline review comments to reduce the maintainer's cognitive load:

1. **Fetch inline review comments**:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments
   ```

2. **Filter bot inline comments**:
   - Only evaluate comments where `user.type === "Bot"` and `path` field is not null (inline comments only)
   - **SKIP comments from `claude`** - do not respond to Claude's own comments
   - **SKIP if Claude already replied** - for each bot comment, check if any comment exists where `user.login` contains `claude` and `in_reply_to_id` matches the bot comment's `id`
   - Target bots: `gemini-code-assist[bot]`, `coderabbitai[bot]`, etc.

3. **Judge priority for each inline comment**:
   - **Required**: Security issues, clear bugs, potential crashes, critical logic errors
   - **Recommended**: Code quality improvements, best practice violations, maintainability concerns
   - **Not needed**: Style suggestions, false positives, already addressed in code, out of scope for this PR

4. **Reply to each bot inline comment** with your judgment (in English):
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies -f body="\`Priority: {Required/Recommended/Not needed}\`\n\n{Brief explanation of your judgment}"
   ```

5. **If clarification is needed**, ask in the reply:
   ```
   `Priority: Recommended`

   This suggestion appears valid, but I need clarification: Is this pattern used elsewhere in the codebase?
   ```

6. **Comment format examples**:
   ```
   `Priority: Required`

   This is a valid security concern. The input should be sanitized to prevent injection attacks.
   ```

   ```
   `Priority: Not needed`

   This is a false positive. The suggested change would actually break the existing API contract.
   ```

   ```
   `Priority: Recommended`

   Good refactoring suggestion. However, this is out of scope for the current PR. Consider creating a separate issue.
   ```

## How to Comment:
1. Before starting your review, read ALL existing comments on this PR using `gh pr view --comments` to see the full conversation
2. If there are any previous comments from you (Claude), identify what feedback you've already provided
3. Only provide NEW feedback that hasn't been mentioned yet, or updates to previous feedback if the code has changed
4. Avoid repeating feedback that has already been given - focus on providing incremental value with each review
5. **Evaluate AI bot inline comments and reply with priority judgment** (see above section)
6. For highlighting specific code issues, use `mcp__github_inline_comment__create_inline_comment` to leave inline comments
   - When possible, provide actionable fix suggestions with code examples
7. Use `gh pr comment` with your Bash tool to leave your overall review as a comment on the PR
8. Wrap detailed feedback in <details><summary>Details</summary>...</details> tags, keeping only a brief summary visible
