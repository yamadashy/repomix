---
title: FAQとトラブルシューティング
description: Repomixのプライベートリポジトリ、出力形式、トークン削減、リモートGitHubリポジトリ、安全性、AIワークフローに関するよくある質問。
---

# FAQとトラブルシューティング

このページでは、Repomixの使い分け、出力サイズの削減、AIアシスタントに渡すコードベースコンテキストの準備について、よくある質問に答えます。

## よくある質問

### Repomixは何に使いますか？

Repomixはリポジトリを1つのAIフレンドリーなファイルにまとめます。ChatGPT、Claude、Geminiなどにコードベース全体の文脈を渡し、コードレビュー、バグ調査、リファクタリング、ドキュメント作成、オンボーディングに使えます。

### プライベートリポジトリでも使えますか？

はい。ローカルでアクセスできるチェックアウト内でRepomixを実行します。

```bash
repomix
```

外部のAIサービスに渡す前に、生成されたファイルを必ず確認してください。

### クローンせずに公開GitHubリポジトリを処理できますか？

はい。`--remote` に短縮形式または完全なURLを指定します。

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### どの出力形式を選べばよいですか？

迷ったらデフォルトのXMLを使ってください。読みやすさを重視する会話ではMarkdown、自動処理ではJSON、最大限の互換性が必要な場合はプレーンテキストが向いています。

```bash
repomix --style markdown
repomix --style json
```

詳しくは[出力フォーマット](/ja/guide/output)を参照してください。

## トークン使用量の削減

### 生成ファイルが大きすぎます。どうすればよいですか？

対象範囲を絞ります。

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

大きなリポジトリでは、include/ignoreパターンとコード圧縮を組み合わせるのが有効です。

### `--compress` は何をしますか？

`--compress` はimport、export、クラス、関数、インターフェースなどの重要な構造を残しつつ、多くの実装詳細を省きます。モデルにアーキテクチャや全体像を理解させたい場合に便利です。

## セキュリティとプライバシー

### CLIはコードをアップロードしますか？

Repomix CLIはローカルで実行され、出力ファイルを手元のマシンに書き込みます。Webサイトやブラウザ拡張の挙動は異なるため、[プライバシーポリシー](/ja/guide/privacy)を確認してください。

### シークレット混入はどう防ぎますか？

RepomixはSecretlintベースの安全チェックを使います。ただし補助的な防御として考え、出力内容は必ず自分で確認してください。

## トラブルシューティング

### 出力にファイルが含まれません。

Repomixは`.gitignore`、既定のignoreルール、カスタムignoreパターンを尊重します。`repomix.config.json`、`--ignore`、gitのignore設定を確認してください。

### チームで同じ出力を再現するには？

共有設定を作成してコミットします。

```bash
repomix --init
```

## 関連リソース

- [基本的な使い方](/ja/guide/usage)
- [コマンドラインオプション](/ja/guide/command-line-options)
- [コード圧縮](/ja/guide/code-compress)
- [セキュリティ](/ja/guide/security)
