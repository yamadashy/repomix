---
description: Core project guidelines for the Repomix codebase. Apply these rules when working on any code, documentation, or configuration files within the Repomix project.
alwaysApply: true
---

# Repomix

A tool that packs repository contents into a single AI-friendly file. Supports XML, Markdown, and plain text output formats.

Refer to `README.md` for full project overview and `CONTRIBUTING.md` for contribution procedures.

## Directory Structure

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

- Follow the Airbnb JavaScript Style Guide
- Maintain feature-based directory structure and avoid dependencies between features
- Split files exceeding 250 lines into multiple files based on functionality
- Add comments in English where non-obvious logic exists
- Provide corresponding unit tests for new features
- Verify changes by running:
  ```bash
  npm run lint  # Ensure code style compliance
  npm run test  # Verify all tests pass
  ```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) with scope: `type(scope): Description`

```
feat(cli): Add new --no-progress flag
fix(security): Handle special characters in file paths
docs(website): Update installation guide
refactor(core): Split packager into smaller modules
test(cli): Add tests for new CLI options
```

- Types: feat, fix, docs, style, refactor, test, chore, etc.
- Scope: affected area (cli, core, website, security, etc.)
- Description: clear, concise present tense starting with a capital letter
- Commit body: follow the `contextual-commit` skill (`.claude/skills/contextual-commit/SKILL.md`)

## Pull Request Guidelines

- Follow the template at `.github/pull_request_template.md`
- Include a clear summary of changes at the top
- Reference related issues using `#issue-number`

## Dependencies and Testing

Inject dependencies through a `deps` object parameter for testability:

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

- Mock dependencies by passing test doubles through the deps object
- Use `vi.mock()` only when dependency injection is not feasible

## Output Generation

- Include all content without abbreviation, unless specified otherwise
- Optimize for handling large codebases while maintaining output quality
