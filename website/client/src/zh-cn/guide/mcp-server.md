---
title: MCP服务器
description: 将 Repomix 作为 Model Context Protocol 服务器运行，让 AI 助手可以直接打包、搜索和读取本地或远程代码库。
---

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

## 沙箱模式

默认情况下，MCP 服务器可以读取主机用户能够访问的任何路径。这对受信任的本地助手来说很方便，但当服务器暴露给不受信任的客户端或 agent 时，权限范围就显得过大了。`--sandbox` 标志会将服务器的文件工具限制在单个工作区目录内：

```bash
# 限制在当前工作目录内
repomix --mcp --sandbox

# 限制在指定目录内
repomix --mcp --sandbox path/to/project
```

启用沙箱模式后：

- **所有路径都相对于工作区根目录解析。** 绝对路径、`~`、`..` 以及 Windows 驱动器/UNC 路径都会被拒绝，解析后落在根目录之外的路径（包括通过符号链接的情况）也会被丢弃。返回结果和错误消息中的路径同样是相对路径，因此不会暴露主机路径。这也适用于下方工具参考中的 `directory` 和 `path` 参数：在沙箱模式下，应将它们指定为相对于工作区根目录的路径，而不是这些表格中通常描述的绝对路径。
- **仅注册只读且限定在根目录内的工具：** `pack_codebase`、`read_repomix_output`、`grep_repomix_output`、`file_system_read_file` 和 `file_system_read_directory`。远程打包、Skill 生成以及附加外部输出等功能均被禁用，因为它们会访问网络、写入文件或引用任意路径。这两个 `file_system_*` 工具本身也仅在沙箱模式下可用，其可访问范围由工作区根目录限定。

这是在应用层面对工具能力范围的限制（纵深防御），而非操作系统级别的沙箱。当为不受信任的客户端托管服务器时，仍应在你所在平台的常规隔离机制下运行它（容器、专用用户等）。

`--sandbox` 仅影响 MCP 服务器；如果不搭配 `--mcp` 使用则不会生效。

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

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `directory` | 是 | — | 要打包的目录的绝对路径 |
| `compress` | 否 | `false` | 启用 Tree-sitter 压缩以提取基本代码签名和结构，同时删除实现细节。在保持语义信息的同时减少约 70% 的 token 用量。由于 `grep_repomix_output` 支持按需检索内容，一般不需要启用此选项。 |
| `includePatterns` | 否 | — | 使用 fast-glob 模式指定要包含的文件。多个模式用逗号分隔（例如 `"**/*.{js,ts}"`、`"src/**,docs/**"`） |
| `ignorePatterns` | 否 | — | 使用 fast-glob 模式指定要排除的其他文件。多个模式用逗号分隔（例如 `"test/**,*.spec.js"`）。补充 `.gitignore` 和内置排除。 |
| `outputPatterns` | 否 | — | 按文件设置内容包含级别，与配置文件中的 [`output.patterns`](./configuration.md) 选项对应。一个由 `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }` 组成的数组。第一个匹配的模式优先；`directoryStructureOnly` 优先于 `compress`，未设置任一标志的匹配项将强制显示完整内容（可用于在全局启用 `compress` 时豁免特定文件）。会覆盖目标仓库 `repomix.config.json` 中的 `output.patterns` 设置。 |
| `topFilesLength` | 否 | `10` | 在指标摘要中显示的最大文件数（按大小排序） |
| `style` | 否 | `xml` | 输出格式样式：`xml`、`markdown`、`json` 或 `plain` |

**示例：**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "outputPatterns": [
    { "pattern": "src/core/**" },
    { "pattern": "docs/**/*", "directoryStructureOnly": true }
  ],
  "topFilesLength": 10
}
```

在上面的示例中（`compress: true` 作为未匹配文件的兜底设置），`src/core/` 下的文件将保留完整内容，`docs/` 下的文件仅在目录结构中列出，其余文件都会被压缩。

### pack_remote_repository

此工具获取、克隆并将 GitHub 仓库打包成一个用于 AI 分析的 XML 文件。它自动克隆远程仓库，分析其结构，并生成综合报告。

**参数：**

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `remote` | 是 | — | GitHub 仓库 URL 或 `user/repo` 格式（例如 `"yamadashy/repomix"`、`"https://github.com/user/repo"` 或 `"https://github.com/user/repo/tree/branch"`） |
| `compress` | 否 | `false` | 启用 Tree-sitter 压缩以提取基本代码签名和结构，同时删除实现细节。在保持语义信息的同时减少约 70% 的 token 用量。由于 `grep_repomix_output` 支持按需检索内容，一般不需要启用此选项。 |
| `includePatterns` | 否 | — | 使用 fast-glob 模式指定要包含的文件。多个模式用逗号分隔（例如 `"**/*.{js,ts}"`、`"src/**,docs/**"`） |
| `ignorePatterns` | 否 | — | 使用 fast-glob 模式指定要排除的其他文件。多个模式用逗号分隔（例如 `"test/**,*.spec.js"`）。补充 `.gitignore` 和内置排除。 |
| `outputPatterns` | 否 | — | 按文件设置内容包含级别，与配置文件中的 [`output.patterns`](./configuration.md) 选项对应。一个由 `{ "pattern": string, "compress"?: boolean, "directoryStructureOnly"?: boolean }` 组成的数组。第一个匹配的模式优先；`directoryStructureOnly` 优先于 `compress`，未设置任一标志的匹配项将强制显示完整内容（可用于在全局启用 `compress` 时豁免特定文件）。 |
| `topFilesLength` | 否 | `10` | 在指标摘要中显示的最大文件数（按大小排序） |
| `style` | 否 | `xml` | 输出格式样式：`xml`、`markdown`、`json` 或 `plain` |

**示例：**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "outputPatterns": [
    { "pattern": "src/core/**" },
    { "pattern": "docs/**/*", "directoryStructureOnly": true }
  ],
  "topFilesLength": 10
}
```

