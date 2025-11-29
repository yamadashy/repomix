# Claude Code 外掛

Repomix 為 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) 提供官方外掛，可與 AI 驅動的開發環境無縫整合。這些外掛讓您可以使用自然語言指令直接在 Claude Code 中分析和打包程式碼庫。

## 安裝

### 1. 新增 Repomix 外掛市集

首先，將 Repomix 外掛市集新增到 Claude Code：

```text
/plugin marketplace add yamadashy/repomix
```

### 2. 安裝外掛

使用以下指令安裝外掛：

```text
# 安裝 MCP 伺服器外掛（建議基礎）
/plugin install repomix-mcp@repomix

# 安裝指令外掛（擴充功能）
/plugin install repomix-commands@repomix

# 安裝儲存庫探索器外掛（AI 驅動分析）
/plugin install repomix-explorer@repomix
```

::: tip 外掛關係
建議將 `repomix-mcp` 外掛作為基礎。`repomix-commands` 外掛提供便利的斜線指令，而 `repomix-explorer` 新增 AI 驅動的分析功能。雖然可以獨立安裝，但同時使用三者可獲得最全面的體驗。
:::

### 替代方案：互動式安裝

您也可以使用互動式外掛安裝程式：

```text
/plugin
```

這將開啟一個互動式介面，您可以瀏覽並安裝可用的外掛。

## 可用外掛

### 1. repomix-mcp（MCP 伺服器外掛）

透過 MCP 伺服器整合提供 AI 驅動的程式碼庫分析的基礎外掛。

**功能：**
- 打包本地和遠端儲存庫
- 搜尋打包輸出
- 使用內建安全掃描讀取檔案（[Secretlint](https://github.com/secretlint/secretlint)）
- 自動 Tree-sitter 壓縮（減少約 70% 的 token）

### 2. repomix-commands（斜線指令外掛）

提供支援自然語言的便利斜線指令。

**可用指令：**
- `/repomix-commands:pack-local` - 使用各種選項打包本地程式碼庫
- `/repomix-commands:pack-remote` - 打包和分析遠端 GitHub 儲存庫

### 3. repomix-explorer（AI 分析代理外掛）

AI 驅動的儲存庫分析代理，使用 Repomix CLI 智慧探索程式碼庫。

**功能：**
- 自然語言程式碼庫探索和分析
- 智慧模式發現和程式碼結構理解
- 使用 grep 和定向檔案讀取進行增量分析
- 大型儲存庫的自動上下文管理

**可用指令：**
- `/repomix-explorer:explore-local` - 使用 AI 輔助分析本地程式碼庫
- `/repomix-explorer:explore-remote` - 使用 AI 輔助分析遠端 GitHub 儲存庫

**運作方式：**
1. 執行 `npx repomix@latest` 打包儲存庫
2. 使用 Grep 和 Read 工具高效搜尋輸出
3. 提供全面分析而不消耗過多上下文

## 使用範例

### 打包本地程式碼庫

使用 `/repomix-commands:pack-local` 指令搭配自然語言指示：

```text
/repomix-commands:pack-local
將此專案打包為 Markdown 格式並壓縮
```

其他範例：
- "僅打包 src 目錄"
- "打包 TypeScript 檔案並新增行號"
- "產生 JSON 格式的輸出"

### 打包遠端儲存庫

使用 `/repomix-commands:pack-remote` 指令分析 GitHub 儲存庫：

```text
/repomix-commands:pack-remote yamadashy/repomix
僅打包 yamadashy/repomix 儲存庫中的 TypeScript 檔案
```

其他範例：
- "壓縮打包 main 分支"
- "僅包含文件檔案"
- "打包特定目錄"

### 使用 AI 探索本地程式碼庫

使用 `/repomix-explorer:explore-local` 指令進行 AI 驅動的分析：

```text
/repomix-explorer:explore-local ./src
尋找所有與認證相關的程式碼
```

其他範例：
- "分析這個專案的結構"
- "顯示主要元件"
- "尋找所有 API 端點"

### 使用 AI 探索遠端儲存庫

使用 `/repomix-explorer:explore-remote` 指令分析 GitHub 儲存庫：

```text
/repomix-explorer:explore-remote facebook/react
顯示主要元件架構
```

其他範例：
- "尋找儲存庫中的所有 React hooks"
- "解釋專案結構"
- "錯誤邊界在哪裡定義？"

## 相關資源

- [MCP 伺服器文件](/guide/mcp-server) - 瞭解底層 MCP 伺服器
- [設定](/guide/configuration) - 自訂 Repomix 行為
- [安全性](/guide/security) - 瞭解安全功能
- [命令列選項](/guide/command-line-options) - 可用的 CLI 選項

## 外掛原始碼

外掛原始碼可在 Repomix 儲存庫中找到：

- [外掛市集](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP 外掛](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [指令外掛](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [儲存庫探索器外掛](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## 意見回饋和支援

如果您遇到問題或對 Claude Code 外掛有建議：

- [在 GitHub 上提交 issue](https://github.com/yamadashy/repomix/issues)
- [加入我們的 Discord 社群](https://discord.gg/wNYzTwZFku)
- [檢視現有討論](https://github.com/yamadashy/repomix/discussions)
