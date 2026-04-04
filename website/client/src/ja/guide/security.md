# セキュリティ

## セキュリティチェック機能

Repomixは[Secretlint](https://github.com/secretlint/secretlint)を使用して、ファイル内の機密情報を検出します：
- APIキー
- アクセストークン
- 認証情報
- 秘密鍵
- 環境変数

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

1. **バイナリファイルの処理**: バイナリファイルの内容は出力から除外されますが、完全なリポジトリ概要のためにそのパスはディレクトリ構造にリストされます
2. **Git対応**: `.gitignore`パターンを尊重します
3. **自動検出**: 以下を含む一般的なセキュリティ問題を検出
    - AWSの認証情報
    - データベース接続文字列
    - 認証トークン
    - 秘密鍵

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

1. 共有する前に必ず出力を確認
2. `.repomixignore`を使用して機密性のあるパスを除外
3. セキュリティチェックを有効に保つ
4. 機密ファイルをリポジトリから削除

## セキュリティ問題の報告

セキュリティ脆弱性を発見した場合は
1. パブリックなイシューは作成しないでください
2. メール: koukun0120@gmail.com
3. または[GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)を使用

## 関連リソース

- [設定](/ja/guide/configuration) - `security.enableSecurityCheck`でセキュリティチェックを設定
- [コマンドラインオプション](/ja/guide/command-line-options) - `--no-security-check`フラグの使用
- [プライバシーポリシー](/ja/guide/privacy) - Repomixのデータ取り扱いについて
