# MCPサーバー

Repomixは[Model Context Protocol (MCP)](https://modelcontextprotocol.io)をサポートしており、AIアシスタントがコードベースと直接対話できるようになります。MCPサーバーとして実行すると、Repomixはローカルまたはリモートリポジトリを手動でファイル準備することなく、AI分析用にパッケージ化するツールを提供します。この統合により、ファイルを手動で生成してアップロードする必要がなくなり、コード分析のプロセスが効率化されます。

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

### npxの代わりにDockerを使用する場合

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

このツールはローカルのコードディレクトリをAI分析用に単一ファイルにパッケージ化します。

**パラメータ：**
- `directory`: (必須) パッケージ化するディレクトリの絶対パス
- `compress`: (オプション、デフォルト: true) トークン数を削減するためのインテリジェントなコード抽出を実行するかどうか
- `includePatterns`: (オプション) カンマ区切りの包含パターンリスト
- `ignorePatterns`: (オプション) カンマ区切りの除外パターンリスト

**例：**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

このツールはGitHubリポジトリを取得、クローン、パッケージ化してAI分析用の単一ファイルを作成します。

**パラメータ：**
- `remote`: (必須) GitHubリポジトリURLまたはuser/repo形式（例：yamadashy/repomix）
- `compress`: (オプション、デフォルト: true) トークン数を削減するためのインテリジェントなコード抽出を実行するかどうか
- `includePatterns`: (オプション) カンマ区切りの包含パターンリスト
- `ignorePatterns`: (オプション) カンマ区切りの除外パターンリスト

**例：**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### read_repomix_output

このツールは直接ファイルアクセスできない環境でRepomix出力ファイルの内容を読み込みます。

**パラメータ：**
- `outputId`: (必須) 読み込むRepomix出力ファイルのID

**機能：**
- ウェブベース環境やサンドボックスアプリケーション向けに特別に設計
- IDを使用して以前に生成された出力の内容を取得
- ファイルシステムアクセスを必要とせずにパッケージ化されたコードベースへの安全なアクセスを提供

**例：**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file と file_system_read_directory

RepomixのMCPサーバーは、AIアシスタントがローカルファイルシステムと安全にやり取りするための2つのファイルシステムツールを提供しています：

1. `file_system_read_file`
  - 絶対パスを使用してファイルの内容を読み取り
  - [Secretlint](https://github.com/secretlint/secretlint)を使用したセキュリティ検証を実装
  - 機密情報を含むファイルへのアクセスを防止
  - 無効なパスやセキュリティの問題に対する明確なエラーメッセージを返す

2. `file_system_read_directory`
  - 絶対パスを使用してディレクトリの内容を一覧表示
  - ファイルとディレクトリを明確な指標（`[FILE]`または`[DIR]`）で表示
  - 適切なエラー処理による安全なディレクトリ走査を提供
  - パスの検証と絶対パスの確認を実施

両ツールは堅牢なセキュリティ対策を組み込んでいます：
- ディレクトリトラバーサル攻撃を防ぐための絶対パス検証
- 適切なアクセス権を確保するための権限チェック
- 機密情報検出のためのSecretlintとの統合
- デバッグとセキュリティ認識のための明確なエラーメッセージ
- バイナリファイルや実行可能ファイルへのアクセスを防止するためのファイルタイプの検証

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
5. **セキュリティ制御**: 組み込みのセキュリティ検証機能により、コードベースへの安全なアクセスを提供します。

設定が完了すると、AIアシスタントはRepomixの機能を直接使用してコードベースを分析できるようになり、コード分析ワークフローがより効率的になります。
