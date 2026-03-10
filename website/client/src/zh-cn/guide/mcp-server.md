# MCP服务器

Repomix 支持 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)，允许 AI 助手直接与你的代码库交互。当作为 MCP 服务器运行时，Repomix 提供了工具，使 AI 助手能够在无需手动准备文件的情况下打包本地或远程仓库进行分析。

> [!NOTE]  
> 这是一个实验性功能，我们将根据用户反馈和实际使用情况积极改进

## 将 Repomix 作为 MCP 服务器运行

要将 Repomix 作为 MCP 服务器运行，请使用 `--mcp` 标志：

```bash
repomix --mcp
```

这会以 MCP 服务器模式启动 Repomix，使其可供支持 Model Context Protocol 的 AI 助手使用。

## 配置 MCP 服务器

要将 Repomix 作为 MCP 服务器与 Claude 等 AI 助手一起使用，你需要配置 MCP 设置：

### 对于 VS Code

你可以使用以下方法之一在 VS Code 中安装 Repomix MCP 服务器：

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

### 对于 Claude Code

要在 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) 中配置 Repomix 作为 MCP 服务器，请使用以下命令：

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

或者，你可以使用**官方Repomix插件**获得更便捷的体验。插件提供自然语言命令和更简单的设置。详情请参阅[Claude Code插件](/zh-cn/guide/claude-code-plugins)文档。

### 使用 Docker 代替 npx

你可以使用 Docker 代替 npx 来运行 Repomix 作为 MCP 服务器：

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

此工具将本地代码目录打包成一个用于 AI 分析的 XML 文件。它分析代码库结构，提取相关代码内容，并生成包含指标、文件树和格式化代码内容的综合报告。

**参数：**
- `directory`：（必需）要打包的目录的绝对路径
- `compress`：（可选，默认值：false）启用 Tree-sitter 压缩以提取基本代码签名和结构，同时删除实现细节。在保持语义信息的同时减少约 70% 的 token 用量。由于 grep_repomix_output 支持按需检索内容，一般不需要启用此选项。仅在你特别需要大型仓库的整个代码库内容时使用。
- `includePatterns`：（可选）使用 fast-glob 模式指定要包含的文件。多个模式可以用逗号分隔（例如，"**/*.{js,ts}", "src/**,docs/**"）。只有匹配的文件会被处理。
- `ignorePatterns`：（可选）使用 fast-glob 模式指定要排除的其他文件。多个模式可以用逗号分隔（例如，"test/**,*.spec.js", "node_modules/**,dist/**"）。这些模式补充 .gitignore 和内置排除。
- `topFilesLength`：（可选，默认值：10）在代码库分析的指标摘要中显示的最大文件数（按大小排序）。

**示例：**
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

此工具获取、克隆并将 GitHub 仓库打包成一个用于 AI 分析的 XML 文件。它自动克隆远程仓库，分析其结构，并生成综合报告。

**参数：**
- `remote`：（必需）GitHub 仓库 URL 或用户/仓库格式（例如，"yamadashy/repomix", "https://github.com/user/repo", 或 "https://github.com/user/repo/tree/branch"）
- `compress`：（可选，默认值：false）启用 Tree-sitter 压缩以提取基本代码签名和结构，同时删除实现细节。在保持语义信息的同时减少约 70% 的 token 用量。由于 grep_repomix_output 支持按需检索内容，一般不需要启用此选项。仅在你特别需要大型仓库的整个代码库内容时使用。
- `includePatterns`：（可选）使用 fast-glob 模式指定要包含的文件。多个模式可以用逗号分隔（例如，"**/*.{js,ts}", "src/**,docs/**"）。只有匹配的文件会被处理。
- `ignorePatterns`：（可选）使用 fast-glob 模式指定要排除的其他文件。多个模式可以用逗号分隔（例如，"test/**,*.spec.js", "node_modules/**,dist/**"）。这些模式补充 .gitignore 和内置排除。
- `topFilesLength`：（可选，默认值：10）在代码库分析的指标摘要中显示的最大文件数（按大小排序）。

