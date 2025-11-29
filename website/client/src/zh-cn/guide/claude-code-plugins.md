# Claude Code 插件

Repomix 为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) 提供官方插件，可与 AI 驱动的开发环境无缝集成。这些插件使您可以使用自然语言命令直接在 Claude Code 中分析和打包代码库。

## 安装

### 1. 添加 Repomix 插件市场

首先，将 Repomix 插件市场添加到 Claude Code：

```text
/plugin marketplace add yamadashy/repomix
```

### 2. 安装插件

使用以下命令安装插件：

```text
# 安装 MCP 服务器插件（推荐基础）
/plugin install repomix-mcp@repomix

# 安装命令插件（扩展功能）
/plugin install repomix-commands@repomix

# 安装仓库探索器插件（AI 驱动分析）
/plugin install repomix-explorer@repomix
```

::: tip 插件关系
推荐将 `repomix-mcp` 插件作为基础。`repomix-commands` 插件提供便捷的斜杠命令，而 `repomix-explorer` 添加 AI 驱动的分析功能。虽然可以独立安装，但同时使用三者可获得最全面的体验。
:::

### 替代方案：交互式安装

您也可以使用交互式插件安装程序：

```text
/plugin
```

这将打开一个交互式界面，您可以浏览并安装可用的插件。

## 可用插件

### 1. repomix-mcp（MCP 服务器插件）

通过 MCP 服务器集成提供 AI 驱动的代码库分析的基础插件。

**功能：**
- 打包本地和远程仓库
- 搜索打包输出
- 使用内置安全扫描读取文件（[Secretlint](https://github.com/secretlint/secretlint)）
- 自动 Tree-sitter 压缩（减少约 70% 的 token）

### 2. repomix-commands（斜杠命令插件）

提供支持自然语言的便捷斜杠命令。

**可用命令：**
- `/repomix-commands:pack-local` - 使用各种选项打包本地代码库
- `/repomix-commands:pack-remote` - 打包和分析远程 GitHub 仓库

### 3. repomix-explorer（AI 分析代理插件）

AI 驱动的仓库分析代理，使用 Repomix CLI 智能探索代码库。

**功能：**
- 自然语言代码库探索和分析
- 智能模式发现和代码结构理解
- 使用 grep 和定向文件读取进行增量分析
- 大型仓库的自动上下文管理

**可用命令：**
- `/repomix-explorer:explore-local` - 使用 AI 辅助分析本地代码库
- `/repomix-explorer:explore-remote` - 使用 AI 辅助分析远程 GitHub 仓库

**工作原理：**
1. 运行 `npx repomix@latest` 打包仓库
2. 使用 Grep 和 Read 工具高效搜索输出
3. 提供全面分析而不消耗过多上下文

## 使用示例

### 打包本地代码库

使用 `/repomix-commands:pack-local` 命令配合自然语言指令：

```text
/repomix-commands:pack-local
将此项目打包为 Markdown 格式并压缩
```

其他示例：
- "仅打包 src 目录"
- "打包 TypeScript 文件并添加行号"
- "生成 JSON 格式的输出"

### 打包远程仓库

使用 `/repomix-commands:pack-remote` 命令分析 GitHub 仓库：

```text
/repomix-commands:pack-remote yamadashy/repomix
仅打包 yamadashy/repomix 仓库中的 TypeScript 文件
```

其他示例：
- "压缩打包 main 分支"
- "仅包含文档文件"
- "打包特定目录"

### 使用 AI 探索本地代码库

使用 `/repomix-explorer:explore-local` 命令进行 AI 驱动的分析：

```text
/repomix-explorer:explore-local ./src
查找所有与认证相关的代码
```

其他示例：
- "分析这个项目的结构"
- "显示主要组件"
- "查找所有 API 端点"

### 使用 AI 探索远程仓库

使用 `/repomix-explorer:explore-remote` 命令分析 GitHub 仓库：

```text
/repomix-explorer:explore-remote facebook/react
显示主要组件架构
```

其他示例：
- "查找仓库中的所有 React hooks"
- "解释项目结构"
- "错误边界在哪里定义？"

## 相关资源

- [MCP 服务器文档](/guide/mcp-server) - 了解底层 MCP 服务器
- [配置](/guide/configuration) - 自定义 Repomix 行为
- [安全性](/guide/security) - 了解安全功能
- [命令行选项](/guide/command-line-options) - 可用的 CLI 选项

## 插件源代码

插件源代码可在 Repomix 仓库中找到：

- [插件市场](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP 插件](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [命令插件](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [仓库探索器插件](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## 反馈和支持

如果您遇到问题或对 Claude Code 插件有建议：

- [在 GitHub 上提交 issue](https://github.com/yamadashy/repomix/issues)
- [加入我们的 Discord 社区](https://discord.gg/wNYzTwZFku)
- [查看现有讨论](https://github.com/yamadashy/repomix/discussions)
