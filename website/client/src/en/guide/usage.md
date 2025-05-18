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

## Advanced Usage Scenarios

### Working with Large Repositories

When working with large repositories, consider the following strategies to optimize output:

```bash
# Selectively include specific directories and file types
repomix --include "src/**/*.ts,src/**/*.js,docs/**/*.md" --ignore "**/*.test.ts"

# Reduce token count by removing comments and empty lines
repomix --remove-comments --remove-empty-lines

# Use compression to further reduce token count while preserving structure
repomix --compress --include "src/**" --ignore "**/*.test.ts,**/__tests__/**"
```

### Integrating with CI/CD Pipelines

Repomix can be integrated into continuous integration workflows:

```bash
# Generate output in a specific format during CI runs
repomix --style markdown --output ci-output.md --compress

# Combine with other tools in a pipeline
repomix --output repo-analysis.xml | some-other-tool
```

### Cross-Repository Analysis

Compare multiple repositories by processing them separately:

```bash
# Process multiple repositories with consistent settings
repomix --remote org/repo1 --output repo1.xml --compress
repomix --remote org/repo2 --output repo2.xml --compress

# Use similar settings for local and remote repositories
repomix ./local-repo --output local.xml --compress
repomix --remote org/remote-repo --output remote.xml --compress
```

## Configuration

Initialize configuration file:
```bash
repomix --init
```

See [Configuration Guide](/guide/configuration) for detailed options.
