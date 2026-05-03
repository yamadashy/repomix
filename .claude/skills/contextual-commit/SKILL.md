---
name: contextual-commit
description: >-
  Write contextual commits that capture intent, decisions, and constraints
  alongside code changes. Use when committing code, finishing a task, or
  when the user asks to commit. Extends Conventional Commits with structured
  action lines in the commit body that preserve WHY code was written, not
  just WHAT changed.
license: MIT
metadata:
  internal: true
---

# Contextual Commits

You write commits that carry development reasoning in the body — the intent, decisions, constraints, and learnings that the diff alone cannot show.

## The Problem You Solve

Standard commits preserve WHAT changed. The diff shows that too. What gets lost is WHY — what the user asked for, what alternatives were considered, what constraints shaped the implementation, what was learned along the way. This context evaporates when the session ends. You prevent that.

## Commit Format

The subject line is a standard Conventional Commit. The body contains **action lines** — typed, scoped entries that capture reasoning.

```
type(scope): subject line (standard conventional commit)

action-type(scope): description of reasoning or context
action-type(scope): another entry
```

### Subject Line

Follow Conventional Commits exactly. Nothing changes here:
- `feat(auth): implement Google OAuth provider`
- `fix(payments): handle currency rounding edge case`
- `refactor(notifications): extract digest scheduling logic`

### Action Lines

Each line in the body follows: `action-type(scope): description`

**scope** is a human-readable concept label — the domain area, module, or concern. Examples: `auth`, `payment-flow`, `oauth-library`, `session-store`, `api-contracts`. Use whatever is meaningful in this project's vocabulary. Keep scopes consistent across commits when referring to the same concept.

## Action Types

Use only the types that apply. Most commits need 1-3 action lines. Never pad with noise.

### `intent(scope): ...`
What the user wanted to achieve and why. Captures the human's voice, not your interpretation.

- `intent(auth): social login starting with Google, then GitHub and Apple`
- `intent(notifications): users want batch notifications instead of per-event emails`
- `intent(payment-flow): must support EUR and GBP alongside USD for enterprise clients`

**When to use:** Most feature work, refactoring with a purpose, any change where the motivation isn't obvious from the subject line.

### `decision(scope): ...`
What approach was chosen when alternatives existed. Brief reasoning.

- `decision(oauth-library): passport.js over auth0-sdk for multi-provider flexibility`
- `decision(digest-schedule): weekly on Monday 9am, not daily — matches user research`
- `decision(currency-handling): per-transaction currency over account-level default`

**When to use:** When you evaluated options. Skip for obvious choices with no real alternatives.

### `rejected(scope): ...`
What was considered and explicitly discarded, with the reason. This is the highest-value action type — it prevents future sessions from re-proposing the same thing.

- `rejected(oauth-library): auth0-sdk — locks into their session model, incompatible with redis store`
- `rejected(currency-handling): account-level default — too limiting for marketplace sellers`
- `rejected(money-library): accounting.js — lacks support for sub-unit (cents) arithmetic`

**When to use:** Every time you or the user considered a meaningful alternative and chose not to pursue it. Always include the reason.

### `constraint(scope): ...`
Hard limits, dependencies, or boundaries discovered during implementation that shaped the approach.

- `constraint(callback-routes): must follow /api/auth/callback/:provider pattern per existing convention`
- `constraint(stripe-integration): currency required at PaymentIntent creation, cannot change after`
- `constraint(session-store): redis 24h TTL means tokens must refresh within that window`

**When to use:** When non-obvious limitations influenced the implementation. Things the next person working here would need to know.

### `learned(scope): ...`
Something discovered during implementation that would save time in future sessions. API quirks, undocumented behavior, performance characteristics.

- `learned(passport-google): requires explicit offline_access scope for refresh tokens, undocumented in quickstart`
- `learned(stripe-multicurrency): presentment currency and settlement currency are different concepts`
- `learned(exchange-rates): Stripe handles conversion — do NOT store our own rates`

**When to use:** "I wish I'd known this before I started" moments. Library gotchas, API surprises, non-obvious behaviors.


## Before You Write the Commit

Determine the commit scope, then compose action lines:

1. **Check for staged changes first** — run `git diff --cached --stat`.
   - **If staged changes exist:** these are the commit scope. Do not consider unstaged or untracked files — the user has already expressed what belongs in this commit by staging it.
   - **If nothing is staged:** consider all unstaged modifications and untracked files as candidates. Use session context and the diff to decide what to stage and commit.