### read_repomix_output

此工具读取 Repomix 生成的输出文件的内容。支持对大文件进行行范围指定的部分读取。此工具专为直接文件系统访问受限的环境而设计。

**参数：**

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `outputId` | 是 | — | 要读取的 Repomix 输出文件的 ID |
| `startLine` | 否 | 文件开头 | 起始行号（从 1 开始，包含） |
| `endLine` | 否 | 文件末尾 | 结束行号（从 1 开始，包含） |

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

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `outputId` | 是 | — | 要搜索的 Repomix 输出文件的 ID |
| `pattern` | 是 | — | 搜索模式（JavaScript RegExp 语法） |
| `contextLines` | 否 | `0` | 在每个匹配项前后显示的上下文行数。如果指定了 `beforeLines`/`afterLines`，则被覆盖。 |
| `beforeLines` | 否 | — | 在每个匹配项前显示的行数（类似 `grep -B`）。优先于 `contextLines`。 |
| `afterLines` | 否 | — | 在每个匹配项后显示的行数（类似 `grep -A`）。优先于 `contextLines`。 |
| `ignoreCase` | 否 | `false` | 执行不区分大小写的匹配 |

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

这两个文件系统工具仅在[沙箱模式](#沙箱模式)（`--sandbox`）下可用，其可访问范围由工作区根目录限定。如果不使用 `--sandbox`，它们不会被注册，因此默认服务器不会暴露任何原始文件读取能力。

1. `file_system_read_file`
  - 读取相对于工作区根目录的路径下的文件内容（例如 `src/index.ts`）
  - 作为一项额外的启发式防护措施，拒绝匹配已知敏感信息格式（[Secretlint](https://github.com/secretlint/secretlint)）的内容；访问边界是工作区根目录，而非该扫描
  - 对无效路径返回清晰的错误消息，且不会暴露主机路径

2. `file_system_read_directory`
  - 列出相对于工作区根目录的路径下的目录内容（例如 `.` 或 `src`）
  - 使用清晰的指示符（`[FILE]` 或 `[DIR]`）显示文件和目录
  - 对探索项目结构和理解代码库组织很有用

**示例：**
```typescript
// 读取文件
const fileContent = await tools.file_system_read_file({
  path: 'src/index.ts'
});

// 列出目录内容
const dirContent = await tools.file_system_read_directory({
  path: 'src'
});
```

这些工具在 AI 助手需要执行以下操作时特别有用：
- 分析工作区中的特定文件
- 导航目录结构
- 验证文件存在性和可访问性

## 将 Repomix 作为 MCP 服务器使用的好处

将 Repomix 作为 MCP 服务器使用提供了几个优势：

1. **直接集成**：AI 助手可以直接分析你的代码库，无需手动文件准备。
2. **高效工作流**：通过消除手动生成和上传文件的需求，简化了代码分析过程。
3. **一致输出**：确保 AI 助手以一致、优化的格式接收代码库。
4. **高级功能**：利用 Repomix 的所有功能，如代码压缩、token 计数和安全检查。

配置完成后，你的 AI 助手可以直接使用 Repomix 的功能来分析代码库，使代码分析工作流更加高效。

## 相关资源

- [Claude Code 插件](/zh-cn/guide/claude-code-plugins) - 便捷的 Claude Code 插件集成
- [配置](/zh-cn/guide/configuration) - 自定义 Repomix 行为
- [命令行选项](/zh-cn/guide/command-line-options) - 完整的 CLI 参考
- [输出格式](/zh-cn/guide/output) - 了解可用的输出格式
