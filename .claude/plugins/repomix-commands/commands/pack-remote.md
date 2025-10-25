---
description: Pack and analyze a remote GitHub repository
---

Fetch and analyze a GitHub repository using Repomix.

When the user asks to pack a remote repository, analyze their request and run the appropriate repomix command.

## User Intent Examples

The user might ask in various ways:
- "Pack the yamadashy/repomix repository"
- "Analyze facebook/react from GitHub"
- "Pack https://github.com/microsoft/vscode"
- "Pack react repository with compression"
- "Pack only TypeScript files from the Next.js repo"
- "Analyze the main branch of user/repo"

## Your Responsibilities

1. **Understand the user's intent** from natural language
2. **Extract the repository information**:
   - Repository URL or owner/repo format
   - Specific branch, tag, or commit (if mentioned)
3. **Determine the appropriate options**:
   - Output format: xml (default), markdown, json, or plain
   - Whether to compress (for large codebases)
   - File patterns to include/ignore
   - Additional features (copy to clipboard)
4. **Execute the command** with: `npx repomix@latest --remote <repo> [options]`

## Supported Repository Formats

- `owner/repo` (e.g., yamadashy/repomix)
- `https://github.com/owner/repo`
- `https://github.com/owner/repo/tree/branch-name`
- `https://github.com/owner/repo/commit/hash`

## Available Options

- `--style <format>`: Output format (xml, markdown, json, plain)
- `--include <patterns>`: Include only matching patterns (e.g., "src/**/*.ts,**/*.md")
- `--ignore <patterns>`: Additional ignore patterns
- `--compress`: Enable Tree-sitter compression (~70% token reduction)
- `--output <path>`: Custom output path
- `--copy`: Copy output to clipboard

## Command Examples

Based on user intent, you might run:

```bash
# "Pack yamadashy/repomix"
npx repomix@latest --remote yamadashy/repomix

# "Analyze facebook/react"
npx repomix@latest --remote https://github.com/facebook/react

# "Pack the develop branch of user/repo"
npx repomix@latest --remote https://github.com/user/repo/tree/develop

# "Pack microsoft/vscode with compression"
npx repomix@latest --remote microsoft/vscode --compress

# "Pack only TypeScript files from owner/repo"
npx repomix@latest --remote owner/repo --include "src/**/*.ts"

# "Pack yamadashy/repomix as markdown and copy to clipboard"
npx repomix@latest --remote yamadashy/repomix --copy --style markdown
```

## Analyzing the Output

**IMPORTANT**: The generated output file can be very large and consume significant context.

If the user wants to analyze or explore the generated output:
- **DO NOT read the entire output file directly**
- **USE an appropriate sub-agent** to analyze the output
- The sub-agent will efficiently search and read specific sections using grep and incremental reading

**Agent Selection Strategy**:
1. If `repomix-explorer:explorer` agent is available, use it (optimized for repomix output analysis)
2. Otherwise, use the `general-purpose` agent or another suitable sub-agent
3. The sub-agent should use Grep and Read tools to analyze incrementally

Example:
```text
User: "Pack and analyze the yamadashy/repomix repository"

Your workflow:
1. Run: npx repomix@latest --remote yamadashy/repomix
2. Note the output file location (e.g., repomix-output.xml)
3. Launch an appropriate sub-agent with task:
   "Analyze the repomix output file at ./repomix-output.xml.
   Use Grep tool to search for patterns and Read tool to examine specific sections.
   Provide an overview of the repository structure and main components.
   Do NOT read the entire file at once."
```

## Help and Documentation

If you need more information about available options or encounter any issues:
- Run `npx repomix@latest -h` or `npx repomix@latest --help` to see all available options
- Check the official documentation at https://github.com/yamadashy/repomix

Remember: Parse the user's natural language request and translate it into the appropriate repomix command with the --remote option. For analysis tasks, delegate to appropriate sub-agents to avoid consuming excessive context.
