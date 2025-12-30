---
name: memory
description: "Persistent memory for the agent. Save research findings, decisions, learnings, and notes to the memories/ folder. Use `/memory` to save, recall, list, search, or organize notes."
---

# Memory - Agent's Persistent Knowledge Base

A persistent memory system for storing and retrieving knowledge across conversations.

## Location

All memories are stored in: `.claude/skills/memory/memories/`

## Operations

### Save (`/memory save` or `/memory`)
Save new knowledge to the memory store.

**When to save:**
- Research findings about the codebase
- Architecture decisions and their rationale
- Troubleshooting steps that worked
- Lessons learned from mistakes
- Project-specific patterns or idioms
- Useful commands or workflows discovered

**How to save:**
1. Determine appropriate category or create new file
2. Use frontmatter for metadata (created, updated, tags)
3. Write clear, future-readable content
4. Include context for why this knowledge matters

### Recall (`/memory recall`)
Retrieve relevant memories for the current context.

1. Search memories for keywords related to current task
2. Read relevant memory files
3. Apply knowledge to current situation

### List (`/memory list`)
Show all available memories.

```bash
# List all memory files
fd . .claude/skills/memory/memories/ --type f
```

### Search (`/memory search <query>`)
Find memories containing specific keywords.

```bash
# Search for specific content
rg "<query>" .claude/skills/memory/memories/
```

### Organize (`/memory organize`)
Restructure and clean up memories.

1. Review existing memories for duplicates
2. Consolidate related knowledge
3. Update `_index.md` if it exists
4. Archive outdated information

## File Format

```markdown
---
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [category, topic]
context: "Brief description of why this was recorded"
---

# Title

## Background
Why this knowledge was captured.

## Content
The actual knowledge, findings, or notes.

## Related
- Links to other memory files
- Related source code locations
```

## Directory Structure (Suggested, Not Required)

```
memories/
├── _index.md         # Optional: Table of contents
├── research/         # Investigation results
├── decisions/        # Architecture/design decisions
├── learnings/        # Lessons learned, best practices
├── troubleshooting/  # Problem-solution pairs
└── journal/          # Chronological notes
```

**Note:** Structure is flexible. Create folders/files as needed.

## Guidelines

1. **Use the speaker's language**: Write memories in the language the user is speaking (default)
2. **Be specific**: Include enough context for future recall
3. **Be concise**: Avoid unnecessary verbosity
4. **Include examples**: Code snippets, commands, etc.
5. **Link related files**: Reference source code with `file:line`
6. **Update regularly**: Keep memories current
7. **Delete outdated info**: Remove knowledge that's no longer valid

## Integration with MCP Memory

This skill complements the MCP memory tool:
- **MCP memory**: Quick facts, entities, relationships (structured)
- **This skill**: Detailed documents, explanations, examples (unstructured)

Use both together for comprehensive knowledge management.