2. **Identify what you have session context for** — changes you produced, discussed, or observed reasoning for during this conversation.
3. **Identify what you don't** — files or changes from a prior session, another agent, or manual edits outside this conversation.
4. **Write action lines accordingly:**
   - For changes you have context for: full action lines from session knowledge.
   - For changes you don't: apply the "When You Lack Conversation Context" rules below — write only what the diff evidences.

The commit message must account for ALL changes in the commit scope, not just the ones you worked on. Ignoring changes you didn't produce is worse than writing thin action lines for them.

## Examples

### Simple fix — no action lines needed

```
fix(button): correct alignment on mobile viewport
```

The conventional commit subject is sufficient. Don't add noise.

### Moderate feature

```
feat(notifications): add email digest for weekly summaries

intent(notifications): users want batch notifications instead of per-event emails
decision(digest-schedule): weekly on Monday 9am — matches user research feedback
constraint(email-provider): SendGrid batch API limited to 1000 recipients per call
```

### Complex architectural change

```
refactor(payments): migrate from single to multi-currency support

intent(payments): enterprise customers need EUR and GBP alongside USD
intent(payment-architecture): must be backward compatible, existing USD flows unchanged
decision(currency-handling): per-transaction currency over account-level default
rejected(currency-handling): account-level default too limiting for marketplace sellers
rejected(money-library): accounting.js — lacks sub-unit arithmetic, using currency.js instead
constraint(stripe-integration): Stripe requires currency at PaymentIntent creation, cannot change after
constraint(database-migration): existing amount columns need companion currency columns, not replacement
learned(stripe-multicurrency): presentment currency vs settlement currency are different Stripe concepts
learned(exchange-rates): Stripe handles conversion, we should NOT store our own rates
```

### Mid-implementation pivot

When intent changes during work, capture it on the commit where the pivot happens:

```
refactor(auth): switch from session-based to JWT tokens

intent(auth): original session approach incompatible with redis cluster setup
rejected(auth-sessions): redis cluster doesn't support session stickiness needed by passport sessions
decision(auth-tokens): JWT with short expiry + refresh token pattern
learned(redis-cluster): session affinity requires sticky sessions at load balancer level — too invasive
```

## When You Lack Conversation Context

Sometimes staged changes include work you didn't produce in this session — prior session output, another agent's changes, pasted code, externally generated files, or manual edits. For any change where you lack the reasoning trail:

**Only write action lines for what is clearly evidenced in the diff.** Do not speculate about intent or constraints you cannot observe.

What you CAN infer from a diff alone:
- `decision(scope)` — if a clear technical choice is visible (new dependency added, pattern adopted, library switched). Example: `decision(http-client): switched from axios to native fetch` is visible from the diff.

What you CANNOT infer — do not fabricate:
- `intent(scope)` — why the change was made is not in the diff. Don't restate what the diff shows.
- `rejected(scope)` — what was NOT chosen is invisible in what WAS committed.
- `constraint(scope)` — hard limits are almost never visible in code changes.
- `learned(scope)` — learnings come from the process, not the output.

**A clean conventional commit subject with no action lines is always better than fabricated context.**

## Git Workflows

Contextual commits work with every standard git workflow. No special handling needed.

- **Regular merges:** Commit bodies preserved intact.
- **Squash merges:** All commit bodies concatenated into the squash commit body. The result is a chronological trail of typed, scoped action lines — agents parse, filter, and group these without issue.
- **Rebase and cherry-pick:** Commit bodies preserved.

## Rules

1. **The subject line is a Conventional Commit.** Never break existing conventions or tooling.
2. **Action lines go in the body only.** Never in the subject line.
3. **Only write action lines that carry signal.** If the diff already explains it, don't repeat it. If there was nothing to decide, reject, or discover, write no action lines.
4. **Be concise but complete.** Each action line should be a single clear statement. No artificial length limits, but don't write essays either.
5. **Use consistent scopes within a project.** If you called it `auth` in one commit, don't call it `authentication` in the next.
6. **Capture the user's intent in their words.** For `intent` lines, reflect what the human asked for, not your implementation summary.
7. **Always explain why for `rejected` lines.** A rejection without a reason is useless — the next agent will just re-propose it.
8. **Don't invent action lines for trivial commits.** A typo fix, a dependency bump, a formatting change — the conventional commit subject is enough.
9. **Don't fabricate context you don't have.** If you weren't part of the reasoning, don't pretend you were. See "When You Lack Conversation Context" above.
