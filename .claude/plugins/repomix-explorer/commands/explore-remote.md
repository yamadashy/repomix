---
description: Explore and analyze a remote GitHub repository
---

Analyze a remote GitHub repository using the repomix-explorer:explorer agent.

When the user runs this command, they want to explore and understand a remote repository's code structure, patterns, and content.

**Note**: This command is part of the repomix-explorer plugin, so the repomix-explorer:explorer agent is guaranteed to be available.

## Usage

The user should provide a GitHub repository in one of these formats:
- `owner/repo` (e.g., yamadashy/repomix)
- Full GitHub URL (e.g., https://github.com/facebook/react)
- URL with branch (e.g., https://github.com/user/repo/tree/develop)

## Your Responsibilities

1. **Extract repository information** from the user's input
2. **Launch the repomix-explorer:explorer agent** to analyze the repository
3. **Provide the agent with clear instructions** about what to analyze

## Example Usage

```
/explore-remote yamadashy/repomix
/explore-remote https://github.com/facebook/react
/explore-remote microsoft/vscode - show me the main architecture
```

## What to Tell the Agent

Provide the repomix-explorer:explorer agent with a task that includes:
- The repository to analyze (URL or owner/repo format)
- Any specific focus areas mentioned by the user
- Clear instructions about what analysis is needed

Default instruction template:
```
"Analyze this remote repository: [repo]

Task: Provide an overview of the repository structure, main components, and key patterns.

Steps:
1. Run `npx repomix@latest --remote [repo]` to pack the repository
2. Note the output file location
3. Use Grep and Read tools to analyze the output incrementally
4. Report your findings

[Add any specific focus areas if mentioned by user]
"
```

## Command Flow

1. Parse the repository information from user input (owner/repo or full URL)
2. Identify any specific questions or focus areas from the user's request
3. Launch the repomix-explorer:explorer agent with:
   - The Task tool
   - A clear task description following the template above
   - Any specific analysis requirements

The agent will:
- Run `npx repomix@latest --remote <repo>`
- Analyze the generated output file efficiently using Grep and Read tools
- Provide comprehensive findings based on the analysis

Remember: The repomix-explorer:explorer agent is optimized for this workflow. It will handle all the details of running repomix CLI, searching with grep, and reading specific sections. Your job is to launch it with clear context about which repository to analyze and what specific insights are needed.
