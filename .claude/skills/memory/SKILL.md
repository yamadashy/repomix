---
name: agent-notes
description: "Use this skill when the user asks to save notes, record something, remember information, or recall previously saved knowledge. Triggers on phrases like: 'save this', 'note this', 'remember this', 'record this', 'what did we discuss about...'"
---

# Agent Notes - Persistent Knowledge Base

A persistent memory system for storing and retrieving knowledge across conversations.

## Location

All notes are stored in: `.claude/skills/memory/memories/`

## When to Use

**Save notes when user says:**
- "save this", "note this", "remember this", "record this"
- "keep this for later", "don't forget this"

**Recall notes when user says:**
- "what did we discuss about...", "do you have notes on..."
- "what do you remember about...", "check your notes"

## Operations

### Save
Save new knowledge to the notes store.

**What to save:**
- Research findings about the codebase
- Architecture decisions and their rationale
- Troubleshooting steps that worked
- Lessons learned from mistakes
- Project-specific patterns or idioms
- Useful commands or workflows discovered

**How to save:**
1. Determine appropriate filename
2. Use frontmatter for metadata (created, updated, tags)
3. Write clear, future-readable content
4. Include context for why this knowledge matters

### Recall
Retrieve relevant notes for the current context.

1. Search notes for keywords related to current task
2. Read relevant note files
3. Apply knowledge to current situation

### List
Show all available notes.

```bash
fd . .claude/skills/memory/memories/ --type f
```

### Search
Find notes containing specific keywords.

```bash
rg "<query>" .claude/skills/memory/memories/
```

### Organize
Restructure and clean up notes.

1. Review existing notes for duplicates
2. Consolidate related knowledge
3. Archive outdated information

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
