# Cookbook patterns

These are tag-based conventions that compose with the existing CLI — no new commands, no special folders. Each pattern uses `tags:` and (optionally) `meta:` to give a carnet additional structure that downstream tools or future agents can recognize.

Read this file when you are about to write or read a carnet that follows one of these patterns. Do not read it for plain note-taking — the base SKILL.md is enough there.

## Vocabulary alignment

**Use when**: multiple agents (or a human plus an agent) keep inventing different names for the same concept across a project. Examples: "staging adapter" vs "proxy layer" vs "forward middleware" all referring to the same module.

**Pattern**: one carnet per term, tagged `vocab`. The `meta.vocab.*` subtree carries machine-actionable data (canonical name, aliases) that other agents or tools can read; the body explains the *why* in narrative form.

```yaml
---
summary: "staging adapter — the thin proxy in front of POST /v1/stage"
agent: claude-code
tags: [vocab]
related:
  - .carnet/vocab/payload-envelope.md
  - src/staging/adapter.ts
meta:
  vocab:
    canonical: staging adapter
    aliases:
      - proxy layer
      - forward middleware
      - request shim
---

# staging adapter

## Definition
The thin proxy that fronts the production gateway and reshapes incoming
requests into the `payload-envelope` format. Nothing more.

## Why this name
"proxy" is overloaded; "middleware" collides with the Express concept.
"staging adapter" leaves no doubt about which layer is meant.
```

**Agent flow**:

1. Before naming a new concept, scan for an existing canonical name:
   ```bash
   agent-carnet find <candidate> --in tags
   agent-carnet find <candidate> --in body
   ```
   If a vocab carnet exists, adopt that name (use it in code, in PR descriptions, in further carnets).
2. If a name wins out as canonical, save once with the convention above. Reference it from related code or other carnets via `related:`.
3. Refresh-on-use does the rest. Synonyms that keep getting cited stay alive; ones that nobody invokes drift to `.trash/` automatically.

## Hypothesis ledger

**Use when**: long debugging sessions keep producing dead-ends ("X tried, didn't work because Y") and you (or the next agent) keep re-deriving the same negative knowledge. Vector search and `CLAUDE.md` skim well for "what worked"; they're worse at "what was already tried and ruled out".

**Pattern**: one carnet per hypothesis, tagged `hypothesis`. The body holds the actual reasoning (Hypothesis / Tests / Verdict). `meta.hypothesis.*` carries structured status that another tool or agent can act on without re-reading the body.

```yaml
---
summary: "iconv-lite v0.7 esm import path — types broken upstream"
agent: claude-code
tags: [hypothesis]
related:
  - https://github.com/pillarjs/iconv-lite/issues/363
meta:
  hypothesis:
    status: debunked
    last_tested: 2026-04-30
---

## Hypothesis
Switching to esm imports should let us run `iconv-lite` on Node 22
(v0.7 advertises ESM support).

## Tests
1. `npm install iconv-lite@0.7.1` → type error (`Cannot find module declaration`).
2. Set `tsconfig.moduleResolution` to `bundler` → same error.
3. Inspected v0.7.1 source → broken `package.json#exports` types.

## Verdict
Pin to `v0.6.3`. The whole v0.7 series is broken upstream (Issue #363).
Wait for v0.8 before retrying.
```

**Agent flow**:

1. Before exploring a new theory, scan for prior hypotheses on the same area:
   ```bash
   agent-carnet find <symptom> --in all
   agent-carnet find <library> --in tags
   ```
   If a debunked hypothesis exists, the body already has the verdict. Move on.
2. After ruling something out, save the carnet. Use one of these statuses in `meta.hypothesis.status`:
   - `pending` — actively being tested
   - `confirmed` — held up
   - `debunked` — ruled out
3. Refresh-on-use turns staleness into signal: a debunked hypothesis nobody has needed in 30 days drops to `.trash/`. The ones that *do* keep getting cited are the load-bearing "do not retry" entries.

## Adding new patterns

The same shape applies to any new convention. Pick a tag name, optionally namespace structured data under `meta.<your-tag>.*`, and let the body do the rest. The CLI doesn't need to know about the pattern — `find` and `show` work the same way regardless of which tags a carnet carries.

When inventing a new pattern locally, keep it documented in the project's own carnet (e.g. a `vocab/` entry whose canonical name is the pattern itself) so future agents can discover it the same way they discover any other convention.
