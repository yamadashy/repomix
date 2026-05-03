---
title: Repomix Explorer Skill (Agent Skills)
description: 安装 Repomix Explorer agent skill，在 Claude Code 和支持 Agent Skills 格式的 AI 助手中分析本地与远程代码库。
---

# Repomix Explorer Skill (Agent Skills)

Repomix 提供了一个即用型的 **Repomix Explorer** 技能，使 AI 编码助手能够使用 Repomix CLI 分析和探索代码库。

该技能面向 Claude Code 和其他支持 Agent Skills 格式的 AI 助手。

## 快速安装

对于 Claude Code，请安装官方 Repomix Explorer 插件：

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Claude Code 插件提供 `/repomix-explorer:explore-local` 和 `/repomix-explorer:explore-remote` 等带命名空间的命令。完整设置请参阅 [Claude Code 插件](/zh-cn/guide/claude-code-plugins)。

对于 Codex、Cursor、OpenClaw 以及其他兼容 Agent Skills 的助手，请使用 Skills CLI 安装独立 skill：

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

如果要指定特定助手，请传入 `--agent`：

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

对于 Hermes Agent，请使用 Hermes 原生的 skills 命令安装单文件 skill：

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

如果你主要使用 Hermes 进行仓库分析，[MCP 服务器](/zh-cn/guide/mcp-server)设置也是不错的选择，因为它会直接将 Repomix 作为 MCP server 运行。

## 功能介绍

安装后，你可以使用自然语言指令分析代码库。

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

这不仅对理解代码库很有用，当你想通过参考其他仓库来实现功能时也很有帮助。

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

AI 将分析你的其他仓库，帮助你参考自己的实现。

## 技能内容

该技能包括：

- **用户意图识别** - 理解用户请求代码库分析的各种方式
- **Repomix 命令指南** - 知道使用哪些选项（`--compress`、`--include` 等）
- **分析工作流** - 探索打包输出的结构化方法
- **最佳实践** - 效率提示，如在读取整个文件之前先使用 grep

## 相关资源

- [Agent Skills 生成](/zh-cn/guide/agent-skills-generation) - 从代码库生成你自己的技能
- [Claude Code 插件](/zh-cn/guide/claude-code-plugins) - Repomix 的 Claude Code 插件
- [MCP 服务器](/zh-cn/guide/mcp-server) - 替代集成方法
