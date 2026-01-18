# Repomix Explorer Skill (Agent Skills)

Repomixは、AIコーディングアシスタントがRepomix CLIを使ってコードベースを分析・探索できる、すぐに使える**Repomix Explorer**スキルを提供しています。

このスキルは、Claude Code、Cursor、Codex、GitHub Copilotなど、さまざまなAIツールで動作するように設計されています。

## クイックインストール

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

このコマンドは、AIアシスタントのスキルディレクトリ（例：`.claude/skills/`）にスキルをインストールし、すぐに利用可能にします。

## できること

インストール後、自然言語の指示でコードベースを分析できます。

#### リモートリポジトリを分析

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### ローカルコードベースを探索

```text
"What's in this project?
~/projects/my-app"
```

コードベースの理解だけでなく、自身の別のリポジトリを参考に機能を実装したい場合にも役立ちます。

## 仕組み

Repomix Explorer スキルは、AIアシスタントに完全なワークフローをガイドします：

1. **repomixコマンドを実行** - リポジトリをAIフレンドリーな形式にパック
2. **出力ファイルを分析** - パターン検索（grep）を使って関連コードを検索
3. **インサイトを提供** - 構造、メトリクス、実用的な推奨事項を報告

## ユースケース例

### 新しいコードベースの理解

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

AIはrepomixを実行し、出力を分析して、コードベースの構造化された概要を提供します。

### 特定パターンの検索

```text
"Find all authentication-related code in this repository."
```

AIは認証パターンを検索し、ファイルごとに分類して、認証がどのように実装されているかを説明します。

### 自分のプロジェクトを参照

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

AIは別のリポジトリを分析し、自身の実装を参考にするお手伝いをします。

## スキルの内容

このスキルには以下が含まれます：

- **ユーザー意図の認識** - コードベース分析を求めるさまざまな表現を理解
- **repomixコマンドのガイダンス** - 使用すべきオプション（`--compress`、`--include`など）を把握
- **分析ワークフロー** - パックされた出力を探索するための構造化されたアプローチ
- **ベストプラクティス** - ファイル全体を読む前にgrepを使うなどの効率化のヒント

## 関連リソース

- [Agent Skills生成](/ja/guide/agent-skills-generation) - コードベースから独自のスキルを生成
- [Claude Codeプラグイン](/ja/guide/claude-code-plugins) - Claude Code用のRepomixプラグイン
- [MCPサーバー](/ja/guide/mcp-server) - 代替の統合方法
