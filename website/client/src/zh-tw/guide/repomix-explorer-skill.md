---
title: Repomix Explorer Skill (Agent Skills)
description: 安裝 Repomix Explorer agent skill，在 Claude Code 與支援 Agent Skills 格式的 AI 助手中分析本機與遠端程式碼庫。
---

# Repomix Explorer Skill (Agent Skills)

Repomix 提供了一個即用型的 **Repomix Explorer** 技能，使 AI 編碼助手能夠使用 Repomix CLI 分析和探索程式碼庫。

該技能面向 Claude Code 與其他支援 Agent Skills 格式的 AI 助手。

## 快速安裝

對於 Claude Code，請安裝官方 Repomix Explorer 外掛：

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Claude Code 外掛提供 `/repomix-explorer:explore-local` 和 `/repomix-explorer:explore-remote` 等命名空間命令。完整設定請參閱 [Claude Code 外掛](/zh-tw/guide/claude-code-plugins)。

對於 Codex、Cursor、OpenClaw 以及其他相容 Agent Skills 的助理，請使用 Skills CLI 安裝獨立 skill：

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

如果要指定特定助理，請傳入 `--agent`：

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

對於 Hermes Agent，請使用 Hermes Agent 原生的 skills 命令安裝單一檔案 skill：

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

如果你主要使用 Hermes Agent 進行 repository 分析，[MCP 伺服器](/zh-tw/guide/mcp-server)設定也是不錯的選擇，因為它會直接將 Repomix 作為 MCP server 執行。

## 功能介紹

安裝後，您可以使用自然語言指令分析程式碼庫。

#### 分析遠端倉庫

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### 探索本地程式碼庫

```text
"What's in this project?
~/projects/my-app"
```

這不僅對理解程式碼庫很有用，當您想通過參考其他倉庫來實現功能時也很有幫助。

## 工作原理

Repomix Explorer 技能引導 AI 助手完成完整的工作流程：

1. **執行 repomix 命令** - 將倉庫打包成 AI 友好的格式
2. **分析輸出檔案** - 使用模式搜尋（grep）查找相關程式碼
3. **提供見解** - 報告結構、指標和可操作的建議

## 使用案例範例

### 理解新程式碼庫

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

AI 將執行 repomix，分析輸出，並提供程式碼庫的結構化概述。

### 查找特定模式

```text
"Find all authentication-related code in this repository."
```

AI 將搜尋認證模式，按檔案分類結果，並解釋認證是如何實現的。

### 參考自己的專案

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

AI 將分析您的其他倉庫，幫助您參考自己的實現。

## 技能內容

該技能包括：

- **使用者意圖識別** - 理解使用者請求程式碼庫分析的各種方式
- **Repomix 命令指南** - 知道使用哪些選項（`--compress`、`--include` 等）
- **分析工作流** - 探索打包輸出的結構化方法
- **最佳實踐** - 效率提示，如在讀取整個檔案之前先使用 grep

## 相關資源

- [Agent Skills 生成](/zh-tw/guide/agent-skills-generation) - 從程式碼庫生成您自己的技能
- [Claude Code 外掛](/zh-tw/guide/claude-code-plugins) - Repomix 的 Claude Code 外掛
- [MCP 伺服器](/zh-tw/guide/mcp-server) - 替代整合方法
