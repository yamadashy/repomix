---
allowed-tools: mcp__github_inline_comment__create_inline_comment,Bash(gh issue view:*),Bash(gh search:*),Bash(gh issue list:*),Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),Bash(gh pr list:*)
description: Review a pull request
---

$ARGUMENTS

If REPO and PR_NUMBER are not provided above, use `gh pr view` to detect the current PR.

Please review this pull request and provide feedback on:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Test coverage

Perform a premortem analysis: identify potential failure scenarios (e.g., edge cases, integration issues, deployment risks) and suggest mitigations.

Use the repository's CLAUDE.md for guidance on style and conventions. Be constructive and helpful in your feedback.

## How to Comment:
1. Before starting your review, read ALL existing comments on this PR using `gh pr view --comments` to see the full conversation
2. If there are any previous comments from you (Claude), identify what feedback you've already provided
3. Only provide NEW feedback that hasn't been mentioned yet, or updates to previous feedback if the code has changed
4. Avoid repeating feedback that has already been given - focus on providing incremental value with each review
5. For highlighting specific code issues, use `mcp__github_inline_comment__create_inline_comment` to leave inline comments
   - When possible, provide actionable fix suggestions with code examples
6. Use `gh pr comment` with your Bash tool to leave your overall review as a comment on the PR
7. Wrap detailed feedback in <details><summary>Details</summary>...</details> tags, keeping only a brief summary visible
