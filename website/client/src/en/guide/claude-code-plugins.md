# Claude Code Plugins

Repomix provides official plugins for [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) that integrate seamlessly with the AI-powered development environment. These plugins make it easy to analyze and pack codebases directly within Claude Code using natural language commands.

## Installation

### 1. Add the Repomix Plugin Marketplace

First, add the Repomix plugin marketplace to Claude Code:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Install Plugins

Install the plugins using the following commands:

```text
# Install MCP server plugin (recommended foundation)
/plugin install repomix-mcp@repomix

# Install commands plugin (extends functionality)
/plugin install repomix-commands@repomix

# Install repository explorer plugin (AI-powered analysis)
/plugin install repomix-explorer@repomix
```

::: tip Plugin Relationship
The `repomix-mcp` plugin is recommended as a foundation. The `repomix-commands` plugin provides convenient slash commands, while `repomix-explorer` adds AI-powered analysis capabilities. While you can install them independently, using all three provides the most comprehensive experience.
:::

### Alternative: Interactive Installation

You can also use the interactive plugin installer:

```text
/plugin
```

This opens an interactive interface where you can browse and install available plugins.

## Available Plugins

### 1. repomix-mcp (MCP Server Plugin)

Foundation plugin that provides AI-powered codebase analysis through MCP server integration.

**Features:**
- Pack local and remote repositories
- Search through packed outputs
- Read files with built-in security scanning ([Secretlint](https://github.com/secretlint/secretlint))
- Automatic Tree-sitter compression (~70% token reduction)

### 2. repomix-commands (Slash Commands Plugin)

Provides convenient slash commands for quick operations with natural language support.

**Available Commands:**
- `/repomix-commands:pack-local` - Pack local codebase with various options
- `/repomix-commands:pack-remote` - Pack and analyze remote GitHub repositories

### 3. repomix-explorer (AI Analysis Agent Plugin)

AI-powered repository analysis agent that intelligently explores codebases using Repomix CLI.

**Features:**
- Natural language codebase exploration and analysis
- Intelligent pattern discovery and code structure understanding
- Incremental analysis using grep and targeted file reading
- Automatic context management for large repositories

**Available Commands:**
- `/repomix-explorer:explore-local` - Analyze local codebase with AI assistance
- `/repomix-explorer:explore-remote` - Analyze remote GitHub repositories with AI assistance

**How it works:**
1. Runs `npx repomix@latest` to pack the repository
2. Uses Grep and Read tools to efficiently search the output
3. Provides comprehensive analysis without consuming excessive context

## Usage Examples

### Packing a Local Codebase

Use the `/repomix-commands:pack-local` command with natural language instructions:

```text
/repomix-commands:pack-local
Pack this project as markdown with compression
```

Other examples:
- "Pack the src directory only"
- "Pack TypeScript files with line numbers"
- "Generate output in JSON format"

### Packing a Remote Repository

Use the `/repomix-commands:pack-remote` command to analyze GitHub repositories:

```text
/repomix-commands:pack-remote yamadashy/repomix
Pack only TypeScript files from the yamadashy/repomix repository
```

Other examples:
- "Pack the main branch with compression"
- "Include only documentation files"
- "Pack specific directories"

### Exploring a Local Codebase with AI

Use the `/repomix-explorer:explore-local` command for AI-powered analysis:

```text
/repomix-explorer:explore-local ./src
Find all authentication-related code
```

Other examples:
- "Analyze the structure of this project"
- "Show me the main components"
- "Find all API endpoints"

### Exploring a Remote Repository with AI

Use the `/repomix-explorer:explore-remote` command to analyze GitHub repositories:

```text
/repomix-explorer:explore-remote facebook/react
Show me the main component architecture
```

Other examples:
- "Find all React hooks in the repository"
- "Explain the project structure"
- "Where are error boundaries defined?"

## Related Resources

- [MCP Server Documentation](/guide/mcp-server) - Learn about the underlying MCP server
- [Configuration](/guide/configuration) - Customize Repomix behavior
- [Security](/guide/security) - Understanding security features
- [Command Line Options](/guide/command-line-options) - Available CLI options

## Plugin Source Code

The plugin source code is available in the Repomix repository:

- [Plugin Marketplace](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Commands Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Repository Explorer Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Feedback and Support

If you encounter issues or have suggestions for the Claude Code plugins:

- [Open an issue on GitHub](https://github.com/yamadashy/repomix/issues)
- [Join our Discord community](https://discord.gg/wNYzTwZFku)
- [View existing discussions](https://github.com/yamadashy/repomix/discussions)
