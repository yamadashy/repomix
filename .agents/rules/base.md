---
description: Core project guidelines for the Repomix codebase. Apply these rules when working on any code, documentation, or configuration files within the Repomix project.
alwaysApply: true
inclusion: always
---

# Repomix Project Structure and Overview

This document provides a structural overview of the Repomix project, designed to aid AI code assistants (like Copilot) in understanding the codebase.

Please refer to `README.md` for a complete and up-to-date project overview, and `CONTRIBUTING.md` for implementation guidelines and contribution procedures.

## Project Overview

Repomix is a tool that packs the contents of a software repository into a single file, making it easier for AI systems to analyze and process the codebase. It supports various output formats (XML, Markdown, or plain text), ignores files based on configurable patterns, and performs security checks to exclude potentially sensitive information.

## Directory Structure

The project is organized into the following directories:

```
repomix/
├── PRDs/ # Product Requirements Documents for new features
│   └── 01-Line-Limit-Feature/ # Example PRD for line limit feature
├── browser/ # Browser extension source code.
├── src/ # Main source code
│   ├── cli/ # Command-line interface logic (argument parsing, command handling, output)
│   ├── config/ # Configuration loading, schema, and defaults
│   ├── core/ # Core logic of Repomix
│   │   ├── file/ # File handling (reading, processing, searching, tree structure generation, git commands)
│   │   ├── metrics/ # Calculating code metrics (character count, token count)
│   │   ├── output/ # Output generation (different styles, headers, etc.)
│   │   ├── packager/ # Orchestrates file collection, processing, output, and clipboard operations.
│   │   ├── security/ # Security checks to exclude sensitive files
│   │   ├── mcp/ # MCP server integration (packaging codebases for AI analysis)
│   │   ├── tokenCount/ # Token counting using Tiktoken
│   │   └── treeSitter/ # Code parsing using Tree-sitter and language-specific queries
│   └── shared/ # Shared utilities and types (error handling, logging, helper functions)
├── tests/ # Unit and integration tests (organized mirroring src/)
│   ├── cli/
│   ├── config/
│   ├── core/
│   ├── integration-tests/
│   ├── shared/
│   └── testing/
└── website/ # Documentation website (VitePress).
```



# Coding Guidelines
- Follow the Airbnb JavaScript Style Guide.
- Always maintain feature-based directory structure and avoid dependencies between features.
- Split files into smaller, focused units when appropriate:
  - Aim to keep code files under 250 lines. If a file exceeds 250 lines, split it into multiple files based on functionality.
- Add comments to clarify non-obvious logic. **Ensure all comments are written in English.**
- Provide corresponding unit tests for all new features.
- After implementation, verify changes by running:
  ```bash
  npm run lint  # Ensure code style compliance
  npm run test  # Verify all tests pass
  ```

## Commit Messages
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for all commit messages
- Always include a scope in your commit messages
- Format: `type(scope): Description`
  ```
  # Examples:
  feat(cli): Add new --no-progress flag
  fix(security): Handle special characters in file paths
  docs(website): Update installation guide
  style(website): Update GitHub sponsor button color
  refactor(core): Split packager into smaller modules
  test(cli): Add tests for new CLI options
  ```
- Types: feat, fix, docs, style, refactor, test, chore, etc.
- Scope should indicate the affected part of the codebase (cli, core, website, security, etc.)
- Description should be clear and concise in present tense
- Description must start with a capital letter

### Commit Body Guidelines
- Include context about what led to this commit
- Describe the conversation or problem that motivated the change
- This helps preserve the decision-making process for future reference

## Pull Request Guidelines
- All pull requests must follow the template:
  ```md
  <!-- Please include a summary of the changes -->

  ## Checklist

  - [ ] Run `npm run test`
  - [ ] Run `npm run lint`
  ```
- Include a clear summary of the changes at the top of the pull request description
- Reference any related issues using the format `#issue-number`

## PR Review Guidelines
When reviewing pull requests, provide thoughtful feedback on:
- Code quality and best practices
- Potential bugs or issues
- Suggestions for improvements
- Overall architecture and design decisions

## Dependencies and Testing
- Inject dependencies through a deps object parameter for testability
- Example:
  ```typescript
  export const functionName = async (
    param1: Type1,
    param2: Type2,
    deps = {
      defaultFunction1,
      defaultFunction2,
    }
  ) => {
    // Use deps.defaultFunction1() instead of direct call
  };
  ```
- Mock dependencies by passing test doubles through deps object
- Use vi.mock() only when dependency injection is not feasible

## Generate Comprehensive Output
- Include all content without abbreviation, unless specified otherwise
- Optimize for handling large codebases while maintaining output quality

# GitHub Release Note Guidelines
When writing release notes, please follow these guidelines:

- When referencing issues or PRs, use the gh command to verify the content:
  ```bash
  gh issue view <issue-number>  # For checking issue content
  gh pr view <pr-number>        # For checking PR content
  ```
  This helps ensure accuracy in release note descriptions.

Please retrieve and reference the latest release notes from `.github/releases/` as they contain past release examples.
