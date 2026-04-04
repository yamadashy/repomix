# コミュニティプロジェクト

Repomixコミュニティによって作られた素晴らしいプロジェクトをご紹介します！これらのプロジェクトは、Repomixの機能を拡張したり、他の言語での実装を提供したり、より大きなツールセットに統合したりしています。

## エディタ拡張

### Repomix Runner (VSCode拡張)
ファイルをAI処理用の単一出力にバンドルするVSCode拡張。選択したファイルのパック、再利用可能なバンドルの作成、コンテンツのクリップボードへのコピーが可能です。

**リポジトリ**: [massdo/repomix-runner](https://github.com/massdo/repomix-runner)  
**マーケットプレース**: [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)

## デスクトップアプリケーション

### Repomix Desktop
Repomix CLIのGUIラッパーを提供するコミュニティデスクトップアプリケーション。PythonとCustomTkinterで構築されており、ターミナルを使わずにユーザーフレンドリーなインターフェースで操作できます。

**リポジトリ**: [KevanMacGee/Repomix-Desktop](https://github.com/KevanMacGee/Repomix-Desktop)

## 言語実装

### Python Repomix
PythonコードのAST-based圧縮を持つRepomixのPython実装。複数の圧縮モード、detect-secretsを使用したセキュリティチェック、マルチプロセッシングサポートを特徴としています。

**リポジトリ**: [AndersonBY/python-repomix](https://github.com/AndersonBY/python-repomix)

## 統合ツール

### Rulefy
Claude AIを使用してGitHubリポジトリをカスタムCursor AIルールに変換します。プロジェクト構造と規約を抽出して.rules.mdcファイルを生成します。

**リポジトリ**: [niklub/rulefy](https://github.com/niklub/rulefy)

### Codebase MCP
Repomixを使用してAIエージェントがコードベースを分析するためのModel Context Protocolサーバー。ローカルワークスペース分析、リモートGitHubリポジトリ、分析結果の保存のためのツールを提供します。

**リポジトリ**: [DeDeveloper23/codebase-mcp](https://github.com/DeDeveloper23/codebase-mcp)

### vibe-tools
Perplexityによるウェブ検索、GeminiとRepomixによるリポジトリ分析、Stagehandによるブラウザ自動化など、複数の機能を持つAIエージェント用のCLIツールセットです。

**リポジトリ**: [eastlondoner/vibe-tools](https://github.com/eastlondoner/vibe-tools)

## 関連リソース

- [インストール](/ja/guide/installation) - Repomix CLIやブラウザ拡張機能のインストール
- [MCPサーバー](/ja/guide/mcp-server) - RepomixをAIアシスタント向けMCPサーバーとして使用
- [Claude Codeプラグイン](/ja/guide/claude-code-plugins) - Claude Code向けの公式プラグイン