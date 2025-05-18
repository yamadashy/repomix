# Basic Usage

## Quick Start

Pack your entire repository:
```bash
repomix
```

## Common Use Cases

### Pack Specific Directories
Process only specific directories or files to focus on relevant code and reduce token count:
```bash
repomix path/to/directory
```

### Include Specific Files
Use [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) to precisely control which files are included:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Exclude Files
Skip certain files or directories using glob patterns to avoid including unnecessary or sensitive content:
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


### Code Compression

Use Tree-sitter to intelligently extract essential code structures while removing implementation details, significantly reducing token count while preserving architecture:

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
