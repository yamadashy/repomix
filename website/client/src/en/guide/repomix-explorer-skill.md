# Repomix Explorer Skill (Agent Skills)

Repomix provides a ready-to-use **Repomix Explorer** skill that enables AI coding assistants to analyze and explore codebases using Repomix CLI.

This skill is designed to work with various AI tools including Claude Code, Cursor, Codex, GitHub Copilot, and more.

## Quick Install

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

This command installs the skill to your AI assistant's skills directory (e.g., `.claude/skills/`), making it immediately available.

## What It Does

Once installed, you can analyze codebases with natural language instructions.

#### Analyze remote repositories

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Explore local codebases

```text
"What's in this project?
~/projects/my-app"
```

This is useful not only for understanding codebases, but also when you want to implement features by referencing your other repositories.

## How It Works

The Repomix Explorer skill guides AI assistants through the complete workflow:

1. **Run repomix commands** - Pack repositories into AI-friendly format
2. **Analyze output files** - Use pattern search (grep) to find relevant code
3. **Provide insights** - Report structure, metrics, and actionable recommendations

## Example Use Cases

### Understanding a New Codebase

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

The AI will run repomix, analyze the output, and provide a structured overview of the codebase.

### Finding Specific Patterns

```text
"Find all authentication-related code in this repository."
```

The AI will search for auth patterns, categorize findings by file, and explain how authentication is implemented.

### Referencing Your Own Projects

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

The AI will analyze your other repository and help you reference your own implementations.

## Skill Contents

The skill includes:

- **User intent recognition** - Understands various ways users ask for codebase analysis
- **Repomix command guidance** - Knows which options to use (`--compress`, `--include`, etc.)
- **Analysis workflow** - Structured approach to exploring packed output
- **Best practices** - Efficiency tips like using grep before reading entire files

## Related Resources

- [Agent Skills Generation](/guide/agent-skills-generation) - Generate your own skills from codebases
- [Claude Code Plugins](/guide/claude-code-plugins) - Repomix plugins for Claude Code
- [MCP Server](/guide/mcp-server) - Alternative integration method
