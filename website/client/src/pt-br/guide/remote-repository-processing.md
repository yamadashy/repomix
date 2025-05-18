# Remote Repository Processing

Repomix supports processing remote Git repositories without the need for manual cloning. This feature allows you to quickly analyze any public Git repository with a single command, streamlining the workflow for code analysis.

## Basic Usage

Process public repositories:
```bash
# Using full URL
repomix --remote https://github.com/user/repo

# Using GitHub shorthand
repomix --remote user/repo
```

## Branch and Commit Selection

You can specify the branch name, tag, or commit hash:

```bash
# Specific branch using --remote-branch option
repomix --remote user/repo --remote-branch main

# Using branch's URL directly
repomix --remote https://github.com/user/repo/tree/main

# Tag
repomix --remote user/repo --remote-branch v1.0.0

# Specific commit hash using --remote-branch option
repomix --remote user/repo --remote-branch 935b695
```

## Requirements

- Git must be installed
- Internet connection
- Read access to repository

## Output Control

```bash
# Custom output location
repomix --remote user/repo -o custom-output.xml

# With XML format
repomix --remote user/repo --style xml

# Remove comments
repomix --remote user/repo --remove-comments
```

## Docker Usage

```bash
# Process and output to current directory
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# Output to specific directory
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Common Issues

### Access Issues
- Ensure repository is public
- Check Git installation
- Verify internet connection

### Large Repositories
- Use `--include` to select specific paths
- Enable `--remove-comments`
- Process branches separately
