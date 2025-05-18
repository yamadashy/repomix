# MCP服务器

Repomix 支持 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)，允许 AI 助手直接与您的代码库交互。当作为 MCP 服务器运行时，Repomix 提供了工具，使 AI 助手能够在无需手动准备文件的情况下打包本地或远程仓库进行分析。这种集成消除了手动生成和上传文件的需求，从而简化了代码分析过程。

> [!NOTE]  
> 这是一个实验性功能，我们将根据用户反馈和实际使用情况积极改进

## 将 Repomix 作为 MCP 服务器运行

要将 Repomix 作为 MCP 服务器运行，请使用 `--mcp` 标志：

```bash
repomix --mcp
```

这会以 MCP 服务器模式启动 Repomix，使其可供支持 Model Context Protocol 的 AI 助手使用。

## 配置 MCP 服务器

要将 Repomix 作为 MCP 服务器与 Claude 等 AI 助手一起使用，您需要配置 MCP 设置：

### 对于 VS Code

您可以使用以下方法之一在 VS Code 中安装 Repomix MCP 服务器：

1. **使用安装徽章：**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **使用命令行：**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  对于 VS Code Insiders：
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

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

### 对于 Cursor

在 Cursor 中，从 `Cursor Settings` > `MCP` > `+ Add new global MCP server` 添加一个新的 MCP 服务器，配置与 Cline 类似。

### 对于 Claude Desktop

使用与 Cline 类似的配置编辑 `claude_desktop_config.json` 文件。

### 使用 Docker 代替 npx 运行

您可以使用 Docker 代替 npx 来运行 Repomix 作为 MCP 服务器，这提供了一个容器化的执行环境：

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

### read_repomix_output

此工具在无法直接访问文件的环境中读取Repomix输出文件的内容。

**参数：**
- `outputId`：（必需）要读取的Repomix输出文件的ID

**功能：**
- 专为基于Web的环境或沙箱应用程序设计
- 使用其ID检索先前生成的输出内容
- 无需文件系统访问权限即可安全访问打包的代码库

**示例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file 和 file_system_read_directory

Repomix的MCP服务器提供了两个文件系统工具，允许AI助手安全地与本地文件系统交互：

1. `file_system_read_file`
  - 使用绝对路径读取文件内容
  - 使用[Secretlint](https://github.com/secretlint/secretlint)实现安全验证
  - 防止访问包含敏感信息的文件
  - 对无效路径和安全问题返回清晰的错误消息

2. `file_system_read_directory`
  - 使用绝对路径列出目录内容
  - 使用清晰的指示符（`[FILE]`或`[DIR]`）显示文件和目录
  - 提供安全的目录遍历和适当的错误处理
  - 验证路径并确保使用绝对路径

这两个工具都包含了强大的安全措施：
- 绝对路径验证以防止目录遍历攻击
- 权限检查以确保适当的访问权限
- 与Secretlint集成以检测敏感信息
- 清晰的错误消息以便于调试和安全意识
- 文件类型验证以防止访问二进制文件和可执行文件

**示例：**
```typescript
// 读取文件
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// 列出目录内容
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

这些工具在AI助手需要执行以下操作时特别有用：
- 分析代码库中的特定文件
- 导航目录结构
- 验证文件存在性和可访问性
- 确保安全的文件系统操作

## 将 Repomix 作为 MCP 服务器使用的好处

将 Repomix 作为 MCP 服务器使用提供了几个优势：

1. **直接集成**：AI 助手可以直接分析您的代码库，无需手动文件准备。
2. **高效工作流**：通过消除手动生成和上传文件的需求，简化了代码分析过程。
3. **一致输出**：确保 AI 助手以一致、优化的格式接收代码库。
4. **高级功能**：利用 Repomix 的所有功能，如代码压缩、令牌计数和安全检查。
5. **安全控制**：通过内置的安全验证功能，提供对代码库的安全访问。

配置完成后，您的 AI 助手可以直接使用 Repomix 的功能来分析代码库，使代码分析工作流更加高效。
