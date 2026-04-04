# MCPサーバー

Repomixは[Model Context Protocol (MCP)](https://modelcontextprotocol.io)をサポートしており、AIアシスタントがコードベースと直接対話できるようになります。MCPサーバーとして実行すると、Repomixはローカルまたはリモートリポジトリを手動でファイル準備することなく、AI分析用にパッケージ化するツールを提供します。

> [!NOTE]  
> これは実験的な機能であり、ユーザーのフィードバックと実際の使用状況に基づいて積極的に改善を進めていきます

## RepomixをMCPサーバーとして実行する

RepomixをMCPサーバーとして実行するには、`--mcp`フラグを使用します：

```bash
repomix --mcp
```

これによりRepomixがMCPサーバーモードで起動し、Model Context ProtocolをサポートするAIアシスタントから利用できるようになります。

## MCPサーバーの設定

RepomixをMCPサーバーとしてClaudeなどのAIアシスタントで使用するには、MCP設定を構成する必要があります：

### VS Code向け

VS CodeにRepomix MCPサーバーをインストールするには、以下のいずれかの方法を使用します：

1. **インストールバッジを使用：**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **コマンドラインを使用：**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  VS Code Insiders の場合：
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Cline（VS Code拡張機能）の場合

`cline_mcp_settings.json`ファイルを編集します：

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Cursorの場合

Cursorでは、`Cursor Settings` > `MCP` > `+ Add new global MCP server`からClineと同様の設定を追加します。

### Claude Desktopの場合

`claude_desktop_config.json`ファイルをClineの設定と同様に編集します。

### Claude Codeの場合

[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)でRepomixをMCPサーバーとして設定するには、以下のコマンドを使用します：

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

または、より便利な体験のために**公式Repomixプラグイン**を使用することもできます。プラグインは自然言語コマンドと簡単なセットアップを提供します。詳細は[Claude Codeプラグイン](/ja/guide/claude-code-plugins)のドキュメントをご覧ください。

### npxの代わりにDockerを使用

Dockerを使用してRepomixをMCPサーバーとして実行できます：

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## 利用可能なMCPツール

MCPサーバーとして実行すると、Repomixは以下のツールを提供します：

### pack_codebase

このツールはローカルのコードディレクトリをAI分析用のXMLファイルにパッケージ化します。コードベース構造を分析し、関連するコード内容を抽出し、メトリクス、ファイルツリー、フォーマットされたコード内容を含む包括的なレポートを生成します。

**パラメータ：**
- `directory`: (必須) パッケージ化するディレクトリの絶対パス
- `compress`: (オプション、デフォルト: false) 実装の詳細を削除しながら、重要なコードシグネチャと構造を抽出するTree-sitter圧縮を有効にします。セマンティックな意味を保持しながらトークン使用量を約70%削減します。grep_repomix_outputが段階的なコンテンツ取得を可能にするため、通常は不要です。大きなリポジトリのコードベース全体の内容が特に必要な場合のみ使用してください。
- `includePatterns`: (オプション) fast-globパターンを使用して含めるファイルを指定します。複数のパターンはカンマ区切りで指定できます（例："**/*.{js,ts}", "src/**,docs/**"）。マッチするファイルのみが処理されます。
- `ignorePatterns`: (オプション) fast-globパターンを使用して除外する追加ファイルを指定します。複数のパターンはカンマ区切りで指定できます（例："test/**,*.spec.js", "node_modules/**,dist/**"）。これらのパターンは.gitignoreと組み込み除外を補完します。
- `topFilesLength`: (オプション、デフォルト: 10) コードベース分析のメトリクス要約に表示する最大ファイル数（サイズ順）。

**例：**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

このツールはGitHubリポジトリを取得、クローン、パッケージ化してAI分析用のXMLファイルを作成します。リモートリポジトリを自動的にクローンし、その構造を分析し、包括的なレポートを生成します。

**パラメータ：**
- `remote`: (必須) GitHubリポジトリURLまたはuser/repo形式（例："yamadashy/repomix", "https://github.com/user/repo", または "https://github.com/user/repo/tree/branch"）
- `compress`: (オプション、デフォルト: false) 実装の詳細を削除しながら、重要なコードシグネチャと構造を抽出するTree-sitter圧縮を有効にします。セマンティックな意味を保持しながらトークン使用量を約70%削減します。grep_repomix_outputが段階的なコンテンツ取得を可能にするため、通常は不要です。大きなリポジトリのコードベース全体の内容が特に必要な場合のみ使用してください。
- `includePatterns`: (オプション) fast-globパターンを使用して含めるファイルを指定します。複数のパターンはカンマ区切りで指定できます（例："**/*.{js,ts}", "src/**,docs/**"）。マッチするファイルのみが処理されます。
- `ignorePatterns`: (オプション) fast-globパターンを使用して除外する追加ファイルを指定します。複数のパターンはカンマ区切りで指定できます（例："test/**,*.spec.js", "node_modules/**,dist/**"）。これらのパターンは.gitignoreと組み込み除外を補完します。
- `topFilesLength`: (オプション、デフォルト: 10) コードベース分析のメトリクス要約に表示する最大ファイル数（サイズ順）。

**例：**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

このツールはRepomixで生成された出力ファイルの内容を読み込みます。大きなファイルに対する行範囲指定による部分読み込みをサポートします。このツールは直接ファイルシステムアクセスが制限された環境向けに設計されています。

**パラメータ：**
- `outputId`: (必須) 読み込むRepomix出力ファイルのID
- `startLine`: (オプション) 開始行番号（1ベース、包含）。指定しない場合は最初から読み込みます。
- `endLine`: (オプション) 終了行番号（1ベース、包含）。指定しない場合は最後まで読み込みます。

**機能：**
- ウェブベース環境やサンドボックスアプリケーション向けに特別に設計
- IDを使用して以前に生成された出力の内容を取得
- ファイルシステムアクセスを必要とせずにパッケージ化されたコードベースへの安全なアクセスを提供
- 大きなファイルの部分読み込みをサポート

**例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

このツールはJavaScript RegExp構文を使用したgrep風の機能でRepomix出力ファイル内のパターンを検索します。マッチした行の前後にオプションのコンテキスト行を含めて返します。

**パラメータ：**
- `outputId`: (必須) 検索するRepomix出力ファイルのID
- `pattern`: (必須) 検索パターン（JavaScript RegExp正規表現構文）
- `contextLines`: (オプション、デフォルト: 0) 各マッチの前後に表示するコンテキスト行数。beforeLines/afterLinesが指定された場合はそちらが優先されます。
- `beforeLines`: (オプション) 各マッチの前に表示するコンテキスト行数（grep -Bのように）。contextLinesより優先されます。
- `afterLines`: (オプション) 各マッチの後に表示するコンテキスト行数（grep -Aのように）。contextLinesより優先されます。
- `ignoreCase`: (オプション、デフォルト: false) 大文字小文字を区別しないマッチングを実行

**機能：**
- 強力なパターンマッチングのためのJavaScript RegExp構文を使用
- マッチの理解を深めるためのコンテキスト行をサポート
- before/afterコンテキスト行の個別制御が可能
- 大文字小文字を区別する/しない検索オプション

**例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file と file_system_read_directory

RepomixのMCPサーバーは、AIアシスタントがローカルファイルシステムと安全にやり取りするための2つのファイルシステムツールを提供しています：

1. `file_system_read_file`
  - 絶対パスを使用してローカルファイルシステムからファイルの内容を読み取り
  - 機密情報を含むファイルへのアクセスを検出・防止する組み込みセキュリティ検証を含む
  - [Secretlint](https://github.com/secretlint/secretlint)を使用したセキュリティ検証を実装
  - 機密情報を含むファイル（APIキー、パスワード、シークレット）へのアクセスを防止
  - ディレクトリトラバーサル攻撃を防ぐための絶対パス検証
  - 無効なパスやセキュリティの問題に対する明確なエラーメッセージを返す

2. `file_system_read_directory`
  - 絶対パスを使用してディレクトリの内容を一覧表示
  - ファイルとサブディレクトリを明確な指標で示すフォーマット済みリストを返す
  - ファイルとディレクトリを明確な指標（`[FILE]`または`[DIR]`）で表示
  - 適切なエラー処理による安全なディレクトリ走査を提供
  - パスの検証と絶対パスの確認を実施
  - プロジェクト構造の探索とコードベース組織の理解に有用

両ツールは堅牢なセキュリティ対策を組み込んでいます：
- ディレクトリトラバーサル攻撃を防ぐための絶対パス検証
- 適切なアクセス権を確保するための権限チェック
- 機密情報検出のためのSecretlintとの統合
- デバッグとセキュリティ認識のための明確なエラーメッセージ

**例：**
```typescript
// ファイルの読み取り
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// ディレクトリの内容一覧
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

これらのツールは、AIアシスタントが以下のような操作を必要とする場合に特に有用です：
- コードベース内の特定のファイルを分析
- ディレクトリ構造をナビゲート
- ファイルの存在とアクセス可能性を確認
- 安全なファイルシステム操作を確保

## RepomixをMCPサーバーとして使用する利点

RepomixをMCPサーバーとして使用すると、いくつかの利点があります：

1. **直接統合**: AIアシスタントが手動でファイルを準備することなく、コードベースを直接分析できます。
2. **効率的なワークフロー**: ファイルを手動で生成してアップロードする必要がなくなり、コード分析のプロセスが効率化されます。
3. **一貫した出力**: AIアシスタントが一貫性のある最適化された形式でコードベースを受け取ることができます。
4. **高度な機能**: コード圧縮、トークンカウント、セキュリティチェックなど、Repomixのすべての機能を活用できます。

設定が完了すると、AIアシスタントはRepomixの機能を直接使用してコードベースを分析できるようになり、コード分析ワークフローがより効率的になります。

## 関連リソース

- [Claude Codeプラグイン](/ja/guide/claude-code-plugins) - Claude Code向けの便利なプラグイン連携
- [設定](/ja/guide/configuration) - Repomixの動作をカスタマイズ
- [コマンドラインオプション](/ja/guide/command-line-options) - CLIリファレンス
- [出力フォーマット](/ja/guide/output) - 利用可能な出力形式について
