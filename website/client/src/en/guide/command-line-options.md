# Command Line Options

## Basic Options
- `-v, --version`: Show tool version

## CLI Input/Output Options
- `--verbose`: Enable verbose logging
- `--quiet`: Disable all output to stdout
- `--stdout`: Output to stdout instead of writing to a file (cannot be used with `--output` option)
- `--stdin`: Read file paths from stdin instead of discovering files automatically
- `--copy`: Additionally copy generated output to system clipboard
- `--token-count-tree [threshold]`: Display file tree with token count summaries (optional: minimum token count threshold). Useful for identifying large files and optimizing token usage for AI context limits
- `--top-files-len <number>`: Number of top files to display in the summary

## Repomix Output Options
- `-o, --output <file>`: Specify the output file name
- `--style <style>`: Specify the output style (`xml`, `markdown`, `plain`)
- `--parsable-style`: Enable parsable output based on the chosen style schema. Note that this can increase token count.
- `--compress`: Perform intelligent code extraction, focusing on essential function and class signatures to reduce token count
- `--output-show-line-numbers`: Show line numbers in the output
- `--no-file-summary`: Disable file summary section output
- `--no-directory-structure`: Disable directory structure section output
- `--no-files`: Disable files content output (metadata-only mode)
- `--remove-comments`: Remove comments from supported file types
- `--remove-empty-lines`: Remove empty lines from the output
- `--truncate-base64`: Enable truncation of base64 data strings
- `--header-text <text>`: Custom text to include in the file header
- `--instruction-file-path <path>`: Path to a file containing detailed custom instructions
- `--include-empty-directories`: Include empty directories in the output
- `--include-diffs`: Include git diffs in the output (includes both work tree and staged changes separately)
- `--include-logs`: Include git logs in the output (includes commit history with dates, messages, and file paths)
- `--include-logs-count <count>`: Number of git log commits to include (default: 50)
- `--no-git-sort-by-changes`: Disable sorting files by git change count (enabled by default)

## File Selection Options
- `--include <patterns>`: List of include patterns (comma-separated)
- `-i, --ignore <patterns>`: Additional ignore patterns (comma-separated)
- `--ignore-content <patterns>`: Skip file content for matched patterns (comma-separated; prefix with `!` to keep specific paths)
- `--no-gitignore`: Disable .gitignore file usage
- `--no-default-patterns`: Disable default patterns

## Remote Repository Options
- `--remote <url>`: Process remote repository
- `--remote-branch <name>`: Specify the remote branch name, tag, or commit hash (defaults to repository default branch)

## Configuration Options
- `-c, --config <path>`: Custom config file path
- `--init`: Create config file
- `--global`: Use global config

## Security Options
- `--no-security-check`: Disable security check (default: `true`)

## Token Count Options
- `--token-count-encoding <encoding>`: Specify token count encoding used by OpenAI's [tiktoken](https://github.com/openai/tiktoken) tokenizer (e.g., `o200k_base` for GPT-4o, `cl100k_base` for GPT-4/3.5). See [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) for encoding details.
## Examples

```bash
# Basic usage
repomix

# Custom output
repomix -o output.xml --style xml

# Output to stdout
repomix --stdout > custom-output.txt

# Send output to stdout, then pipe into another command (for example, simonw/llm)
repomix --stdout | llm "Please explain what this code does."

# Custom output with compression
repomix --compress

# Process specific files
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Ignore file contents for matching patterns
repomix --ignore-content "components/**,!components/slider/**"

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

