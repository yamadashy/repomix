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

- The assistant shall follow the Airbnb JavaScript Style Guide.
- The assistant shall maintain feature-based directory structure and avoid dependencies between features.
- If a file exceeds 250 lines, then the assistant shall split it into multiple files based on functionality.
- Where non-obvious logic exists, the assistant shall add comments in English to clarify.
- When implementing new features, the assistant shall provide corresponding unit tests.
- When implementation is complete, the assistant shall verify changes by running:
  ```bash
  npm run lint  # Ensure code style compliance
  npm run test  # Verify all tests pass
  ```

## Commit Messages

- The assistant shall follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for all commit messages.
- The assistant shall always include a scope in commit messages.
- The assistant shall use the format: `type(scope): Description`
  ```
  # Examples:
  feat(cli): Add new --no-progress flag
  fix(security): Handle special characters in file paths
  docs(website): Update installation guide
  style(website): Update GitHub sponsor button color
  refactor(core): Split packager into smaller modules
  test(cli): Add tests for new CLI options
  ```
- The assistant shall use types: feat, fix, docs, style, refactor, test, chore, etc.
- The assistant shall use scope to indicate the affected part of the codebase (cli, core, website, security, etc.).
- The assistant shall write description in clear, concise present tense starting with a capital letter.

### Commit Body Guidelines

- When writing commit body, the assistant shall include context about what led to this commit.
- When writing commit body, the assistant shall describe the conversation or problem that motivated the change.

## Pull Request Guidelines

- When creating a pull request, the assistant shall follow the template:
  ```md
  <!-- Please include a summary of the changes -->

  ## Checklist

  - [ ] Run `npm run test`
  - [ ] Run `npm run lint`
  ```
- When creating a pull request, the assistant shall include a clear summary of the changes at the top.
- Where related issues exist, the assistant shall reference them using `#issue-number`.

## PR Review Guidelines

When reviewing pull requests, the assistant shall provide thoughtful feedback on the following topics:
- Code quality and best practices
- Potential bugs or issues
- Suggestions for improvements
- Overall architecture and design decisions

## Dependencies and Testing

- The assistant shall inject dependencies through a deps object parameter for testability.
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
- When writing tests, the assistant shall mock dependencies by passing test doubles through deps object.
- If dependency injection is not feasible, then the assistant shall use vi.mock().

## Generate Comprehensive Output

- The assistant shall include all content without abbreviation, unless specified otherwise.
- The assistant shall optimize for handling large codebases while maintaining output quality.

# GitHub Release Note Guidelines

- When writing release notes, the assistant shall reference issues or PRs using gh command to verify content:
  ```bash
  gh issue view <issue-number>  # For checking issue content
  gh pr view <pr-number>        # For checking PR content
  ```
- When writing release notes, the assistant shall retrieve and reference the latest release notes from `.github/releases/` as they contain past release examples.
