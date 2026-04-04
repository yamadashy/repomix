# GitHub 倉庫處理

## 基本用法

處理公共倉庫：
```bash
# 使用完整 URL
repomix --remote https://github.com/user/repo

# 使用 GitHub 簡寫
repomix --remote user/repo
```

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
