# Troubleshooting

This guide helps you solve common issues when using Repomix.

## Common Issues

### Output File is Too Large

If your output file exceeds the token limit for your AI model:

```bash
# Compress code to reduce token count
repomix --compress

# Remove comments to further reduce size
repomix --compress --remove-comments

# Focus on specific directories
repomix --include "src/**/*.ts" --compress
```

### Repository Clone Fails

If cloning a remote repository fails:

1. Ensure you have git installed: `git --version`
2. Check your internet connection
3. Verify the repository exists and is accessible
4. For private repositories, ensure you have proper authentication

### Security Checks Blocking Output

If security checks are preventing output generation:

```bash
# Run with verbose logging to see which files are flagged
repomix --verbose

# Temporarily disable security checks (use with caution!)
repomix --no-security-check

# Create a focused output excluding sensitive directories
repomix --ignore "config/,secrets/,credentials/"
```

### Large Files Being Skipped

If important large files are being skipped:

```bash
# Increase the maximum file size limit (in bytes)
repomix --max-file-size 100000000
```

### MCP Server Connection Issues

If you're having trouble connecting to the MCP server:

1. Ensure the server is running: `repomix --mcp`
2. Check if the port is blocked by a firewall
3. Verify the connection configuration in your AI tool
4. Look for error messages in the server logs

## Environment-Specific Issues

### Node.js Version Incompatibility

Repomix requires Node.js 16 or later. If you encounter errors:

1. Check your Node.js version: `node --version`
2. Update Node.js if needed
3. Use nvm to switch to a compatible version: `nvm use 16`

### Docker Permission Issues

If you encounter permission issues with Docker:

```bash
# Run with the current user's UID/GID
docker run -v .:/app -it --rm --user $(id -u):$(id -g) ghcr.io/yamadashy/repomix
```

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/yamadashy/repomix/issues) for similar problems
2. Join our [Discord community](https://discord.gg/wNYzTwZFku) for support
3. Open a new issue with detailed information about your problem
