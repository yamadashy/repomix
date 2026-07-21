---
title: GitHub 倉庫處理
description: 使用完整 URL、user/repo 簡寫、分支、標籤、提交、Docker 與遠端設定信任控制，透過 Repomix 打包 GitHub 儲存庫。
---

# GitHub 倉庫處理

## 基本用法

處理公共倉庫：
```bash
# 使用完整 URL
repomix --remote https://github.com/user/repo

# 使用 GitHub 簡寫
repomix --remote user/repo
```

你也可以直接傳入 `owner/repo` 簡寫，而無需 `--remote`：

```bash
repomix yamadashy/repomix
```

由於 `owner/repo` 看起來也像相對本機路徑，因此只有當不存在同名的本機檔案或目錄、且該儲存庫在 GitHub 上可存取時，Repomix 才會將其視為遠端儲存庫。已存在的本機路徑一律優先；若要強制將 `owner/repo` 形式的路徑作為本機路徑處理，請在前面加上 `./`（例如 `repomix ./owner/repo`）。如果參數符合該格式但儲存庫無法存取（例如私有儲存庫或拼字錯誤），Repomix 會回退為將其作為本機路徑處理。

## 分支和提交選擇

```bash
# 指定分支
repomix --remote user/repo --remote-branch main

# 指定標籤
repomix --remote user/repo --remote-branch v1.0.0

# 指定提交哈希
repomix --remote user/repo --remote-branch 935b695
```

## 系統要求

- 必須安裝 Git
- 需要網絡連接
- 需要倉庫的讀取權限

## 輸出控制

```bash
# 自定義輸出位置
repomix --remote user/repo -o custom-output.xml

# 使用 XML 格式
repomix --remote user/repo --style xml

# 移除註釋
repomix --remote user/repo --remove-comments
```

## Docker 使用方法

```bash
# 在當前目錄處理並輸出
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# 輸出到指定目錄
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## 安全性

基於安全考量，遠端倉庫中的設定檔（`repomix.config.*`）預設不會被載入。這可以防止不受信任的倉庫透過 `repomix.config.ts` 等設定檔執行程式碼。

您的全域設定和 CLI 選項仍然會正常生效。

如需信任遠端倉庫的設定：

```bash
# 使用 CLI 旗標
repomix --remote user/repo --remote-trust-config

# 使用環境變數
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

::: warning
`--remote-trust-config` 會讓遠端倉庫的設定獲得與本機同等的信任等級。受信任的設定可以（透過 `input.processors`）**執行任意命令**，也可以（例如透過 `output.instructionFilePath` 或使用 `../` 的 include 模式）**讀取倉庫之外的本機檔案**。請僅在您完全信任且已審查過的倉庫中使用，這應與執行來自陌生來源的 `npm install` 或 `Makefile` 之前所抱持的謹慎程度相同。
:::

### 確認提示

當您在互動式終端機中信任某個倉庫的設定時，repomix 會顯示即將執行的設定，並在載入前要求您確認：

- **僅本次同意**：僅信任這一次執行。
- **同意，且不再詢問此倉庫**：會持續記住，直到清除暫存檔案為止，且僅在該設定檔保持不變時有效（設定檔被修改後會再次提示）。請注意，此檢查僅針對設定檔本身：`.ts` / `.js` 設定可以匯入其他檔案，這些檔案不在檢查範圍內。
- **否**：中止操作，不執行該設定。

當您傳入 `--force`、在 CI 等非互動式 shell 中執行（設定會如以往一樣被信任，讓現有自動化保持正常運作），或是您已經選擇一律信任該倉庫時，此提示將被跳過。

關於完整的信任模型 —— 受信任的設定能做什麼、顯示的設定如何防止被竄改，以及「不再詢問」的決定儲存在哪裡 —— 請參閱[安全性](/zh-tw/guide/security#remote-repository-config-trust)。

在 `--remote` 模式下使用 `--config` 時，必須指定絕對路徑：

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## 常見問題

### 訪問問題
- 確保倉庫是公開的
- 檢查 Git 是否已安裝
- 驗證網絡連接

### 大型倉庫處理
- 使用 `--include` 選擇特定路徑
- 啟用 `--remove-comments`
- 分開處理不同分支

## 相關資源

- [命令列選項](/zh-tw/guide/command-line-options) - 完整的 CLI 參考，包括 `--remote` 選項
- [設定](/zh-tw/guide/configuration) - 為遠端處理設定預設選項
- [程式碼壓縮](/zh-tw/guide/code-compress) - 為大型倉庫減少輸出大小
- [安全](/zh-tw/guide/security) - Repomix 如何處理敏感資料偵測