**示例：**
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

此工具读取 Repomix 生成的输出文件的内容。支持对大文件进行行范围指定的部分读取。此工具专为直接文件系统访问受限的环境而设计。

**参数：**
- `outputId`：（必需）要读取的 Repomix 输出文件的 ID
- `startLine`：（可选）起始行号（从 1 开始，包含）。如果未指定，则从开头读取。
- `endLine`：（可选）结束行号（从 1 开始，包含）。如果未指定，则读取到末尾。

**功能：**
- 专为基于 Web 的环境或沙箱应用程序设计
- 使用其 ID 检索先前生成的输出内容
- 无需文件系统访问权限即可安全访问打包的代码库
- 支持大文件的部分读取

**示例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

此工具使用 JavaScript RegExp 语法的类似 grep 的功能在 Repomix 输出文件中搜索模式。返回匹配行及其周围的可选上下文行。

**参数：**
- `outputId`：（必需）要搜索的 Repomix 输出文件的 ID
- `pattern`：（必需）搜索模式（JavaScript RegExp 正则表达式语法）
- `contextLines`：（可选，默认值：0）在每个匹配项前后显示的上下文行数。如果指定了 beforeLines/afterLines，则被覆盖。
- `beforeLines`：（可选）在每个匹配项前显示的上下文行数（类似 grep -B）。优先于 contextLines。
- `afterLines`：（可选）在每个匹配项后显示的上下文行数（类似 grep -A）。优先于 contextLines。
- `ignoreCase`：（可选，默认值：false）执行不区分大小写的匹配

**功能：**
- 使用 JavaScript RegExp 语法进行强大的模式匹配
- 支持上下文行以更好地理解匹配
- 允许单独控制前/后上下文行
- 区分大小写和不区分大小写的搜索选项

**示例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file 和 file_system_read_directory

Repomix 的 MCP 服务器提供了两个文件系统工具，允许 AI 助手安全地与本地文件系统交互：

1. `file_system_read_file`
  - 使用绝对路径从本地文件系统读取文件内容
  - 包含内置安全验证以检测和防止访问包含敏感信息的文件
  - 使用 [Secretlint](https://github.com/secretlint/secretlint) 实现安全验证
  - 防止访问包含敏感信息的文件（API 密钥、密码、机密）
  - 验证绝对路径以防止目录遍历攻击
  - 对无效路径和安全问题返回清晰的错误消息

2. `file_system_read_directory`
  - 使用绝对路径列出目录的内容
  - 返回显示文件和子目录的格式化列表，带有清晰的指示符
  - 使用清晰的指示符（`[FILE]` 或 `[DIR]`）显示文件和目录
  - 提供安全的目录遍历和适当的错误处理
  - 验证路径并确保使用绝对路径
  - 对探索项目结构和理解代码库组织很有用

这两个工具都包含了强大的安全措施：
- 绝对路径验证以防止目录遍历攻击
- 权限检查以确保适当的访问权限
- 与 Secretlint 集成以检测敏感信息
- 清晰的错误消息以便于调试和安全意识

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

这些工具在 AI 助手需要执行以下操作时特别有用：
- 分析代码库中的特定文件
- 导航目录结构
- 验证文件存在性和可访问性
- 确保安全的文件系统操作

## 将 Repomix 作为 MCP 服务器使用的好处

将 Repomix 作为 MCP 服务器使用提供了几个优势：

1. **直接集成**：AI 助手可以直接分析你的代码库，无需手动文件准备。
2. **高效工作流**：通过消除手动生成和上传文件的需求，简化了代码分析过程。
3. **一致输出**：确保 AI 助手以一致、优化的格式接收代码库。
4. **高级功能**：利用 Repomix 的所有功能，如代码压缩、token 计数和安全检查。

配置完成后，你的 AI 助手可以直接使用 Repomix 的功能来分析代码库，使代码分析工作流更加高效。
