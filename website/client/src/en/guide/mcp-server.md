# MCP Server

Repomix supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing AI assistants to directly interact with your codebase. When run as an MCP server, Repomix provides tools that enable AI assistants to package local or remote repositories for analysis without requiring manual file preparation.

> [!NOTE]  
> This is an experimental feature that we'll be actively improving based on user feedback and real-world usage

## Running Repomix as an MCP Server

To run Repomix as an MCP server, use the `--mcp` flag:

```bash
repomix --mcp
```

This starts Repomix in MCP server mode, making it available for AI assistants that support the Model Context Protocol.

## Configuring MCP Servers

To use Repomix as an MCP server with AI assistants like Claude, you need to configure the MCP settings:

### For VS Code

You can install the Repomix MCP server in VS Code using one of these methods:

1. **Using the Install Badge:**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Using the Command Line:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  For VS Code Insiders:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### For Cline (VS Code extension)

Edit the `cline_mcp_settings.json` file:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### For Cursor

In Cursor, add a new MCP server from `Cursor Settings` > `MCP` > `+ Add new global MCP server` with a configuration similar to Cline.

### For Claude Desktop

Edit the `claude_desktop_config.json` file with similar configuration to Cline's config.

### For Claude Code

Configure Repomix as an MCP server in [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) using the following command:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Alternatively, you can use the **official Repomix plugins** for a more convenient experience. The plugins provide natural language commands and easier setup. See the [Claude Code Plugins](/guide/claude-code-plugins) documentation for details.

### Using Docker instead of npx

Instead of using npx, you can also use Docker to run Repomix as an MCP server:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Available MCP Tools

When running as an MCP server, Repomix provides the following tools:

### pack_codebase

This tool packages a local code directory into a consolidated XML file for AI analysis. It analyzes the codebase structure, extracts relevant code content, and generates a comprehensive report including metrics, file tree, and formatted code content.

**Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `directory` | Yes | — | Absolute path to the directory to pack |
| `compress` | No | `false` | Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details. Reduces token usage by ~70% while preserving semantic meaning. Generally not needed since `grep_repomix_output` allows incremental content retrieval. |
| `includePatterns` | No | — | Files to include using fast-glob patterns. Comma-separated (e.g., `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | No | — | Additional files to exclude using fast-glob patterns. Comma-separated (e.g., `"test/**,*.spec.js"`). Supplements `.gitignore` and built-in exclusions. |
| `topFilesLength` | No | `10` | Number of largest files by size to display in the metrics summary |

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

### pack_remote_repository

This tool fetches, clones, and packages a GitHub repository into a consolidated XML file for AI analysis. It automatically clones the remote repository, analyzes its structure, and generates a comprehensive report.

**Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `remote` | Yes | — | GitHub repository URL or `user/repo` format (e.g., `"yamadashy/repomix"`, `"https://github.com/user/repo"`, or `"https://github.com/user/repo/tree/branch"`) |
| `compress` | No | `false` | Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details. Reduces token usage by ~70% while preserving semantic meaning. |
| `includePatterns` | No | — | Files to include using fast-glob patterns. Comma-separated (e.g., `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | No | — | Additional files to exclude using fast-glob patterns. Comma-separated (e.g., `"test/**,*.spec.js"`). Supplements `.gitignore` and built-in exclusions. |
| `topFilesLength` | No | `10` | Number of largest files by size to display in the metrics summary |

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

### read_repomix_output

This tool reads the contents of a Repomix-generated output file. Supports partial reading with line range specification for large files. This tool is designed for environments where direct file system access is limited.

**Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `outputId` | Yes | — | ID of the Repomix output file to read |
| `startLine` | No | Beginning of file | Starting line number (1-based, inclusive) |
| `endLine` | No | End of file | Ending line number (1-based, inclusive) |

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

### grep_repomix_output

This tool searches for patterns in a Repomix output file using grep-like functionality with JavaScript RegExp syntax. Returns matching lines with optional context lines around matches.

**Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `outputId` | Yes | — | ID of the Repomix output file to search |
| `pattern` | Yes | — | Search pattern (JavaScript RegExp syntax) |
| `contextLines` | No | `0` | Number of context lines before and after each match. Overridden by `beforeLines`/`afterLines` if specified. |
| `beforeLines` | No | — | Lines to show before each match (like `grep -B`). Takes precedence over `contextLines`. |
| `afterLines` | No | — | Lines to show after each match (like `grep -A`). Takes precedence over `contextLines`. |
| `ignoreCase` | No | `false` | Perform case-insensitive matching |

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

### file_system_read_file and file_system_read_directory

Repomix's MCP server provides two file system tools that allow AI assistants to safely interact with the local file system:

1. `file_system_read_file`
  - Reads file contents from the local file system using absolute paths
  - Includes built-in security validation to detect and prevent access to files containing sensitive information
  - Implements security validation using [Secretlint](https://github.com/secretlint/secretlint)
  - Prevents access to files containing sensitive information (API keys, passwords, secrets)
  - Validates absolute paths to prevent directory traversal attacks
  - Returns formatted content with clear error messages for invalid paths or security issues

2. `file_system_read_directory`
  - Lists the contents of a directory using an absolute path
  - Returns a formatted list showing files and subdirectories with clear indicators
  - Shows both files and directories with clear indicators (`[FILE]` or `[DIR]`)
  - Provides safe directory traversal with proper error handling
  - Validates paths and ensures they are absolute
  - Useful for exploring project structure and understanding codebase organization

Both tools incorporate robust security measures:
- Absolute path validation to prevent directory traversal attacks
- Permission checks to ensure proper access rights
- Integration with Secretlint for sensitive information detection
- Clear error messaging for better debugging and security awareness

**Example:**
```typescript
// Reading a file
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Listing directory contents
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

These tools are particularly useful when AI assistants need to:
- Analyze specific files in the codebase
- Navigate directory structures
- Verify file existence and accessibility
- Ensure secure file system operations

## Benefits of Using Repomix as an MCP Server

Using Repomix as an MCP server offers several advantages:

1. **Direct Integration**: AI assistants can directly analyze your codebase without manual file preparation.
2. **Efficient Workflow**: Streamlines the process of code analysis by eliminating the need to manually generate and upload files.
3. **Consistent Output**: Ensures that the AI assistant receives the codebase in a consistent, optimized format.
4. **Advanced Features**: Leverages all of Repomix's features like code compression, token counting, and security checks.

Once configured, your AI assistant can directly use Repomix's capabilities to analyze codebases, making code analysis workflows more efficient.

## Related Resources

- [Claude Code Plugins](/guide/claude-code-plugins) - Convenient plugin integration for Claude Code
- [Configuration](/guide/configuration) - Customize Repomix behavior
- [Command Line Options](/guide/command-line-options) - Full CLI reference
- [Output Formats](/guide/output) - Learn about available output formats
