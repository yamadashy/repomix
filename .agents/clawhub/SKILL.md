---
name: repomix
version: 1.0.0
description: |
  Pack and analyze codebases into AI-friendly single files using Repomix.
  Use when the user wants to explore repositories, analyze code structure,
  find patterns, check token counts, or prepare codebase context for AI analysis.
  Supports both local directories and remote GitHub repositories.
tags:
  - code-analysis
  - repository
  - codebase
  - ai-context
  - code-explorer
  - token-count
  - tree-sitter
author: yamadashy
metadata:
  openclaw:
    emoji: "📦"
    homepage: "https://github.com/yamadashy/repomix"
    requires:
      bins:
        - npx
    install:
      - kind: node
        package: repomix
        bins:
          - repomix
        label: "Install Repomix CLI (npm)"
---

# Repomix — Codebase Packer & Analyzer

Pack entire codebases into a single, AI-friendly file for analysis. Repomix intelligently collects repository files, respects `.gitignore`, runs security checks, and generates structured output optimized for LLM consumption.

## When to Use

- "Analyze this repo" / "Explore this codebase"
- "What's the structure of facebook/react?"
- "Find all authentication-related code"
- "How many tokens is this project?"
- "Pack this repo for AI analysis"
- "Show me the main components of vercel/next.js"

## Quick Reference

### Pack a Remote Repository

```bash
npx repomix@latest --remote <owner/repo> --output /tmp/<repo-name>-analysis.xml
```

Always output to a temporary directory (`/tmp` on Unix, `%TEMP%` on Windows) for remote repositories to avoid polluting the user's working directory.

### Pack a Local Directory

```bash
npx repomix@latest [directory] --output /tmp/<name>-analysis.xml
```

### Key Options

| Option | Description |
|--------|-------------|
| `--style <format>` | Output format: `xml` (default, recommended), `markdown`, `plain`, `json` |
| `--compress` | Tree-sitter compression (~70% token reduction) — use for large repos |
| `--include <patterns>` | Include only matching patterns (e.g., `"src/**/*.ts,**/*.md"`) |
| `--ignore <patterns>` | Additional ignore patterns |
| `--output <path>` | Custom output path (default: `repomix-output.xml`) |
| `--remote-branch <name>` | Specific branch, tag, or commit (for remote repos) |

## Workflow

### Step 1: Pack the Repository

Choose the appropriate command based on the target:

```bash
# Remote repository (always output to /tmp)
npx repomix@latest --remote yamadashy/repomix --output /tmp/repomix-analysis.xml

# Large remote repo with compression
npx repomix@latest --remote facebook/react --compress --output /tmp/react-analysis.xml

# Local directory
npx repomix@latest ./src --output /tmp/src-analysis.xml

# Specific file types only
npx repomix@latest --include "**/*.{ts,tsx,js,jsx}" --output /tmp/filtered-analysis.xml
```

### Step 2: Check Command Output

The command displays:
- **Files processed**: Number of files included
- **Total characters**: Size of content
- **Total tokens**: Estimated AI tokens
- **Output file location**: Where the file was saved

Note the output file location for subsequent analysis.

### Step 3: Analyze the Output

**Structure overview:**
1. Search for the file tree section (near the beginning of the output)
2. Check the metrics summary for overall statistics

**Search for patterns** (use the output file path from Step 2):
```bash
# Find exports and main entry points
grep -iE "export.*function|export.*class" <output-file>

# Search with context
grep -iE -A 5 -B 5 "authentication|auth" <output-file>

# Find API endpoints
grep -iE "router|route|endpoint|api" <output-file>

# Find database models
grep -iE "model|schema|database|query" <output-file>
```

**Read specific sections** using offset/limit for large outputs.

### Step 4: Report Findings

- **Metrics**: Files, tokens, size from command output
- **Structure**: Directory layout from file tree analysis
- **Key findings**: Based on pattern search results
- **Next steps**: Suggestions for deeper exploration

## Best Practices

1. **Use `--compress` for large repos** (>100k lines) to reduce token usage by ~70%
2. **Use pattern search first** before reading entire output files
3. **Use a temporary directory for output** (`/tmp` on Unix, `%TEMP%` on Windows) to keep the user's workspace clean
4. **Use `--include` to focus** on specific parts of a codebase
5. **XML is the default and recommended format** — it has clear file boundaries for structured analysis

## Output Formats

| Format | Best For |
|--------|----------|
| XML (default) | Structured analysis, clear file boundaries |
| Markdown | Human-readable documentation |
| Plain | Simple grep-friendly output |
| JSON | Programmatic/machine analysis |

## Error Handling

- **Command fails**: Check error message, verify repository URL/path, check permissions
- **Output too large**: Use `--compress`, narrow scope with `--include`
- **Network issues** (remote): Verify connection, suggest local clone as alternative
- **Pattern not found**: Try alternative patterns, check file tree to verify files exist

## Security

Repomix automatically excludes potentially sensitive files (API keys, credentials, `.env` files) through built-in security checks. Trust its security defaults unless the user explicitly requests otherwise.
