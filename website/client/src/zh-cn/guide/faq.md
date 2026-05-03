---
title: 常见问题和故障排除
description: 解答 Repomix 关于私有仓库、输出格式、减少 token、远程 GitHub 仓库、安全检查和 AI 工作流的常见问题。
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

## 相关资源

- [基本用法](/zh-cn/guide/usage)
- [命令行选项](/zh-cn/guide/command-line-options)
- [代码压缩](/zh-cn/guide/code-compress)
- [安全](/zh-cn/guide/security)
