# MCP Server

Repomix supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing AI assistants to directly interact with your codebase. When run as an MCP server, Repomix provides tools that enable AI assistants to package local or remote repositories for analysis without requiring manual file preparation.

## Running Repomix as an MCP Server

To run Repomix as an MCP server, use the `--mcp` flag:

```bash
repomix --mcp
```

This starts Repomix in MCP server mode, making it available for AI assistants that support the Model Context Protocol.

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

## Configuring MCP Servers

To use Repomix as an MCP server with AI assistants like Claude, you need to configure the MCP settings:

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

### For Claude Desktop

Edit the `claude_desktop_config.json` file with similar configuration to Cline's config.

## Benefits of Using Repomix as an MCP Server

Using Repomix as an MCP server offers several advantages:

1. **Direct Integration**: AI assistants can directly analyze your codebase without manual file preparation.
2. **Efficient Workflow**: Streamlines the process of code analysis by eliminating the need to manually generate and upload files.
3. **Consistent Output**: Ensures that the AI assistant receives the codebase in a consistent, optimized format.
4. **Advanced Features**: Leverages all of Repomix's features like code compression, token counting, and security checks.

Once configured, your AI assistant can directly use Repomix's capabilities to analyze codebases, making code analysis workflows more efficient.
