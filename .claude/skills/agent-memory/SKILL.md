---
name: agent-memory
description: "Use this skill when the user asks to save, remember, recall, or organize memories. Triggers on: 'remember this', 'save this', 'note this', 'what did we discuss about...', 'check your notes', 'clean up memories'. Also use proactively when discovering valuable findings worth preserving."
---

# Agent Memory

A persistent memory space for storing knowledge that survives across conversations.

**Location:** `.claude/skills/agent-memory/memories/`

## Proactive Usage

Save memories when you discover something worth preserving:
- Research findings that took effort to uncover
- Non-obvious patterns or gotchas in the codebase
- Solutions to tricky problems
- Architectural decisions and their rationale

Check memories when starting related work:
- Before investigating a problem area
- When working on a feature you've touched before

Organize memories when needed:
- Consolidate scattered memories on the same topic
- Remove outdated or superseded information

## Folder Structure

When possible, organize memories into category folders. No predefined structure - create categories that make sense for the content.

Guidelines:
- Use kebab-case for folder names
- Consolidate or reorganize as the knowledge base evolves

Example:
```text
memories/
├── file-processing/
│   └── large-file-memory-issue.md
├── dependencies/
│   └── iconv-esm-problem.md
└── project-context/
    └── december-2025-work.md
```

This is just an example. Structure freely based on actual content.

## Frontmatter

All memories must include frontmatter with a `summary` field. The summary should be concise enough to determine whether to read the full content.

**Required:**
```yaml
---
summary: "1-2 line description of what this memory contains"
created: 2025-01-15
---
```

**Optional:**
```yaml
---
summary: "Worker thread memory leak during large file processing - cause and solution"
created: 2025-01-15
updated: 2025-01-20
tags: [performance, worker, memory-leak]
related: [src/core/file/fileProcessor.ts]
---
```

## Search Workflow

Use summary-first approach to efficiently find relevant memories:

```bash
# 1. List categories
ls .claude/skills/agent-memory/memories/

# 2. View all summaries
rg "^summary:" .claude/skills/agent-memory/memories/ --no-ignore --hidden

# 3. Search summaries for keyword
rg "^summary:.*keyword" .claude/skills/agent-memory/memories/ --no-ignore --hidden -i

# 4. Read specific memory file if relevant
```

**Note:** Memory files are gitignored, so use `--no-ignore` and `--hidden` flags with ripgrep.

## Operations

### Save

1. Determine appropriate category for the content
2. Check if existing category fits, or create new one
3. Write file with required frontmatter

```bash
mkdir -p .claude/skills/agent-memory/memories/category-name/
# Note: Check if file exists before writing to avoid accidental overwrites
cat > .claude/skills/agent-memory/memories/category-name/filename.md << 'EOF'
---
summary: "Brief description of this memory"
created: 2025-01-15
---

# Title

Content here...
EOF
```

### Maintain

- Update memories when information changes
- Delete memories that are no longer relevant
- Consolidate related memories when they grow
- Reorganize categories as the knowledge base evolves

## Guidelines

1. **Write for your future self**: Include enough context to be useful later
2. **Keep summaries decisive**: Reading the summary should tell you if you need the details
3. **Stay current**: Update or delete outdated information
4. **Be practical**: Save what's actually useful, not everything
