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

### File List Input (pipe via stdin)

Pass file paths via stdin for ultimate flexibility:

```bash
# Using find command
find src -name "*.ts" -type f | repomix

# Using git to get tracked files
git ls-files "*.ts" | repomix

# Using ls with glob patterns
ls src/**/*.ts | repomix

# From a file containing file paths
cat file-list.txt | repomix

# Direct input with echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix

# Using find command with a dash (explicit stdin indicator)
find src -name "*.ts" | repomix -
```

Repomix automatically detects when file paths are piped via stdin, giving you ultimate flexibility in selecting which files to pack.

> [!NOTE]
> When using stdin input, file paths can be relative or absolute, and Repomix will automatically handle path resolution and deduplication.

### Code Compression

```bash
repomix --compress

# You can also use it with remote repositories:
repomix --remote yamadashy/repomix --compress
```

## Output Formats

### XML (Default)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
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
