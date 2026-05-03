---
title: 常見問題與疑難排解
description: 解答 Repomix 關於私有儲存庫、C# 和 Python 支援、MCP 相容 agent、輸出格式、減少 token、安全檢查與 AI 工作流程的常見問題。
---

# 常見問題與疑難排解

本頁協助你選擇合適的 Repomix 工作流程、減少過大的輸出，並為 AI 助手準備程式碼庫上下文。

## 常見問題

### Repomix 用來做什麼？

Repomix 會將儲存庫打包成一個 AI 友善檔案。你可以把完整程式碼庫上下文交給 ChatGPT、Claude、Gemini 等助手，用於程式碼審查、錯誤排查、重構、文件與入門導覽。

### Repomix 支援私有儲存庫嗎？

支援。在本機已有存取權限的 checkout 中執行 Repomix：

```bash
repomix
```

分享給外部 AI 服務前，請先檢查產生的檔案。

### 可以不 clone 就處理公開 GitHub 儲存庫嗎？

可以。使用 `--remote` 並傳入短寫或完整 URL：

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### 應該選擇哪種輸出格式？

不確定時先使用預設 XML。Markdown 適合可讀對話，JSON 適合自動化，純文字適合最大相容性。

```bash
repomix --style markdown
repomix --style json
```

請參考[輸出格式](/zh-tw/guide/output)。

## 減少 token 使用量

### 產生的檔案太大怎麼辦？

縮小上下文範圍：

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

大型儲存庫建議組合使用 include/ignore 模式與程式碼壓縮。

### `--compress` 做什麼？

`--compress` 會保留 import、export、類別、函式、介面等重要結構，同時移除許多實作細節。它適合讓模型理解架構和整體關係。

## 安全與隱私

### CLI 會上傳我的程式碼嗎？

Repomix CLI 在本機執行，並在你的機器上寫入輸出檔案。網站與瀏覽器擴充功能有不同流程，請查看[隱私權政策](/zh-tw/guide/privacy)。

### Repomix 如何避免包含密鑰？

Repomix 使用基於 Secretlint 的安全檢查。請把它視為額外防護，並一律人工檢查輸出。

## 疑難排解

### 為什麼輸出中缺少檔案？

Repomix 會遵守 `.gitignore`、預設 ignore 規則和自訂 ignore 模式。請檢查 `repomix.config.json`、`--ignore` 與 git ignore 設定。

### 如何讓團隊得到可重現的輸出？

建立並提交共享設定：

```bash
repomix --init
```

## 其他常見問題

### Repomix 支援 C#、Python、Java、Go、Rust 或其他語言的 repository 嗎？

支援。Repomix 會讀取專案檔案並將其格式化為適合 AI 工具使用的內容，因此可以打包任何程式語言編寫的 repository。CLI 需要 Node.js 20 或更高版本。一些進階功能，例如基於 Tree-sitter 的程式碼壓縮，會取決於對應語言的 parser 支援情況。

### 可以將 Repomix 與 Hermes Agent、OpenClaw 或其他 MCP 相容 agent 一起使用嗎？

可以。Repomix 可以作為 MCP server 執行：

```bash
npx -y repomix --mcp
```

對於 Hermes Agent，請在 `~/.hermes/config.yaml` 中將 Repomix 加入為 stdio MCP server：

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

對於 OpenClaw 或其他 MCP 相容 agent，請在其設定外部 stdio MCP server 的位置使用相同的 command 和 args。如果你的助理支援 Agent Skills，也可以使用 [Repomix Explorer Skill](/zh-tw/guide/repomix-explorer-skill)。

### 如何用 Repomix 幫助 AI 助理理解新的 library 或 framework？

打包該 library 的 repository 或文件，然後把輸出作為參考資料交給 AI 助理：

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

如果需要重複使用，也可以產生可重用的 Agent Skills 目錄：

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### 如何排除 CSS、測試、建置輸出或其他噪音檔案？

一次性命令可以使用 `--ignore`：

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

如果只想保留特定 source 或 docs 路徑，請使用 `--include`：

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Repository 大小有限制嗎？

CLI 沒有固定的 repository 大小限制，但非常大的 repository 可能會受到記憶體、檔案大小，以及 AI 工具上傳和 context 限制的影響。對於大型專案，建議先使用目標明確的 include pattern，檢查 token 較大的檔案，並在需要時拆分輸出：

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### 為什麼 `--include` 不會包含 `node_modules`、建置目錄或被忽略路徑中的檔案？

`--include` 會縮小 Repomix 嘗試打包的檔案範圍，但 ignore 規則仍然生效。檔案仍可能被 `.gitignore`、`.ignore`、`.repomixignore`、內建預設模式或 `repomix.config.json` 排除。進階情境可以考慮 `--no-gitignore` 或 `--no-default-patterns`，但要謹慎使用，因為它們可能會包含 dependencies、build artifacts 或其他噪音檔案。

## 相關資源

- [基本用法](/zh-tw/guide/usage)
- [命令列選項](/zh-tw/guide/command-line-options)
- [程式碼壓縮](/zh-tw/guide/code-compress)
- [安全](/zh-tw/guide/security)
