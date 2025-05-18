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

### pack_remote_repository

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

### read_repomix_output

This tool reads the contents of a Repomix output file in environments where direct file access is not possible.

**Parameters:**
- `outputId`: (Required) ID of the Repomix output file to read

**Features:**
- Specifically designed for web-based environments or sandboxed applications
- Retrieves the content of previously generated outputs using their ID
- Provides secure access to packed codebase without requiring file system access

**Example:**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file and file_system_read_directory

Repomix's MCP server provides two file system tools that allow AI assistants to safely interact with the local file system:

1. `file_system_read_file`
  - Reads file contents using absolute paths
  - Implements security validation using [Secretlint](https://github.com/secretlint/secretlint)
  - Prevents access to files containing sensitive information
  - Returns formatted content with clear error messages for invalid paths or security issues

2. `file_system_read_directory`
  - Lists directory contents using absolute paths
  - Shows both files and directories with clear indicators (`[FILE]` or `[DIR]`)
  - Provides safe directory traversal with proper error handling
  - Validates paths and ensures they are absolute

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

## Advanced MCP Server Configuration

### Custom Port Configuration

By default, the MCP server runs on port 9080. You can specify a different port:

```bash
repomix --mcp --mcp-port 8080
```

### Environment Variables

The MCP server respects the following environment variables:

- `REPOMIX_MCP_PORT`: Sets the server port
- `REPOMIX_MCP_HOST`: Sets the server host
- `REPOMIX_SECURITY_DISABLED`: Disables security checks when set to `true`

### Multiple Tool Instances

You can run multiple MCP server instances with different configurations:

1. Configure different port numbers for each instance
2. Register each instance separately in your AI tool configuration

## Troubleshooting MCP Server Issues

### Connection Refused

If you see "Connection refused" errors:

1. Verify the server is running: `ps aux | grep repomix`
2. Check if the port is already in use: `lsof -i :9080`
3. Try running on a different port: `repomix --mcp --mcp-port 8081`

### Authentication Issues

If the AI assistant cannot authenticate with the MCP server:

1. Check your MCP server configuration
2. Verify that your AI tool supports the MCP protocol version used by Repomix
3. Check for any required authentication tokens or API keys

### Performance Optimization

If the MCP server is slow when processing large repositories:

1. Limit the scope with include/ignore patterns
2. Enable compression to reduce processing time
3. Consider running the server on a machine with more resources

### Debugging MCP Requests

To diagnose issues with MCP requests:

```bash
# Enable verbose logging
repomix --mcp --verbose

# Save logs to a file
repomix --mcp --verbose > mcp-server.log 2>&1
```
