---
name: agent-carnet
description: "Use this skill when the user asks to save, recall, find, or organize notes. Triggers on: 'remember this', 'save this', 'note this', 'what did we discuss about...', 'check the notebook', 'find in carnet'. Also use proactively when discovering findings worth preserving across sessions."
---

# Agent Carnet

A tiny CLI that gives you a shared markdown notebook on disk under `.carnet/<category>/<slug>.md`. Notes have a 30-day default lifespan that resets every time they are read or applied; useful ones survive, stale ones drift to `.trash/` automatically.

## Quick reference

```bash
# Save (always pass --summary and --agent claude-code)
echo "body content" | agent-carnet save deps/iconv-issue \
  --summary "iconv-esm v0.7 types broken — pin to v0.6" \
  --agent claude-code \
  --tags compat,esm

# Recall
agent-carnet find iconv               # search summaries (does NOT bump lifespan)
agent-carnet list                     # category-grouped overview, sorted by last_used
agent-carnet list --sort use_count    # most-applied notes first
agent-carnet show deps/iconv-issue    # read full content (bumps last_used; weak use signal)

# Mark as actually applied (strong use signal — bumps last_used + use_count)
agent-carnet used deps/iconv-issue

# Maintain
agent-carnet move <from> <to>
agent-carnet rm <path> --yes
```

When unsure of a subcommand's full flag set, run `agent-carnet <command> -h` (e.g.
`agent-carnet save -h`, `agent-carnet used -h`). Each subcommand prints its own
focused help — required arguments, options, and examples — without invoking
filesystem operations.

## When to save

Save proactively when you discover something worth preserving across sessions:
- Research findings that took effort to derive
- Non-obvious patterns / gotchas in the codebase
- Solutions to tricky problems
- Architectural decisions and the reasoning behind them
- In-progress work that may be resumed later

## When to recall

Before starting related work or when context might exist:
- `agent-carnet find <topic>` — quick scan of summaries
- `agent-carnet list <category>` — browse a folder
- `agent-carnet show <path>` — actually read (resets `last_used`; only use when the content matters)

## When to call `used`

Call `agent-carnet used <path>` after a carnet **actually shaped your work**:
- You applied the recorded fix and it solved the bug.
- You consulted the carnet before retrying a hypothesis and skipped a dead-end.
- You used the canonical name from a `vocab` carnet in new code instead of inventing your own.

`used` increments `use_count` — a durable importance signal that survives across sessions and lets future readers (and `agent-carnet list --sort use_count`) surface load-bearing notes.

Reading a carnet does NOT count. `show` already keeps it alive (weak signal); `used` records that the note was worth keeping for a real reason (strong signal).

## Hard rules

- `--summary` is required. Make it decisive — reading the summary in isolation tells the next reader (or the next agent) whether to read further.
- `--agent claude-code` is required.
- `find` does NOT bump anything. `show` bumps `last_used`. `used` bumps `last_used` AND increments `use_count`.
- `updated` tracks content modification only (`save`, `save --update`). It is independent of `last_used` and is not the lifespan driver.
- The 30-day expiry is automatic — do not manually clean up. `keep: true` pins permanent notes.
- Auto-prune runs on every CLI invocation; deleted carnets land in `.carnet/.trash/` for 7 days before hard delete.

## Path conventions

- `<category>/<slug>` — kebab-case, no leading slash, no `..`.
- Categories are folders; create new ones freely as needed.
- Subcategories are allowed: `deps/esm/iconv-issue` works.

## When to read references/

This SKILL.md is enough for everyday note-keeping. Open the references/ files **only** when one of these specific cases applies — they are not always-on context, so do not load them speculatively.

| Read this file | When |
|---|---|
| `references/cookbook.md` | You are about to use (or are being asked about) a tag-based pattern such as `tags: [vocab]` for project terminology or `tags: [hypothesis]` for debugging dead-ends. The file shows the full pattern, including how to structure the body and `meta:` for that pattern. |
| `references/frontmatter.md` | You need to write or read the `meta:` extension namespace, set a non-trivial `lifespan` / `keep`, or understand why an unfamiliar frontmatter field is or is not preserved on save. |

If neither case applies, **do not read references/**. The base of this file already covers daily save/find/show/touch/move/rm flows.
