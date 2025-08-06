# Repomix MCP Server Installation Guide

This guide is specifically designed for AI agents like Cline to install and configure the Repomix MCP server for use with LLM applications like Claude Desktop, Cursor, Roo Code, and Cline.

## Overview

Repomix MCP server is a powerful tool that packages local or remote codebases into AI-friendly formats. It allows AI assistants to analyze code efficiently without manual file preparation, optimizing token usage and providing consistent output.

## Prerequisites

Before installation, you need:

1. Node.js 20.0.0 or higher
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

This tool packages a local code directory into a consolidated XML file for AI analysis. It analyzes the codebase structure, extracts relevant code content, and generates a comprehensive report including metrics, file tree, and formatted code content.

**Parameters:**
- `directory`: (Required) Absolute path to the directory to pack
- `compress`: (Optional, default: false) Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details. Reduces token usage by ~70% while preserving semantic meaning. Generally not needed since grep_repomix_output allows incremental content retrieval. Use only when you specifically need the entire codebase content for large repositories.
- `includePatterns`: (Optional) Specify files to include using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "**/*.{js,ts}", "src/**,docs/**"). Only matching files will be processed.
- `ignorePatterns`: (Optional) Specify additional files to exclude using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "test/**,*.spec.js", "node_modules/**,dist/**"). These patterns supplement .gitignore and built-in exclusions.
- `topFilesLength`: (Optional, default: 10) Number of largest files by size to display in the metrics summary for codebase analysis.

**Example:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### 2. attach_packed_output

This tool attaches an existing Repomix packed output file for AI analysis. It allows you to work with previously generated packed repositories without requiring re-processing.

**Parameters:**
- `path`: (Required) Path to a directory containing repomix-output.xml or direct path to a packed repository XML file
- `topFilesLength`: (Optional, default: 10) Number of largest files by size to display in the metrics summary

**Features:**
- Accepts either a directory containing a repomix-output.xml file or a direct path to an XML file
- Registers the file with the MCP server and returns the same structure as the pack_codebase tool
- Provides secure access to existing packed outputs without requiring re-processing
- Useful for working with previously generated packed repositories

**Example:**
```json
{
  "path": "/path/to/directory/with/repomix-output.xml",
  "topFilesLength": 10
}
```

### 3. pack_remote_repository

This tool fetches, clones, and packages a GitHub repository into a consolidated XML file for AI analysis. It automatically clones the remote repository, analyzes its structure, and generates a comprehensive report.

**Parameters:**
- `remote`: (Required) GitHub repository URL or user/repo format (e.g., "yamadashy/repomix", "https://github.com/user/repo", or "https://github.com/user/repo/tree/branch")
- `compress`: (Optional, default: false) Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details. Reduces token usage by ~70% while preserving semantic meaning. Generally not needed since grep_repomix_output allows incremental content retrieval. Use only when you specifically need the entire codebase content for large repositories.
- `includePatterns`: (Optional) Specify files to include using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "**/*.{js,ts}", "src/**,docs/**"). Only matching files will be processed.
- `ignorePatterns`: (Optional) Specify additional files to exclude using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "test/**,*.spec.js", "node_modules/**,dist/**"). These patterns supplement .gitignore and built-in exclusions.
- `topFilesLength`: (Optional, default: 10) Number of largest files by size to display in the metrics summary for codebase analysis.

**Example:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### 4. read_repomix_output

This tool reads the contents of a Repomix-generated output file. Supports partial reading with line range specification for large files. This tool is designed for environments where direct file system access is limited.

**Parameters:**
- `outputId`: (Required) ID of the Repomix output file to read
- `startLine`: (Optional) Starting line number (1-based, inclusive). If not specified, reads from beginning.
- `endLine`: (Optional) Ending line number (1-based, inclusive). If not specified, reads to end.

**Features:**
- Specifically designed for web-based environments or sandboxed applications
- Retrieves the content of previously generated outputs using their ID
- Provides secure access to packed codebase without requiring file system access
- Supports partial reading for large files

**Example:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### 5. grep_repomix_output

This tool searches for patterns in a Repomix output file using grep-like functionality with JavaScript RegExp syntax. Returns matching lines with optional context lines around matches.

**Parameters:**
- `outputId`: (Required) ID of the Repomix output file to search
- `pattern`: (Required) Search pattern (JavaScript RegExp regular expression syntax)
- `contextLines`: (Optional, default: 0) Number of context lines to show before and after each match. Overridden by beforeLines/afterLines if specified.
- `beforeLines`: (Optional) Number of context lines to show before each match (like grep -B). Takes precedence over contextLines.
- `afterLines`: (Optional) Number of context lines to show after each match (like grep -A). Takes precedence over contextLines.
- `ignoreCase`: (Optional, default: false) Perform case-insensitive matching

**Features:**
- Uses JavaScript RegExp syntax for powerful pattern matching
- Supports context lines for better understanding of matches
- Allows separate control of before/after context lines
- Case-sensitive and case-insensitive search options

**Example:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### 6. file_system_read_file

This tool reads a file from the local file system using an absolute path. Includes built-in security validation to detect and prevent access to files containing sensitive information.

**Parameters:**
- `path`: (Required) Absolute path to the file to read

**Security features:**
- Implements security validation using [Secretlint](https://github.com/secretlint/secretlint)
- Prevents access to files containing sensitive information (API keys, passwords, secrets)
- Validates absolute paths to prevent directory traversal attacks

**Example:**
```json
{
  "path": "/absolute/path/to/file.txt"
}
```

### 7. file_system_read_directory

This tool lists the contents of a directory using an absolute path. Returns a formatted list showing files and subdirectories with clear indicators.

**Parameters:**
- `path`: (Required) Absolute path to the directory to list

**Features:**
- Shows files and directories with clear indicators (`[FILE]` or `[DIR]`)
- Provides safe directory traversal with proper error handling
- Validates paths and ensures they are absolute
- Useful for exploring project structure and understanding codebase organization

**Example:**
```json
{
  "path": "/absolute/path/to/directory"
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
