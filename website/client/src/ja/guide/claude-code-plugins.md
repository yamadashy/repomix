# Claude Code プラグイン

Repomixは[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)向けの公式プラグインを提供しています。これらのプラグインを使用すると、自然言語コマンドでClaude Code内から直接コードベースを分析・パッキングできます。

## インストール

### 1. Repomixプラグインマーケットプレースの追加

まず、Claude CodeにRepomixプラグインマーケットプレースを追加します：

```text
/plugin marketplace add yamadashy/repomix
```

### 2. プラグインのインストール

以下のコマンドでプラグインをインストールします：

```text
# MCPサーバープラグインをインストール（推奨の基盤）
/plugin install repomix-mcp@repomix

# コマンドプラグインをインストール（機能拡張）
/plugin install repomix-commands@repomix

# リポジトリエクスプローラープラグインをインストール（AI駆動分析）
/plugin install repomix-explorer@repomix
```

::: tip プラグインの関係
`repomix-mcp`プラグインは基盤として推奨されます。`repomix-commands`プラグインは便利なスラッシュコマンドを提供し、`repomix-explorer`はAI駆動の分析機能を追加します。独立してインストールすることもできますが、3つすべてを使用することで最も包括的な体験が得られます。
:::

### 代替: インタラクティブインストール

インタラクティブなプラグインインストーラーも使用できます：

```text
/plugin
```

これにより、利用可能なプラグインを閲覧してインストールできるインタラクティブなインターフェースが開きます。

## 利用可能なプラグイン

### 1. repomix-mcp（MCPサーバープラグイン）

MCP サーバー統合によるAI駆動のコードベース分析を提供する基盤プラグインです。

**機能:**
- ローカル・リモートリポジトリのパッキング
- パッキング済み出力の検索
- セキュリティスキャン機能付きファイル読み込み（[Secretlint](https://github.com/secretlint/secretlint)）
- 自動Tree-sitter圧縮（トークン数を約70%削減）

### 2. repomix-commands（スラッシュコマンドプラグイン）

自然言語サポート付きの便利なスラッシュコマンドを提供します。

**利用可能なコマンド:**
- `/repomix-commands:pack-local` - 様々なオプションでローカルコードベースをパッキング
- `/repomix-commands:pack-remote` - リモートGitHubリポジトリをパッキング・分析

### 3. repomix-explorer（AI分析エージェントプラグイン）

Repomix CLIを使用してコードベースをインテリジェントに探索するAI駆動のリポジトリ分析エージェントです。

**機能:**
- 自然言語によるコードベースの探索と分析
- インテリジェントなパターン発見とコード構造の理解
- grepとターゲットファイル読み込みによる段階的分析
- 大規模リポジトリの自動コンテキスト管理

**利用可能なコマンド:**
- `/repomix-explorer:explore-local` - AIアシスタントによるローカルコードベースの分析
- `/repomix-explorer:explore-remote` - AIアシスタントによるリモートGitHubリポジトリの分析

**動作方法:**
1. `npx repomix@latest`を実行してリポジトリをパッキング
2. GrepとReadツールを使用して効率的に出力を検索
3. 過度なコンテキスト消費なしで包括的な分析を提供

## 使用例

### ローカルコードベースのパッキング

`/repomix-commands:pack-local`コマンドを自然言語の指示と共に使用します：

```text
/repomix-commands:pack-local
このプロジェクトをMarkdown形式で圧縮してパッキングして
```

その他の例：
- "srcディレクトリのみをパッキングして"
- "TypeScriptファイルを行番号付きでパッキング"
- "JSON形式で出力を生成"

### リモートリポジトリのパッキング

`/repomix-commands:pack-remote`コマンドを使用してGitHubリポジトリを分析します：

```text
/repomix-commands:pack-remote yamadashy/repomix
yamadashy/repomixリポジトリからTypeScriptファイルのみをパッキング
```

その他の例：
- "mainブランチを圧縮してパッキング"
- "ドキュメントファイルのみを含める"
- "特定のディレクトリをパッキング"

### AIによるローカルコードベースの探索

`/repomix-explorer:explore-local`コマンドを使用してAI駆動の分析を実行します：

```text
/repomix-explorer:explore-local ./src
認証関連のコードをすべて見つけて
```

その他の例：
- "このプロジェクトの構造を分析して"
- "主要なコンポーネントを見せて"
- "すべてのAPIエンドポイントを見つけて"

### AIによるリモートリポジトリの探索

`/repomix-explorer:explore-remote`コマンドを使用してGitHubリポジトリを分析します：

```text
/repomix-explorer:explore-remote facebook/react
主要なコンポーネントアーキテクチャを見せて
```

その他の例：
- "リポジトリ内のすべてのReactフックを見つけて"
- "プロジェクト構造を説明して"
- "エラーバウンダリーはどこで定義されている？"

## 関連リソース

- [MCPサーバードキュメント](/guide/mcp-server) - 基盤となるMCPサーバーについて学ぶ
- [設定](/guide/configuration) - Repomixの動作をカスタマイズ
- [セキュリティ](/guide/security) - セキュリティ機能の理解
- [コマンドラインオプション](/guide/command-line-options) - 利用可能なCLIオプション

## プラグインのソースコード

プラグインのソースコードはRepomixリポジトリで公開されています：

- [プラグインマーケットプレース](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCPプラグイン](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [コマンドプラグイン](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [リポジトリエクスプローラープラグイン](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## フィードバックとサポート

Claude Codeプラグインに関する問題や提案がある場合：

- [GitHubでissueを開く](https://github.com/yamadashy/repomix/issues)
- [Discordコミュニティに参加](https://discord.gg/wNYzTwZFku)
- [既存のディスカッションを見る](https://github.com/yamadashy/repomix/discussions)
