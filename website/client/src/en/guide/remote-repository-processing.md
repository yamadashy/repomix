---
title: GitHub Repository Processing
description: Pack GitHub repositories with Repomix using full URLs, user/repo shorthand, branches, tags, commits, Docker, and remote config trust controls.
---

# GitHub Repository Processing

## Basic Usage

Process public repositories:
```bash
# Using full URL
repomix --remote https://github.com/user/repo

# Using GitHub shorthand
repomix --remote user/repo
```

You can also pass the `owner/repo` shorthand directly, without `--remote`:

```bash
repomix yamadashy/repomix
```

Since `owner/repo` also looks like a relative local path, Repomix only treats it as a remote repository when no local file or directory of that name exists and the repository is reachable on GitHub. A matching local path always takes precedence; to force local handling for an `owner/repo`-shaped path, prefix it with `./` (for example, `repomix ./owner/repo`). If the argument matches the pattern but the repository cannot be reached (for example, a private repository or a typo), Repomix falls back to handling it as a local path.

## Branch and Commit Selection

```bash
# Specific branch
repomix --remote user/repo --remote-branch main

# Tag
repomix --remote user/repo --remote-branch v1.0.0

# Commit hash
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

## Security

For security, config files (`repomix.config.*`) in remote repositories are not loaded by default. This prevents untrusted repositories from executing code via config files such as `repomix.config.ts`.

Your global config and CLI options are still applied.

To trust a remote repository's config:

```bash
# Using CLI flag
repomix --remote user/repo --remote-trust-config

# Using environment variable
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

When using `--config` with `--remote`, an absolute path is required:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
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

## Related Resources

- [Command Line Options](/guide/command-line-options) - Full CLI reference including `--remote` options
- [Configuration](/guide/configuration) - Set up default options for remote processing
- [Code Compression](/guide/code-compress) - Reduce output size for large repositories
- [Security](/guide/security) - How Repomix handles sensitive data detection
