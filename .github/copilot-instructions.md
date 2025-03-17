# Repomix Project Structure and Overview

This document provides a structural overview of the Repomix project, designed to aid AI code assistants (like Copilot) in understanding the codebase.

Please refer to `README.md` for a complete and up-to-date project overview, and `CONTRIBUTING.md` for implementation guidelines and contribution procedures.

## Project Overview

Repomix is a tool that packs the contents of a software repository into a single file, making it easier for AI systems to analyze and process the codebase. It supports various output formats (plain text, XML, Markdown), ignores files based on configurable patterns, and performs security checks to exclude potentially sensitive information.

## Directory Structure

The project is organized into the following directories:

```
repomix/
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
└── website/ # Documentation website (VitePress)
    ├── client/      # Client-side code (Vue.js components, styles, configuration)
    │   ├── .vitepress/  # VitePress configuration and theme
    │   │   ├── config/  # Site configuration files (navigation, sidebar, etc.)
    │   │   └── theme/   # Custom theme and styles
    │   ├── components/ # Vue.js components for the website
    │   └── src/        # Markdown files for the documentation in various languages (en, ja, etc.)
    └── server/      # Server-side API (for remote repository processing)
        └── src/       # Server source code (API endpoints, request handling)
```

----------------------------------------------------------------

# Coding Guidelines
- Follow the Airbnb JavaScript Style Guide.
- Split files into smaller, focused units when appropriate:
  - Aim to keep code files under 250 lines. If a file exceeds 250 lines, split it into multiple files based on functionality.
- Add comments to clarify non-obvious logic. **Ensure all comments are written in English.**
- Provide corresponding unit tests for all new features.
- After implementation, verify changes by running:
  ```bash
  npm run lint  # Ensure code style compliance
  npm run test  # Verify all tests pass
  ```

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

----------------------------------------------------------------

# GitHub Release Note Guidelines
When writing release notes, please follow these guidelines:

- When referencing issues or PRs, use the gh command to verify the content:
  ```bash
  gh issue view <issue-number>  # For checking issue content
  gh pr view <pr-number>        # For checking PR content
  ```
  This helps ensure accuracy in release note descriptions.

Here are some examples of release notes that follow the guidelines:

v0.2.25
````md
This release brings significant improvements to output formatting and introduces flexible remote repository handling capabilities along with enhanced logging features.

# Improvements ⚡

## Remote Repository Enhancement (#335)
- Added branch/tag parsing directly from repository URLs:
```bash
repomix --remote https://github.com/yamadashy/repomix/tree/0.1.x
```
Functions identically to:
```bash
repomix --remote https://github.com/yamadashy/repomix --remote-branch 0.1.x
```

Special thanks to @huy-trn for implementing this user-friendly feature!

## Enhanced Output Formatting (#328, #329, #330)
- Added "End of Codebase" marker for better clarity in output
- Improved output header accuracy:
  - Better representation of codebase scope
  - Clear indication when using `--include` or `--ignore` options

Special thanks to @gitkenan for adding the "End of Codebase" marker and reporting the header issue!

## Path Pattern Support (#337)
- Added support for special characters in paths:
  - Handles parentheses in include patterns (e.g., `src/(categories)/**/*`)
  - Improved escaping for `[]` and `{}`
  - Essential for Next.js route groups and similar frameworks

Thank you @matheuscoelhomalta for improving path pattern support!

# How to Update

```bash
npm update -g repomix
```

---

