---
name: memory
description: "Use this skill when the user asks to save notes, remember information, recall knowledge, or organize memories. Also use proactively when you discover valuable findings worth preserving."
---

# Agent Memory

A persistent memory space for storing knowledge that survives across conversations.

**Location:** `.claude/skills/memory/memories/`

## When to Use

### Proactive (Agent-initiated)

Save memories when you discover something worth preserving:
- Research findings that took effort to uncover
- Non-obvious patterns or gotchas in the codebase
- Solutions to tricky problems
- Architectural decisions and their rationale

Check memories when starting related work:
- Before investigating a problem area
- When working on a feature you've touched before

### Reactive (User-initiated)

When the user asks to save, remember, or recall something.

## Operations

### Save

```bash
# Create or update a memory file
echo "content" > .claude/skills/memory/memories/filename.md
```

Keep it simple. A memory can be as minimal as:

```markdown
# Problem X Solution

The fix was Y because Z.

Related: `src/path/file.ts:123`
```

Or more structured when needed:

```markdown
---
created: 2025-01-15
tags: [performance, worker]
---

# Worker Thread Analysis

## Findings
...

## Recommendations
...
```

### Recall

```bash
# List all memories
fd . .claude/skills/memory/memories/ --type f --exclude .gitignore

# Search by content
rg "<query>" .claude/skills/memory/memories/
```

### Maintain

- Update memories when information changes
- Delete memories that are no longer relevant
- Consolidate related memories when they grow

## Suggested Structure

```text
memories/
├── research/         # Investigation results
├── decisions/        # Architecture choices
├── troubleshooting/  # Problem-solution pairs
└── (any structure that makes sense)
```

Structure is flexible. Organize as needed.

## Guidelines

1. **Write for your future self**: Include enough context to be useful later
2. **Keep it searchable**: Use clear titles and relevant keywords
3. **Stay current**: Update or delete outdated information
4. **Be practical**: Save what's actually useful, not everything
