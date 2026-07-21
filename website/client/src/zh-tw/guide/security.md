---
title: 安全性
description: 了解 Repomix 如何使用 Secretlint 與安全檢查，在打包前偵測密鑰、API key、token、憑證與敏感儲存庫內容。
---

# 安全性

## 安全檢查功能

Repomix 使用 [Secretlint](https://github.com/secretlint/secretlint) 檢測文件中的敏感信息：
- API 密鑰
- 訪問令牌
- 認證憑證
- 私鑰
- 環境變量

## 配置

安全檢查預設啟用。

通過命令行禁用：
```bash
repomix --no-security-check
```

或在 `repomix.config.json` 中配置：
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## 安全措施

1. **二進制文件處理**：二進制文件內容從輸出中排除，但其路徑在目錄結構中列出，以提供完整的倉庫概覽
2. **Git 感知**：遵循 `.gitignore` 模式
3. **自動檢測**：掃描常見安全問題：
    - AWS 憑證
    - 數據庫連接字符串
    - 認證令牌
    - 私鑰

## 遠端倉庫設定信任 {#remote-repository-config-trust}

當您使用 `--remote` 打包遠端倉庫時，Repomix 會將該倉庫的設定視為不受信任的程式碼。

### 為什麼設定檔是程式碼

`repomix.config.*` 不僅僅是資料：

- `repomix.config.ts` / `.js` / `.mjs` 在載入時會被**執行**。
- `input.processors` 會對符合的檔案執行外部命令。
- `output.instructionFilePath` 以及使用 `../` 的 include 模式會讀取倉庫之外的檔案。

因此，載入一個未經審查、來自陌生倉庫的設定，就相當於執行它的 `Makefile`，或是對帶有生命週期腳本的套件執行 `npm install`。

### 預設：遠端設定永遠不會被載入

除非您明確要求，否則 Repomix 會忽略複製倉庫的設定。您的全域設定和 CLI 選項仍然會正常生效。如果您從未傳入下面這個旗標，本節的內容都不會影響您。

### 啟用信任

```bash
# 使用 CLI 旗標
repomix --remote user/repo --remote-trust-config

# 使用環境變數
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

這會讓遠端設定獲得與您自己撰寫的設定相同的信任等級。請僅對您信任且已審查過的倉庫使用它。

### 確認提示

在互動式終端機中，Repomix 會顯示即將執行的設定，並在載入前徵求您的確認：

| 選項 | 效果 |
| --- | --- |
| **僅本次同意** | 僅信任這一次執行。 |
| **同意，且不再詢問此倉庫** | 記住該決定（詳見下文）。 |
| **否**（預設選項） | 中止操作，不載入該設定。 |

顯示給您的設定是由倉庫作者撰寫的，因此 Repomix 會確保該顯示內容不會被操縱：

- **控制字元與 ANSI 跳脫序列會被跳脫**，因此設定無法重繪終端機，也無法把警告捲動出畫面之外。
- **雙向控制字元與不可見字元會被跳脫**，因此您讀到的文字就是實際執行的文字（[Trojan Source](https://trojansource.codes/)）。
- **輸出會同時受到行數與位元組大小的限制**，因此被灌水的設定無法把警告擠出畫面。
- **每一行設定都會帶有前綴**，因此設定無法偽造 Repomix 自身的分隔線或訊息。
- **符號連結會被拒絕。** 由於 Git 會保留符號連結，倉庫可以提供一個指向複製目錄之外的 `repomix.config.json`。Repomix 要求設定必須是複製目錄內的一般檔案，否則您審查過的位元組就不是實際執行的位元組。

### 記住選擇

選擇「不再詢問」會在您的暫存目錄（`$TMPDIR/repomix/trusted-remotes/`）下儲存一個標記，該標記僅能由您的使用者帳戶讀寫。

該標記是**與內容綁定的**：它記錄了您所核准的設定的雜湊值。如果該倉庫之後提供了不同的設定，雜湊將不再相符，**系統會再次詢問您**，這與 `direnv allow` 的模式相同。

::: warning 綁定的範圍
該雜湊僅涵蓋入口設定檔。`.ts` / `.js` 設定可以 `import` 其他檔案，`input.processors` 也可以呼叫外部腳本，這兩者都不會被計入雜湊。一個您已經信任的倉庫，可以在入口檔案保持不變的情況下修改這些內容。這就是為什麼可執行的設定會在提示中被特別標註，請將「不再詢問」理解為對整個倉庫的信任，而不僅僅是您所讀到的那個檔案。
:::

標記儲存在暫存目錄中，因此當您的作業系統清除該目錄時，這些決定也會隨之失效。這是刻意的設計：朝「重新詢問」的方向失效才是安全的。

### 提示會被跳過的情況

| 情況 | 行為 |
| --- | --- |
| 傳入了 `--force` | 無需詢問即被信任。此旗標代表您接受由此產生的後果，系統會向標準錯誤輸出印出一則通知。 |
| 非互動式 shell（CI、管線等） | 無需詢問即被信任，讓現有自動化保持正常運作。系統會向標準錯誤輸出印出一則通知。 |
| 倉庫已被信任 | 只要設定未變更，就會無需詢問直接載入。 |
| 使用了絕對路徑的 `--config` | 複製倉庫自身的設定永遠不會被載入，因此沒有需要確認的內容。 |
| 複製的倉庫沒有設定檔 | 沒有可信任的對象。 |

在 `--stdout` 模式下，或當標準輸出被重新導向時，提示無法顯示。此時 Repomix 會回報一則附帶操作指引的錯誤，而不是默默地信任該設定。

### 建議

1. 除非您需要該倉庫自身的設定，否則請讓 `--remote-trust-config` 保持關閉。
2. 在回答之前，請閱讀提示中顯示的設定內容，特別是 `input.processors` 與任何 `../` 路徑。
3. 對於您無法掌控的倉庫，請優先選擇「僅本次同意」。
4. 在 CI 中，請記住此提示無法保護您，應固定您所打包的版本並事先審查。

## 安全檢查發現問題時

輸出示例：
```bash
🔍 Security Check:
──────────────────
2 suspicious file(s) detected and excluded:
1. config/credentials.json
  - Found AWS access key
2. .env.local
  - Found database password
```

## 最佳實踐

1. 分享前務必檢查輸出內容
2. 使用 `.repomixignore` 排除敏感路徑
3. 保持安全檢查功能啟用
4. 從倉庫中移除敏感文件

## 報告安全問題

如果發現安全漏洞，請：
1. 不要創建公開的 Issue
2. 發送郵件至：koukun0120@gmail.com
3. 或使用 [GitHub 安全公告](https://github.com/yamadashy/repomix/security/advisories/new)

## 相關資源

- [GitHub 倉庫處理](/zh-tw/guide/remote-repository-processing) - 打包您尚未複製的倉庫
- [設定](/zh-tw/guide/configuration) - 透過 `security.enableSecurityCheck` 設定安全檢查
- [命令列選項](/zh-tw/guide/command-line-options) - 使用 `--no-security-check` 旗標
- [隱私權政策](/zh-tw/guide/privacy) - 了解 Repomix 的資料處理方式
