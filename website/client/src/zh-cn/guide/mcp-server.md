# MCP 服务器

Repomix 支持 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)，允许 AI 助手直接与您的代码库交互。当作为 MCP 服务器运行时，Repomix 提供了工具，使 AI 助手能够在无需手动准备文件的情况下打包本地或远程仓库进行分析。

## 将 Repomix 作为 MCP 服务器运行

要将 Repomix 作为 MCP 服务器运行，请使用 `--mcp` 标志：

```bash
repomix --mcp
```

这会以 MCP 服务器模式启动 Repomix，使其可供支持 Model Context Protocol 的 AI 助手使用。

## 可用的 MCP 工具

当作为 MCP 服务器运行时，Repomix 提供以下工具：

### pack_codebase

此工具将本地代码目录打包成一个用于 AI 分析的整合文件。

**参数：**
- `directory`：（必需）要打包的目录的绝对路径
- `compress`：（可选，默认值：true）是否执行智能代码提取以减少令牌计数
- `includePatterns`：（可选）以逗号分隔的包含模式列表
- `ignorePatterns`：（可选）以逗号分隔的忽略模式列表

**示例：**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

此工具获取、克隆并将 GitHub 仓库打包成一个用于 AI 分析的整合文件。

**参数：**
- `remote`：（必需）GitHub 仓库 URL 或用户/仓库格式（例如，yamadashy/repomix）
- `compress`：（可选，默认值：true）是否执行智能代码提取以减少令牌计数
- `includePatterns`：（可选）以逗号分隔的包含模式列表
- `ignorePatterns`：（可选）以逗号分隔的忽略模式列表

**示例：**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

## 配置 MCP 服务器

要将 Repomix 作为 MCP 服务器与 Claude 等 AI 助手一起使用，您需要配置 MCP 设置：

### 对于 Cline（VS Code 扩展）

编辑 `cline_mcp_settings.json` 文件：

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

### 对于 Claude Desktop

使用与 Cline 类似的配置编辑 `claude_desktop_config.json` 文件。

## 将 Repomix 作为 MCP 服务器使用的好处

将 Repomix 作为 MCP 服务器使用提供了几个优势：

1. **直接集成**：AI 助手可以直接分析您的代码库，无需手动文件准备。
2. **高效工作流**：通过消除手动生成和上传文件的需求，简化了代码分析过程。
3. **一致输出**：确保 AI 助手以一致、优化的格式接收代码库。
4. **高级功能**：利用 Repomix 的所有功能，如代码压缩、令牌计数和安全检查。

配置完成后，您的 AI 助手可以直接使用 Repomix 的功能来分析代码库，使代码分析工作流更加高效。
