---
title: Command Line Options
description: Reference every Repomix CLI option for input, output, file selection, remote repositories, configuration, security, token counting, MCP, and agent skills.
---

# Command Line Options

## Basic Options
- `-v, --version`: Show version information and exit

## CLI Input/Output Options

| Option | Description |
|--------|-------------|
| `--verbose` | Enable detailed debug logging (shows file processing, token counts, and configuration details) |
| `--quiet` | Suppress all console output except errors (useful for scripting) |
| `--stdout` | Write packed output directly to stdout instead of a file (suppresses all logging) |
| `--stdin` | Read file paths from stdin, one per line (specified files are processed directly) |
| `--copy` | Copy the generated output to system clipboard after processing |
| `--token-count-tree [threshold]` | Show file tree with token counts; optional threshold to show only files with ≥N tokens (e.g., `--token-count-tree 100`) |
| `--top-files-len <number>` | Number of largest files to show in summary (default: `5`) |

## Repomix Output Options

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Output file path (default: `repomix-output.xml`, use `"-"` for stdout) |
| `--style <style>` | Output format: `xml`, `markdown`, `json`, or `plain` (default: `xml`) |
| `--parsable-style` | Escape special characters to ensure valid XML/Markdown (needed when output contains code that breaks formatting) |
| `--compress` | Extract essential code structure (classes, functions, interfaces) using Tree-sitter parsing |
| `--output-show-line-numbers` | Prefix each line with its line number in the output |
| `--no-file-summary` | Omit the file summary section from output |
| `--no-directory-structure` | Omit the directory tree visualization from output |
| `--no-files` | Generate metadata only without file contents (useful for repository analysis) |
| `--remove-comments` | Strip all code comments before packing |
| `--remove-empty-lines` | Remove blank lines from all files |
| `--truncate-base64` | Truncate long base64 data strings to reduce output size |
| `--header-text <text>` | Custom text to include at the beginning of the output |
| `--instruction-file-path <path>` | Path to file containing custom instructions to include in output |
| `--split-output <size>` | Split output into multiple numbered files (e.g., `repomix-output.1.xml`); size like `500kb`, `2mb`, or `1.5mb` |
| `--include-empty-directories` | Include folders with no files in directory structure |
| `--include-full-directory-structure` | Show entire repository tree in the Directory Structure section, even when using `--include` patterns |
| `--no-git-sort-by-changes` | Don't sort files by git change frequency (default: most changed files first) |
| `--include-diffs` | Add git diff section showing working tree and staged changes |
| `--include-logs` | Add git commit history with messages and changed files |
| `--include-logs-count <count>` | Number of recent commits to include with `--include-logs` (default: `50`) |

## File Selection Options

| Option | Description |
|--------|-------------|
| `--include <patterns>` | Include only files matching these glob patterns (comma-separated, e.g., `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | Additional patterns to exclude (comma-separated, e.g., `"*.test.js,docs/**"`) |
| `--no-gitignore` | Don't use `.gitignore` rules for filtering files |
| `--no-dot-ignore` | Don't use `.ignore` rules for filtering files |
| `--no-default-patterns` | Don't apply built-in ignore patterns (`node_modules`, `.git`, build dirs, etc.) |

## Remote Repository Options

| Option | Description |
|--------|-------------|
| `--remote <url>` | Clone and pack a remote repository (GitHub URL or `user/repo` format) |
| `--remote-branch <name>` | Specific branch, tag, or commit to use (default: repository's default branch) |
| `--remote-trust-config` | Trust and load config files from remote repositories (disabled by default for security) |

## Configuration Options

| Option | Description |
|--------|-------------|
| `-c, --config <path>` | Use custom config file instead of `repomix.config.json` |
| `--init` | Create a new `repomix.config.json` file with defaults |
| `--global` | With `--init`, create config in home directory instead of current directory |

## Security Options
- `--no-security-check`: Skip scanning for sensitive data like API keys and passwords (use with caution; may expose secrets in output)

## Token Count Options
- `--token-count-encoding <encoding>`: Tokenizer model for counting: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (default: o200k_base)

## MCP Options
- `--mcp`: Run as Model Context Protocol server for AI tool integration

## Agent Skills Generation Options

| Option | Description |
|--------|-------------|
| `--skill-generate [name]` | Generate Claude Agent Skills format output to `.claude/skills/<name>/` directory (name auto-generated if omitted) |
| `--skill-output <path>` | Specify skill output directory path directly (skips location prompt) |
| `-f, --force` | Skip all confirmation prompts (e.g., skill directory overwrite) |

## Related Resources

- [Configuration](/guide/configuration) - Set options in your config file instead of CLI flags
- [Output Formats](/guide/output) - Details on XML, Markdown, JSON, and plain text formats
- [Code Compression](/guide/code-compress) - How `--compress` works with Tree-sitter
- [Security](/guide/security) - What `--no-security-check` disables

## Examples

```bash
# Basic usage
repomix

# Custom output file and format
repomix -o my-output.md --style markdown
repomix -o my-output.json --style json

# Output to stdout
repomix --stdout > custom-output.txt

# Send output to stdout, then pipe into another command (for example, simonw/llm)
repomix --stdout | llm "Please explain what this code does."

# Custom output with compression
repomix --compress

# Split output into multiple files (max size per part)
repomix --split-output 20mb

# Process specific files with patterns
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Remote repository with branch
repomix --remote https://github.com/user/repo/tree/main

# Remote repository with commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Remote repository with shorthand
repomix --remote user/repo

# Using stdin for file list
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Git integration
repomix --include-diffs  # Include git diffs for uncommitted changes
repomix --include-logs   # Include git logs (last 50 commits by default)
repomix --include-logs --include-logs-count 10  # Include last 10 commits
repomix --include-diffs --include-logs  # Include both diffs and logs

# Token count analysis
repomix --token-count-tree
repomix --token-count-tree 1000  # Only show files/directories with 1000+ tokens
```
