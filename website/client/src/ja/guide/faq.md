---
title: FAQとトラブルシューティング
description: Repomixのプライベートリポジトリ、C#やPython対応、MCP対応エージェント、出力形式、トークン削減、安全性、AIワークフローに関するよくある質問。
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

## 追加のよくある質問

### RepomixはC#、Python、Java、Go、Rustなどのリポジトリでも使えますか？

はい。Repomixはプロジェクト内のファイルを読み取り、AIツール向けに整形するため、任意のプログラミング言語のリポジトリをパックできます。CLIの実行にはNode.js 20以降が必要です。一部の高度な機能、たとえばTree-sitterベースのコード圧縮は、言語パーサーの対応状況によって結果が異なる場合があります。

### Hermes Agent、OpenClaw、その他のMCP対応エージェントで使えますか？

はい。RepomixはMCPサーバーとして実行できます。

```bash
npx -y repomix --mcp
```

Hermes Agentでは `~/.hermes/config.yaml` にstdio MCPサーバーとして追加できます。

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

OpenClawなどのMCP対応エージェントでは、外部stdio MCPサーバーを設定できる箇所で同じcommand/argsを使います。Agent Skills形式に対応している場合は、[Repomix Explorer Skill](/ja/guide/repomix-explorer-skill)も利用できます。

### 新しいライブラリやフレームワークをAIアシスタントに理解させるには？

ライブラリのリポジトリやドキュメントをRepomixでパックし、その出力を参照資料としてAIに渡します。

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

繰り返し使う場合は、再利用可能なAgent Skillsとして生成することもできます。

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### CSS、テスト、ビルド出力などのノイズを除外するには？

一度だけ指定する場合は `--ignore` を使います。

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

特定のソースやドキュメントだけ残したい場合は `--include` を使います。

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### リポジトリサイズに制限はありますか？

CLIには固定のリポジトリサイズ制限はありませんが、大きなリポジトリではメモリ、ファイルサイズ、AIツールのアップロード制限やコンテキスト制限に影響されます。大規模プロジェクトでは対象パターンを絞り、トークンの大きいファイルを確認し、必要なら出力を分割してください。

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### `--include` しても `node_modules` やignore対象のパスが含まれないのはなぜですか？

`--include` はパック対象を絞り込みますが、ignoreルールは引き続き適用されます。`.gitignore`、`.ignore`、`.repomixignore`、組み込みのデフォルトパターン、`repomix.config.json` によって除外される場合があります。必要な場合は `--no-gitignore` や `--no-default-patterns` を検討できますが、依存関係やビルド成果物まで含まれやすくなるため注意してください。

## 関連リソース

- [基本的な使い方](/ja/guide/usage)
- [コマンドラインオプション](/ja/guide/command-line-options)
- [コード圧縮](/ja/guide/code-compress)
- [セキュリティ](/ja/guide/security)
