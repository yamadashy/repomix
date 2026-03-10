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
    details: 自动识别并尊重您的 .gitignore 文件。

  - icon: 🛡️
    title: 注重安全
    details: 集成 Secretlint 进行强大的安全检查，检测并防止敏感信息的泄露。

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

我们深感荣幸！Repomix 已被提名为 [JSNation Open Source Awards 2025](https://osawards.com/javascript/) 的 **Powered by AI** 类别奖项。

这一切都离不开所有使用和支持 Repomix 的用户。谢谢大家！

## 什么是 Repomix？

Repomix 是一个强大的工具，可以将您的整个代码库打包到一个 AI 友好的文件中。无论您是在进行代码审查、重构，还是需要 AI 协助您的项目，Repomix 都可以轻松地与 AI 工具共享您的整个代码库上下文。

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## 快速开始

使用 Repomix 生成打包文件（`repomix-output.xml`）后，您可以将其发送给 AI 助手（如 ChatGPT、Claude），并附上这样的提示：

```
此文件包含了仓库中所有文件的合并内容。
我想重构代码，请先帮我审查一下。
```

AI 将分析您的整个代码库并提供全面的见解：

![Repomix 使用示例1](/images/docs/repomix-file-usage-1.png)

在讨论具体修改时，AI 可以帮助生成代码。通过像 Claude 的 Artifacts 这样的功能，您甚至可以一次性接收多个相互依赖的文件：

![Repomix 使用示例2](/images/docs/repomix-file-usage-2.png)

祝您编码愉快！🚀

## 为什么选择 Repomix？

Repomix 的优势在于能够搭配 ChatGPT、Claude、Gemini、Grok 等任何订阅服务使用，无需额外费用。它提供完整的代码库上下文，省去了逐个查看文件的麻烦，让分析更快速、更准确。

有了整个代码库作为上下文，Repomix 可以应用于各种场景，包括方案设计、Bug 排查、第三方库安全审计、文档生成等。

## 使用 CLI 工具 {#using-the-cli-tool}

Repomix 可以作为命令行工具使用，功能丰富且支持灵活配置。

**CLI 工具可以访问私有仓库**，因为它使用您本地安装的 Git。

### 快速上手

您可以在项目目录中无需安装即可立即尝试 Repomix：

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

就是这么简单！Repomix 将在您的当前目录中生成一个 `repomix-output.xml` 文件，其中包含了以 AI 友好格式整理的整个代码库。



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

生成打包文件后，您可以将其用于 Claude、ChatGPT、Gemini 等生成式 AI 工具。

#### Docker 使用方法

您也可以使用 Docker 运行 Repomix 🐳  
如果您想在隔离环境中运行 Repomix 或更偏好使用容器，这是一个很好的选择。

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

选择您偏好的输出格式：

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

## 真实世界使用案例

### [LLM 代码生成工作流](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

一位开发者分享了他们如何使用 Repomix 从现有代码库中提取代码上下文，然后与 Claude 和 Aider 等 LLM 一起利用该上下文进行增量改进、代码审查和自动化文档生成。

### [为 LLM 创建知识数据包](https://lethain.com/competitive-advantage-author-llms/)

作者正在使用 Repomix 将他们的书面内容——博客、文档和书籍——打包为 LLM 兼容格式，使读者能够通过 AI 驱动的问答系统与他们的专业知识进行交互。

[探索更多使用案例 →](./guide/use-cases)

## 高级用户指南

Repomix 为高级用例提供强大的功能。以下是高级用户的一些重要指南：

- **[MCP 服务器](./guide/mcp-server)** - AI 助手的 Model Context Protocol 集成
- **[GitHub Actions](./guide/github-actions)** - 在 CI/CD 工作流中自动化代码库打包
- **[代码压缩](./guide/code-compress)** - 基于 Tree-sitter 的智能压缩（可减少约 70% Token）
- **[作为库使用](./guide/development/using-repomix-as-a-library)** - 将 Repomix 集成到您的 Node.js 应用程序中
- **[自定义指令](./guide/custom-instructions)** - 为输出添加自定义提示和指令
- **[安全功能](./guide/security)** - 内置 Secretlint 集成和安全检查
- **[最佳实践](./guide/tips/best-practices)** - 使用经过验证的策略优化您的 AI 工作流

### 更多示例
::: tip 需要更多帮助？ 💡
查看我们的[使用指南](./guide/)获取详细说明，或访问[GitHub 仓库](https://github.com/yamadashy/repomix)获取更多示例和源代码。
:::

</div>
