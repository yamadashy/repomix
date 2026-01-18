# Repomix Explorer Skill (Agent Skills)

Repomix 提供了一個即用型的 **Repomix Explorer** 技能，使 AI 編碼助手能夠使用 Repomix CLI 分析和探索程式碼庫。

該技能設計用於各種 AI 工具，包括 Claude Code、Cursor、Codex、GitHub Copilot 等。

## 快速安裝

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

此命令將技能安裝到您的 AI 助手的技能目錄（例如 `.claude/skills/`），使其立即可用。

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
