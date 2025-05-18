# 安全性

## 安全檢查功能

Repomix 使用 [Secretlint](https://github.com/secretlint/secretlint) 來檢測檔案中的敏感資訊，包括：
- API 金鑰和存取令牌
- 身份驗證憑證
- 私鑰和憑證
- 資料庫連接字串
- 包含機密的環境變數
- 個人或敏感資料

## 設定

安全檢查預設為啟用。

透過 CLI 停用：
```bash
repomix --no-security-check
```

或在 `repomix.config.json` 中設定：
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## 安全措施

1. **二進制檔案排除**：輸出中不包含二進制檔案，以減少檔案大小並防止敏感資料洩漏
2. **Git 感知**：尊重 `.gitignore` 模式，避免包含已標記為排除的敏感檔案
3. **自動檢測**：掃描常見的安全問題：
  - AWS 憑證和存取金鑰
  - 資料庫連接字串和密碼
  - 身份驗證令牌和 OAuth 憑證
  - 私鑰和憑證
  - 包含敏感資訊的環境變數

## 當安全檢查發現問題

範例輸出：
```bash
🔍 安全檢查：
──────────────────
檢測到並排除了 2 個可疑檔案：
1. config/credentials.json
  - 發現 AWS 存取金鑰
2. .env.local
  - 發現資料庫密碼
```

## 最佳實踐

1. 在與 AI 服務分享之前，始終檢查輸出內容
2. 使用 `.repomixignore` 來排除額外的敏感路徑
3. 除非絕對必要，否則保持安全檢查啟用
4. 從儲存庫中移除敏感檔案或將其添加到忽略模式中

## 報告安全問題

發現安全漏洞？請：
1. 不要開啟公開的 issue
2. 發送電子郵件至：koukun0120@gmail.com
3. 或使用 [GitHub 安全公告](https://github.com/yamadashy/repomix/security/advisories/new)
