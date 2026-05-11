# Frontmatter reference

Every carnet starts with YAML frontmatter. The CLI manages a small number of fields itself; everything else is preserved untouched on round-trip, so tools and conventions can layer extra metadata on top.

Read this file when you are about to write or read the `meta:` namespace, set a non-trivial `lifespan` / `keep`, or wonder whether an unfamiliar frontmatter field will survive a CLI write.

## Schema

```yaml
---
# CLI-managed (you provide these on save; usage fields update via show / used)
summary: "one-line decisive description"   # required
agent: claude-code                         # required (e.g. claude-code, codex, cursor, human)
created: 2026-05-10                        # set on first save, immutable thereafter
updated: 2026-05-10                        # bumped on save / save --update (content modification)
last_used: 2026-05-10                      # bumped on save / show / used (drives expiry)
use_count: 7                               # incremented on `used` only (importance signal)

# Optional, CLI-known
tags: [compat, esm]                        # free-form labels; comma-separated on save
related:                                   # paths or other carnet paths this entry points at
  - src/core/file/encoding.ts
  - .carnet/deps/iconv-issue.md
lifespan: 90d                              # override default 30d; accepts 30d / 90d / 1y / never
keep: true                                 # pin against auto-prune (lifespan ignored)

# Optional, CLI-opaque
meta:                                      # free-form extension namespace; see "meta:" below
  <extension>:
    <key>: <value>
---
```

## The four CLI-managed dates / counters

`agent-carnet` deliberately separates *modification* from *usage* so each can be observed and sorted independently:

| Field | Bumped by | Means |
|---|---|---|
| `created` | `save` (first time only) | Birth date. Never changes. |
| `updated` | `save`, `save --update` | Last content modification. |
| `last_used` | `save`, `show`, `used` | Last interaction. Drives expiry: `expiry = last_used + lifespan`. |
| `use_count` | `used` (only) | How many times the carnet was explicitly applied. A reference signal of importance. |

`show` is a *weak* use signal — pulling the body into context counts as use enough to keep the lifespan alive but not enough to bump `use_count`. `used` is the *strong* signal — call it after the carnet actually shaped your work.

## CLI-managed vs preserved fields

The CLI rewrites only the fields it knows about: `summary`, `agent`, `created`, `updated`, `last_used`, `use_count`, `tags`, `related`, `lifespan`, `keep`. On `save --update`, every other top-level frontmatter key is round-tripped untouched — including `meta:` and any custom keys an external tool may have added.

This is the foundation of the extension model: as long as you stay outside the CLI-managed names, your fields survive every CLI write.

## `meta:` extension namespace

`meta:` is a deliberate place for structured data the CLI itself does not interpret but downstream consumers can act on (an Obsidian plugin, a sibling agent, your own script, the cookbook patterns).

**Conventions**:

- **Namespace your keys under the convention name**: `meta.vocab.*`, `meta.hypothesis.*`, `meta.<your-tag>.*`. This avoids collisions between independent extensions.
- Keep the values primitive when possible (strings, numbers, lists of strings). Anything more complex should probably live in the body where humans will actually read it.
- The CLI has no `--meta` flag (yet). To set or change `meta:`, edit the carnet file directly after `save`, or have your tool write the file. The next CLI write (`save --update`, `touch`, `show`) preserves your edits.

**Reading `meta:` from another tool**: parse the file with any YAML frontmatter parser (`gray-matter`, `js-yaml` with manual frontmatter split, etc.). The CLI does not require any specific tooling on the read side.

**Examples by convention**:

```yaml
meta:
  vocab:
    canonical: staging adapter
    aliases: [proxy layer, forward middleware]
```

```yaml
meta:
  hypothesis:
    status: debunked          # pending | confirmed | debunked
    last_tested: 2026-04-30
```

## `lifespan`

Accepts duration strings via `parse-duration`:

- `30d`, `7d`, `12h` — relative durations
- `1y`, `6mo`, `2w` — longer units
- `never` — pin against auto-prune (equivalent to `keep: true`)

If both `keep: true` and `lifespan: <duration>` are set, `keep: true` wins — the carnet is never auto-pruned regardless of the duration.

Setting `lifespan` is appropriate when a category of notes naturally lives longer or shorter than the 30-day default (e.g. `1y` for stable architectural decisions, `7d` for sprint-scoped notes).

## `keep`

`keep: true` pins a carnet against auto-prune indefinitely. Use sparingly — it defeats the "safe to forget" model. Typical uses:

- Project-level reference docs that should not decay
- Long-running design decisions whose context is needed indefinitely
- Personal style or persona files

`keep: false` is the same as omitting `keep:` (the default).

## `related`

`related:` accepts a list of strings. There is no enforced format; common conventions:

- File paths relative to the project root: `src/core/file/encoding.ts`
- Other carnet paths: `.carnet/<category>/<slug>.md`
- URLs: `https://github.com/.../issues/363`

The CLI does not validate that the targets exist or follow them. They are documentation, not links the CLI traverses.

## What NOT to add

- **A `status:` field at the top level**. There is no place for it in the schema. If you need a debugging status, use `tags: [hypothesis:debunked]` or the `meta.hypothesis.status` convention.
- **A new top-level field for structured data**. Use `meta.<extension>.*` instead so it composes with everything else.
- **Multi-line `summary:`**. Keep it on one line — listing and search UI assume that.

## Frontmatter parse errors

If a carnet's frontmatter fails to parse (invalid YAML, mismatched delimiters), the CLI exits with `frontmatter_error` and points at the offending file. Fix it by editing the file directly; the CLI will not attempt automatic repair.
