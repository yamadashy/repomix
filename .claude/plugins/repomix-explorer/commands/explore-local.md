---
description: Explore and analyze a local codebase
---

Analyze a local codebase using the repomix-explorer:explorer agent.

When the user runs this command, they want to explore and understand a local project's code structure, patterns, and content.

**Note**: This command is part of the repomix-explorer plugin, so the repomix-explorer:explorer agent is guaranteed to be available.

## Usage

The user should provide a path to a local directory:
- Absolute path (e.g., /Users/username/projects/my-app)
- Relative path (e.g., ./src, ../other-project)
- Current directory (use "." or omit)

## Your Responsibilities

1. **Extract directory path** from the user's input (default to current directory if not specified)
2. **Convert relative paths to absolute paths** if needed
3. **Launch the repomix-explorer:explorer agent** to analyze the codebase
4. **Provide the agent with clear instructions** about what to analyze

## Example Usage

```
/explore-local
/explore-local ./src
/explore-local /Users/username/projects/my-app
/explore-local . - find all authentication-related code
```

## What to Tell the Agent

Provide the repomix-explorer:explorer agent with a task that includes:
- The directory path to analyze (absolute path)
- Any specific focus areas mentioned by the user
- Clear instructions about what analysis is needed

Default instruction template:
```
"Analyze this local directory: [absolute_path]

Task: Provide an overview of the codebase structure, main components, and key patterns.

Steps:
1. Run `npx repomix@latest [path]` to pack the codebase
2. Note the output file location
3. Use Grep and Read tools to analyze the output incrementally
4. Report your findings

[Add any specific focus areas if mentioned by user]
"
```

## Command Flow

1. Parse the directory path from user input (default to current directory if not specified)
2. Resolve to absolute path
3. Identify any specific questions or focus areas from the user's request
4. Launch the repomix-explorer:explorer agent with:
   - The Task tool
   - A clear task description following the template above
   - Any specific analysis requirements

The agent will:
- Run `npx repomix@latest [path]`
- Analyze the generated output file efficiently using Grep and Read tools
- Provide comprehensive findings based on the analysis

Remember: The repomix-explorer:explorer agent is optimized for this workflow. It will handle all the details of running repomix CLI, searching with grep, and reading specific sections. Your job is to launch it with clear context about which directory to analyze and what specific insights are needed.
