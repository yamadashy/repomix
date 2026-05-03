---
title: 常见问题和故障排除
description: 解答 Repomix 关于私有仓库、C# 和 Python 支持、MCP 兼容 agent、输出格式、减少 token、安全检查和 AI 工作流的常见问题。
---

# 常见问题和故障排除

本页帮助你选择合适的 Repomix 工作流，减少过大的输出，并为 AI 助手准备代码库上下文。

## 常见问题

### Repomix 用来做什么？

Repomix 将仓库打包成一个 AI 友好的文件。你可以把完整代码库上下文交给 ChatGPT、Claude、Gemini 等助手，用于代码审查、缺陷排查、重构、文档和入门培训。

### Repomix 支持私有仓库吗？

支持。在本机已有访问权限的 checkout 中运行 Repomix：

```bash
repomix
```

在分享给外部 AI 服务前，请先检查生成文件。

### 可以不克隆就处理公开 GitHub 仓库吗？

可以。使用 `--remote` 并传入短写或完整 URL：

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### 应该选择哪种输出格式？

不确定时先使用默认 XML。Markdown 适合可读对话，JSON 适合自动化，纯文本适合最大兼容性。

```bash
repomix --style markdown
repomix --style json
```

参见[输出格式](/zh-cn/guide/output)。

## 减少 token 使用量

### 生成文件太大怎么办？

缩小上下文范围：

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

对于大型仓库，建议组合使用 include/ignore 模式和代码压缩。

### `--compress` 做什么？

`--compress` 会保留 import、export、类、函数、接口等重要结构，同时移除许多实现细节。它适合让模型理解架构和整体关系。

## 安全和隐私

### CLI 会上传我的代码吗？

Repomix CLI 在本地运行，并在你的机器上写入输出文件。网站和浏览器扩展有不同流程，请查看[隐私政策](/zh-cn/guide/privacy)。

### Repomix 如何避免包含密钥？

Repomix 使用基于 Secretlint 的安全检查。请把它视为额外防护，并始终人工检查输出。

## 故障排除

### 为什么输出中缺少文件？

Repomix 会遵守 `.gitignore`、默认 ignore 规则和自定义 ignore 模式。请检查 `repomix.config.json`、`--ignore` 和 git ignore 设置。

### 如何让团队得到可复现的输出？

创建并提交共享配置：

```bash
repomix --init
```

## 其他常见问题

### Repomix 支持 C#、Python、Java、Go、Rust 或其他语言的仓库吗？

支持。Repomix 会读取项目文件并将其格式化为适合 AI 工具使用的内容，因此可以打包任何编程语言编写的仓库。CLI 需要 Node.js 20 或更高版本。一些高级功能，例如基于 Tree-sitter 的代码压缩，会取决于对应语言的 parser 支持情况。

### 可以将 Repomix 与 Hermes Agent、OpenClaw 或其他 MCP 兼容 agent 一起使用吗？

可以。Repomix 可以作为 MCP server 运行：

```bash
npx -y repomix --mcp
```

对于 Hermes Agent，请在 `~/.hermes/config.yaml` 中将 Repomix 添加为 stdio MCP server：

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

对于 OpenClaw 或其他 MCP 兼容 agent，请在其配置外部 stdio MCP server 的位置使用相同的 command 和 args。如果你的助手支持 Agent Skills，也可以使用 [Repomix Explorer Skill](/zh-cn/guide/repomix-explorer-skill)。

### 如何用 Repomix 帮助 AI 助手理解新的库或框架？

打包该库的仓库或文档，然后把输出作为参考资料交给 AI 助手：

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

如果需要重复使用，也可以生成可复用的 Agent Skills 目录：

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### 如何排除 CSS、测试、构建输出或其他噪音文件？

一次性命令可以使用 `--ignore`：

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

如果只想保留特定源码或文档路径，请使用 `--include`：

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### 仓库大小有限制吗？

CLI 没有固定的仓库大小限制，但非常大的仓库可能会受到内存、文件大小，以及 AI 工具上传和上下文限制的影响。对于大型项目，建议先使用目标明确的 include pattern，检查 token 较大的文件，并在需要时拆分输出：

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### 为什么 `--include` 不会包含 `node_modules`、构建目录或被忽略路径中的文件？

`--include` 会缩小 Repomix 尝试打包的文件范围，但 ignore 规则仍然生效。文件仍可能被 `.gitignore`、`.ignore`、`.repomixignore`、内置默认模式或 `repomix.config.json` 排除。高级场景可以考虑 `--no-gitignore` 或 `--no-default-patterns`，但要谨慎使用，因为它们可能会包含依赖、构建产物或其他噪音文件。

## 相关资源

- [基本用法](/zh-cn/guide/usage)
- [命令行选项](/zh-cn/guide/command-line-options)
- [代码压缩](/zh-cn/guide/code-compress)
- [安全](/zh-cn/guide/security)
