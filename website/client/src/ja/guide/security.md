# セキュリティ

## セキュリティチェック機能

Repomixは[Secretlint](https://github.com/secretlint/secretlint)を使用して、ファイル内の機密情報を検出します：
- APIキーとアクセストークン
- 認証情報
- 秘密鍵と証明書
- データベース接続文字列
- 機密情報を含む環境変数
- 個人情報や機密データ

## 設定

セキュリティチェックはデフォルトで有効になっています。

CLIで無効化する場合
```bash
repomix --no-security-check
```

または`repomix.config.json`で
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## セキュリティ対策

1. **バイナリファイルの除外**: バイナリファイルは出力に含まれず、ファイルサイズを削減し機密データの漏洩を防止します
2. **Git対応**: `.gitignore`パターンを尊重し、既に除外対象としてマークされている機密ファイルを含めないようにします
3. **自動検出**: 以下を含む一般的なセキュリティ問題を検出します：
    - AWSの認証情報とアクセスキー
    - データベース接続文字列とパスワード
    - 認証トークンとOAuth認証情報
    - 秘密鍵と証明書
    - 機密情報を含む環境変数

## セキュリティチェックで問題が見つかった場合

出力例
```bash
🔍 Security Check:
──────────────────
2 suspicious file(s) detected and excluded:
1. config/credentials.json
  - Found AWS access key
2. .env.local
  - Found database password
```

## ベストプラクティス

1. AIサービスと共有する前に必ず出力を確認
2. `.repomixignore`を使用して追加の機密性のあるパスを除外
3. 絶対に必要な場合を除き、セキュリティチェックを有効に保つ
4. 機密ファイルをリポジトリから削除するか、除外パターンに追加

## セキュリティ問題の報告

セキュリティ脆弱性を発見した場合は
1. パブリックなイシューは作成しないでください
2. メール: koukun0120@gmail.com
3. または[GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)を使用
