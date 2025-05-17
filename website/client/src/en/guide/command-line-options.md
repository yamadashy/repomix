# Command Line Options

## Basic Options
- `-v, --version`: Show tool version

## Output Options
- `-o, --output <file>`: Output file name (default: `repomix-output.txt`)
- `--stdout`: Output to stdout instead of writing to a file (cannot be used with `--output` option)
- `--style <type>`: Output style (`plain`, `xml`, `markdown`) (default: `xml`)
- `--parsable-style`: Enable parsable output based on the chosen style schema (default: `false`)
- `--compress`: Perform intelligent code extraction, focusing on essential function and class signatures while removing implementation details. For more details and examples, see [Code Compression Guide](code-compress).
- `--output-show-line-numbers`: Add line numbers (default: `false`)
- `--copy`: Copy to clipboard (default: `false`)
- `--no-file-summary`: Disable file summary (default: `true`)
- `--no-directory-structure`: Disable directory structure (default: `true`)
- `--no-files`: Disable files content output (metadata-only mode) (default: `true`)
- `--remove-comments`: Remove comments (default: `false`)
- `--remove-empty-lines`: Remove empty lines (default: `false`)
- `--header-text <text>`: Custom text to include in the file header
- `--instruction-file-path <path>`: Path to a file containing detailed custom instructions
- `--include-empty-directories`: Include empty directories in the output (default: `false`)
- `--include-diffs`: Include git diffs in the output (includes both work tree and staged changes separately) (default: `false`)
- `--no-git-sort-by-changes`: Disable sorting files by git change count (default: `true`)

## Filter Options
- `--include <patterns>`: Include patterns (comma-separated)
- `--force-include <patterns>`: Force include patterns that override ignore rules (comma-separated)
- `-i, --ignore <patterns>`: Ignore patterns (comma-separated)
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
- `--token-count-encoding <encoding>`: Specify token count encoding (e.g., `o200k_base`, `cl100k_base`) (default: `o200k_base`)

## Other Options
- `--top-files-len <number>`: Number of top files to show (default: `5`)
- `--verbose`: Enable verbose logging
- `--quiet`: Disable all output to stdout

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

# Force include specific files even if they're ignored
repomix --force-include "coverage/summary.json,test-results/junit.xml"

# Remote repository with branch
repomix --remote https://github.com/user/repo/tree/main

# Remote repository with commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Remote repository with shorthand
repomix --remote user/repo
```
