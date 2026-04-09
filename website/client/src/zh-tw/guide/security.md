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

- [設定](/zh-tw/guide/configuration) - 透過 `security.enableSecurityCheck` 設定安全檢查
- [命令列選項](/zh-tw/guide/command-line-options) - 使用 `--no-security-check` 旗標
- [隱私權政策](/zh-tw/guide/privacy) - 了解 Repomix 的資料處理方式
