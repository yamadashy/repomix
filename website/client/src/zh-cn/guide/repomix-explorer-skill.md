# Repomix Explorer Skill (Agent Skills)

Repomix 提供了一个即用型的 **Repomix Explorer** 技能，使 AI 编码助手能够使用 Repomix CLI 分析和探索代码库。

该技能设计用于各种 AI 工具，包括 Claude Code、Cursor、Codex、GitHub Copilot 等。

## 快速安装

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

此命令将技能安装到您的 AI 助手的技能目录（例如 `.claude/skills/`），使其立即可用。

## 功能介绍

安装后，您可以使用自然语言指令分析代码库。

#### 分析远程仓库

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### 探索本地代码库

```text
"What's in this project?
~/projects/my-app"
```

这不仅对理解代码库很有用，当您想通过参考其他仓库来实现功能时也很有帮助。

## 工作原理

Repomix Explorer 技能引导 AI 助手完成完整的工作流程：

1. **运行 repomix 命令** - 将仓库打包成 AI 友好的格式
2. **分析输出文件** - 使用模式搜索（grep）查找相关代码
3. **提供见解** - 报告结构、指标和可操作的建议

## 使用案例示例

### 理解新代码库

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

AI 将运行 repomix，分析输出，并提供代码库的结构化概述。

### 查找特定模式

```text
"Find all authentication-related code in this repository."
```

AI 将搜索认证模式，按文件分类结果，并解释认证是如何实现的。

### 参考自己的项目

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

AI 将分析您的其他仓库，帮助您参考自己的实现。

## 技能内容

该技能包括：

- **用户意图识别** - 理解用户请求代码库分析的各种方式
- **Repomix 命令指南** - 知道使用哪些选项（`--compress`、`--include` 等）
- **分析工作流** - 探索打包输出的结构化方法
- **最佳实践** - 效率提示，如在读取整个文件之前先使用 grep

## 相关资源

- [Agent Skills 生成](/zh-cn/guide/agent-skills-generation) - 从代码库生成您自己的技能
- [Claude Code 插件](/zh-cn/guide/claude-code-plugins) - Repomix 的 Claude Code 插件
- [MCP 服务器](/zh-cn/guide/mcp-server) - 替代集成方法
