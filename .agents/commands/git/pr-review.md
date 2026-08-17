---
allowed-tools: mcp__github_inline_comment__create_inline_comment,Bash(gh issue view:*),Bash(gh search:*),Bash(gh issue list:*),Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),Bash(gh pr list:*),Bash(gh api repos/*/pulls/*/comments:*),Bash(gh api repos/*/pulls/*/comments/*/replies:*)
description: Review a pull request
---

$ARGUMENTS

If REPO and PR_NUMBER are not provided above, use `gh pr view` to detect the current PR.

Skim the diff first (`gh pr diff`), then spawn only the reviewer agents relevant to what the PR touches, in parallel:

- reviewer-code-quality — any source code change
- reviewer-security — code touching child processes, file I/O, network, user input, config parsing, or CI/workflow files
- reviewer-performance — hot paths (file scanning, parsing, output generation) or algorithmic changes
- reviewer-test-coverage — any behavior change in `src/` (also catches missing tests)
- reviewer-conventions — new files, new/renamed APIs, or structural changes
- reviewer-holistic — multi-file changes affecting architecture, data flow, or user-facing behavior
- reviewer-cross-platform — path handling, glob patterns, shell/child-process usage, or file I/O where Windows/macOS/Linux behavior can diverge
- reviewer-docs-i18n — user-facing option or feature changes, changes to `src/config/configSchema.ts`, or any edits under `website/client/src/`

Selection bias: **when in doubt, spawn the agent** — a wasted agent costs little, a missed finding costs a lot. A substantial `src/` change usually warrants most of the list. Narrow PRs (docs/translation-only, dependency bumps, comment fixes, small config tweaks) need only the relevant subset; if none apply, review the diff directly yourself instead of spawning agents.

The agents do not pre-filter: they report everything they find with a severity and a confidence level, and **you are the filter**. After all agents report back, review their findings and keep only what you also deem noteworthy -- drop the low-confidence or low-severity ones unless you can confirm them against the code yourself. Be constructive and helpful in your feedback.

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