As always, if you encounter any issues or have suggestions, please let us know through our GitHub issues or join our [Discord community](https://discord.gg/wNYzTwZFku) for support.
````

v0.2.24
````md
This release significantly enhances configuration flexibility with comprehensive CLI flag support and expands default ignore patterns for better project scaffolding. 

# What's New 🚀

## CLI Flags Revolution (#324)
- New command-line configuration now available.

```
- `--no-gitignore`: Disable .gitignore file usage
- `--no-default-patterns`: Disable default patterns
- `--header-text <text>`: Custom text to include in the file header
- `--instruction-file-path <path>`: Path to a file containing detailed custom instructions
- `--include-empty-directories`: Include empty directories in the output
```

Special recognition to @massdo for driving ecosystem growth.

# Improvements ⚡

## Enhanced Ignore Patterns (#318, #322)
- Expanded default ignores for Rust projects:
  - `target/`, `Cargo.lock`, build artifacts
  - PHP, Ruby, Go, Elixir, Haskell: package manager lock files

To @boralg for helping curate Rust-specific patterns!

# How to Update
```bash
npm update -g repomix
```

---

As always, if you encounter any issues or have suggestions, please let us know through our GitHub issues or join our [Discord community](https://discord.gg/wNYzTwZFku) for support.
````

v0.2.23
````md
This release adds significant performance improvements for large repositories, making Repomix faster and more efficient when needed.

# Improvements ⚡

## Parallel Processing Enhancement (#309)
- Implemented worker threads using [Piscina](https://github.com/piscinajs/piscina) for parallel processing

### Benchmark Results
- `yamadashy.repomix`: No significant change
  - Before: 868.73 millis
  - After: 671.26 millis
- `facebook/react`: 29x faster
  - Before: 123.31 secs
  - After: 4.19 secs
- `vercel/next.js`: 58x faster
  - Before: 17.85 mins
  - After: 17.27 secs

Note: While Repomix is not primarily designed for processing large repositories, and speed is not a primary goal, faster processing can provide a better user experience when working with larger codebases.

# How to Update

```bash
npm update -g repomix
```


---

As always, if you encounter any issues or have suggestions, please let us know through our GitHub issues or join our [Discord community](https://discord.gg/wNYzTwZFku) for support.
````

v0.2.22
````md
This release introduces significant improvements to large file handling and expands the Repomix ecosystem with new tools and community channels.

# Improvements ⚡ 

## Improved Large File Handling (#302)

- Added a file size limit check (50MB) to prevent memory issues
- Graceful error handling for large files with clear user guidance:

Special thanks to @slavashvets for their continued contributions!

# Ecosystem Growth 🤝 

## New VS Code Extension (#300)
A community-created VS Code extension "Repomix Runner" is now available:
- Run Repomix directly from VS Code
- Extension by @massdo: [View on VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)

Thank you @massdo for bringing Repomix to VS Code and expanding our tooling ecosystem!

## Official Social Media
- Launched official Repomix X (Twitter) account: [@repomix_ai](https://x.com/repomix_ai)
  - Follow for updates, tips, and community highlights

# How to Update

```bash
npm update -g repomix
```

---

Join our growing community on [Discord](https://discord.gg/BF8GxZHE2C) and follow us on [X](https://x.com/repomix_ai) for updates!
````

v0.2.21
````md
This release introduces significant improvements to output formatting and documentation, featuring a new parsable style option for enhanced XML handling.

# What's New 🚀 

## Enhanced Output Style Control (#287)
- Added new `parsableStyle` option for better output handling:
  - Ensures output strictly follows the specification of the chosen format
  - Provides properly escaped XML output with fast-xml-parser
  - Dynamically adjusts markdown code block delimiters to avoid content conflicts
- Available via CLI flag `--parsable-style` or in configuration file

Special thanks to @atollk for their first contribution!

# Documentation 📚

## README Enhancements (#296)
- Updated Homebrew installation documentation to include Linux support

Special thanks to @chenrui333 for their continued contributions!

## Website Multi-Language Support (#293)
- Enhanced multi-language support in [repomix.com](https://repomix.com)

# How to Update

To update to the latest version, run:
```bash
npm update -g repomix
```


---

As always, if you encounter any issues or have suggestions, please let us know through our GitHub issues or join our [Discord community](https://discord.gg/wNYzTwZFku) for support.
