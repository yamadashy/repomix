# Repomix MCP Server Installation Guide

This guide is specifically designed for AI agents like Cline to install and configure the Repomix MCP server for use with LLM applications like Claude Desktop, Cursor, Roo Code, and Cline.

## Overview

Repomix MCP server is a powerful tool that packages local or remote codebases into AI-friendly formats. It allows AI assistants to analyze code efficiently without manual file preparation, optimizing token usage and providing consistent output.

## Prerequisites

Before installation, you need:

1. Node.js 18.0.0 or higher
2. npm (Node Package Manager)

## Installation and Configuration

### Configure MCP Settings

Add the Repomix MCP server configuration to your MCP settings file based on your LLM client:

#### Configuration File Locations

- Cline (VS Code Extension): `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Roo Code (VS Code Extension): `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Cursor: `[project root]/.cursor/mcp.json`

Add this configuration to your chosen client's settings file:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

This configuration uses `npx` to run Repomix directly without requiring a global installation.

## Available MCP Tools

Once configured, you'll have access to these Repomix tools:

### 1. pack_codebase

This tool packages a local code directory into a consolidated file for AI analysis.

**Parameters:**
- `directory`: (Required) Absolute path to the directory to pack
- `compress`: (Optional, default: true) Whether to perform intelligent code extraction to reduce token count
- `includePatterns`: (Optional) Comma-separated list of include patterns
- `ignorePatterns`: (Optional) Comma-separated list of ignore patterns

**Example:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### 2. pack_remote_repository

This tool fetches, clones, and packages a GitHub repository into a consolidated file for AI analysis.

**Parameters:**
- `remote`: (Required) GitHub repository URL or user/repo format (e.g., yamadashy/repomix)
- `compress`: (Optional, default: true) Whether to perform intelligent code extraction to reduce token count
- `includePatterns`: (Optional) Comma-separated list of include patterns
- `ignorePatterns`: (Optional) Comma-separated list of ignore patterns

**Example:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

## Verify Installation

To verify the installation is working:

1. Restart your LLM application (Cline, Claude Desktop, etc.)
2. Test the connection by running a simple command like:
   ```
   Please package the local directory /path/to/project for AI analysis using Repomix.
   ```
   or
   ```
   Please fetch and package the GitHub repository yamadashy/repomix for AI analysis.
   ```

## Usage Examples

Here are some examples of how to use Repomix MCP server with AI assistants:

### Local Codebase Analysis

```
Can you analyze the code in my project at /path/to/project? Please use Repomix to package it first.
```

### Remote Repository Analysis

```
I'd like you to review the code in the GitHub repository username/repo. Please use Repomix to package it first.
```

### Specific File Types Analysis

```
Please package my project at /path/to/project, but only include TypeScript files and markdown documentation.
```

## Troubleshooting

### Common Issues and Solutions

1. **MCP server connection issues**
   - Verify the syntax in your MCP settings file is correct
   - Ensure you have an active internet connection (needed for npx to fetch the package)
   - Check if any other MCP servers are causing conflicts

2. **Packaging failures**
   - Verify the specified directory or repository exists
   - Check if you have sufficient disk space
   - For remote repositories, ensure you have internet connectivity
   - Try with simpler parameters first, then add complexity

3. **JSON parsing errors in configuration**
   - Make sure your MCP settings file is properly formatted
   - Verify all paths use forward slashes, even on Windows
   - Check for any missing commas or brackets in the configuration

## Additional Information

For more detailed information, visit the [Repomix official documentation](https://repomix.com). You can also join the [Discord community](https://discord.gg/wNYzTwZFku) for support and questions.
