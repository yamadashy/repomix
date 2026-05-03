---
title: 常見問題與疑難排解
description: 解答 Repomix 關於私有儲存庫、輸出格式、減少 token、遠端 GitHub 儲存庫、安全檢查與 AI 工作流程的常見問題。
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

## 相關資源

- [基本用法](/zh-tw/guide/usage)
- [命令列選項](/zh-tw/guide/command-line-options)
- [程式碼壓縮](/zh-tw/guide/code-compress)
- [安全](/zh-tw/guide/security)
