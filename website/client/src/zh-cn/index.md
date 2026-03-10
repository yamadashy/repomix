---
layout: home
title: Repomix
titleTemplate: 将代码库打包为 AI 友好的格式
aside: false
editLink: false

features:
  - icon: 🤖
    title: AI 优化
    details: 以 AI 易于理解和处理的方式格式化代码库。

  - icon: ⚙️
    title: Git 感知
    details: 自动遵循 .gitignore 中的忽略规则。

  - icon: 🛡️
    title: 注重安全
    details: 集成 Secretlint 进行安全扫描，检测并防止敏感信息泄露。

  - icon: 📊
    title: Token 计数
    details: 提供每个文件和整个代码库的 Token 数量统计，方便管理 LLM 上下文窗口。

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 开源奖项提名

我们深感荣幸！Repomix 已获得 [JSNation Open Source Awards 2025](https://osawards.com/javascript/) **Powered by AI** 类别的提名。

这一切都离不开所有使用和支持 Repomix 的用户。谢谢大家！

## 什么是 Repomix？

Repomix 是一个强大的工具，能将整个代码库打包成一个 AI 友好的文件。无论你是在做代码审查、重构，还是需要 AI 辅助开发，Repomix 都能让你轻松地将完整的代码库上下文分享给 AI 工具。

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## 快速开始

使用 Repomix 生成打包文件（`repomix-output.xml`）后，你可以将其发送给 AI 助手（如 ChatGPT、Claude），并附上这样的提示：

```
此文件包含了仓库中所有文件的汇总内容。
我想重构代码，请先帮我审查一下。
```

AI 将分析你的整个代码库，并给出全面的分析和建议：

![Repomix 使用示例 1](/images/docs/repomix-file-usage-1.png)

在讨论具体修改时，AI 可以帮助生成代码。借助 Claude Artifacts 等功能，你甚至可以一次获得多个相互关联的文件：

![Repomix 使用示例 2](/images/docs/repomix-file-usage-2.png)

祝你用得开心！🚀

## 为什么选择 Repomix？

Repomix 的优势在于能够搭配 ChatGPT、Claude、Gemini、Grok 等任何订阅服务使用，无需额外费用。它提供完整的代码库上下文，省去了逐个查看文件的麻烦，让分析更快速、更准确。

有了整个代码库作为上下文，Repomix 可以应用于各种场景，包括方案设计、Bug 排查、第三方库安全审计、文档生成等。

## 使用 CLI 工具 {#using-the-cli-tool}

Repomix 可以作为命令行工具使用，功能丰富且支持灵活配置。

**CLI 工具可以访问私有仓库**，因为它使用你本地安装的 Git。

### 快速上手

你可以在项目目录中无需安装即可立即尝试 Repomix：

```bash
npx repomix@latest
```

或者全局安装以便重复使用：

```bash
# 使用 npm 安装
npm install -g repomix

# 或使用 yarn 安装
yarn global add repomix

# 或使用 bun 安装
bun add -g repomix

# 或使用 Homebrew 安装（macOS/Linux）
brew install repomix

# 然后在任意项目目录中运行
repomix
```

就是这么简单！Repomix 将在你的当前目录中生成一个 `repomix-output.xml` 文件，其中包含了以 AI 友好格式整理的整个代码库。



### 基本用法

打包整个代码库：

```bash
repomix
```

打包特定目录：

```bash
repomix path/to/directory
```

使用 [glob 模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)打包特定文件：

```bash
repomix --include "src/**/*.ts,**/*.md"
```

排除特定文件：

```bash
repomix --ignore "**/*.log,tmp/"
```

处理远程仓库：
```bash
# 使用简写格式
npx repomix --remote yamadashy/repomix

# 使用完整 URL（支持分支和特定路径）
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# 使用提交 URL
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

初始化配置文件（`repomix.config.json`）：

```bash
repomix --init
```

生成打包文件后，你可以将其用于 Claude、ChatGPT、Gemini 等生成式 AI 工具。

#### Docker 使用方法

你也可以使用 Docker 运行 Repomix 🐳  
如果你想在隔离环境中运行 Repomix 或更偏好使用容器，这是一个很好的选择。

基本用法（当前目录）：

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

打包特定目录：
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

处理远程仓库并输出到 `output` 目录：

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### 输出格式

选择你偏好的输出格式：

```bash
# XML 格式（默认）
repomix --style xml

# Markdown 格式
repomix --style markdown

# JSON 格式
repomix --style json

# 纯文本格式
repomix --style plain
```

### 自定义设置

创建 `repomix.config.json` 进行持久化设置：

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## 实际应用案例

### [LLM 代码生成工作流](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

一位开发者分享了如何使用 Repomix 提取代码库上下文，再结合 Claude、Aider 等 LLM 进行增量改进、代码审查和自动文档生成。

### [为 LLM 创建知识数据包](https://lethain.com/competitive-advantage-author-llms/)

一些作者正利用 Repomix 将博客、文档和书籍等内容打包为 LLM 兼容格式，让读者可以通过 AI 问答系统与其专业知识互动。

[探索更多使用案例 →](./guide/use-cases)

## 高级用户指南

Repomix 提供了许多面向进阶用户的强大功能，以下是一些实用指南：

- **[MCP 服务器](./guide/mcp-server)** - AI 助手的 Model Context Protocol 集成
- **[GitHub Actions](./guide/github-actions)** - 在 CI/CD 工作流中自动化代码库打包
- **[代码压缩](./guide/code-compress)** - 基于 Tree-sitter 的智能压缩（可减少约 70% Token）
- **[作为库使用](./guide/development/using-repomix-as-a-library)** - 将 Repomix 集成到你的 Node.js 应用程序中
- **[自定义指令](./guide/custom-instructions)** - 为输出添加自定义提示和指令
- **[安全功能](./guide/security)** - 内置 Secretlint 集成和安全检查
- **[最佳实践](./guide/tips/best-practices)** - 通过实践总结的技巧优化你的 AI 工作流

### 更多示例
::: tip 需要更多帮助？ 💡
查看我们的[使用指南](./guide/)获取详细说明，或访问[GitHub 仓库](https://github.com/yamadashy/repomix)获取更多示例和源代码。
:::

</div>
