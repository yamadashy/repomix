# Basic Usage

## Quick Start

Pack your entire repository:
```bash
repomix
```

## Common Use Cases

### Pack Specific Directories
```bash
repomix path/to/directory
```

### Include Specific Files
Use [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Exclude Files
```bash
repomix --ignore "**/*.log,tmp/"
```

### Split Output Into Multiple Files

When working with large codebases, the packed output may exceed file size limits imposed by some AI tools (e.g., Google AI Studio's 1MB limit). Use `--split-output` to automatically split the output into multiple files:

```bash
repomix --split-output 1mb
```

This generates numbered files like:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

Size can be specified with units: `500kb`, `1mb`, `2mb`, `1.5mb`, etc. Decimal values are supported.

> [!NOTE]
> Files are grouped by top-level directory to maintain context. A single file or directory will never be split across multiple output files.

### Remote Repositories
```bash
# Using GitHub URL
repomix --remote https://github.com/user/repo

# Using shorthand
repomix --remote user/repo

# Specific branch/tag/commit
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### File List Input (stdin)

Pass file paths via stdin for ultimate flexibility:

```bash
# Using find command
find src -name "*.ts" -type f | repomix --stdin

# Using git to get tracked files
git ls-files "*.ts" | repomix --stdin

# Using ripgrep (rg) to find files
rg --files --type ts | repomix --stdin

# Using grep to find files containing specific content
grep -l "TODO" **/*.ts | repomix --stdin

# Using ripgrep to find files with specific content
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Using sharkdp/fd to find files
fd -e ts | repomix --stdin

# Using fzf to select from all files
fzf -m | repomix --stdin

# Interactive file selection with fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Using ls with glob patterns
ls src/**/*.ts | repomix --stdin

# From a file containing file paths
cat file-list.txt | repomix --stdin

# Direct input with echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

The `--stdin` option allows you to pipe a list of file paths to Repomix, giving you ultimate flexibility in selecting which files to pack.

When using `--stdin`, the specified files are effectively added to the include patterns. This means that the normal include and ignore behavior still applies - files specified via stdin will still be excluded if they match ignore patterns.

> [!NOTE]
> When using `--stdin`, file paths can be relative or absolute, and Repomix will automatically handle path resolution and deduplication.

### Code Compression

```bash
repomix --compress

# You can also use it with remote repositories:
repomix --remote yamadashy/repomix --compress
```

### Git Integration

Include Git information to provide development context for AI analysis:

```bash
# Include git diffs (uncommitted changes)
repomix --include-diffs

# Include git commit logs (last 50 commits by default)
repomix --include-logs

# Include specific number of commits
repomix --include-logs --include-logs-count 10

# Include both diffs and logs
repomix --include-diffs --include-logs
```

This adds valuable context about:
- **Recent changes**: Git diffs show uncommitted modifications
- **Development patterns**: Git logs reveal which files are typically changed together
- **Commit history**: Recent commit messages provide insight into development focus
- **File relationships**: Understanding which files are modified in the same commits

### Token Count Optimization

Understanding your codebase's token distribution is crucial for optimizing AI interactions. Use the `--token-count-tree` option to visualize token usage across your project:

```bash
repomix --token-count-tree
```

This displays a hierarchical view of your codebase with token counts:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

You can also set a minimum token threshold to focus on larger files:

```bash
repomix --token-count-tree 1000  # Only show files/directories with 1000+ tokens
```

This helps you:
- **Identify token-heavy files** that might exceed AI context limits
- **Optimize file selection** using `--include` and `--ignore` patterns  
- **Plan compression strategies** by targeting the largest contributors
- **Balance content vs. context** when preparing code for AI analysis

## Output Formats

### XML (Default)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### Plain Text
```bash
repomix --style plain
```

## Additional Options

### Remove Comments
```bash
repomix --remove-comments
```

### Show Line Numbers
```bash
repomix --output-show-line-numbers
```

### Copy to Clipboard
```bash
repomix --copy
```

### Disable Security Check
```bash
repomix --no-security-check
```

## Configuration

Initialize configuration file:
```bash
repomix --init
```

See [Configuration Guide](/guide/configuration) for detailed options.
