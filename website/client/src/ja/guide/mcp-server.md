# MCPサーバー

Repomixは[Model Context Protocol (MCP)](https://modelcontextprotocol.io)をサポートしており、AIアシスタントがコードベースと直接対話できるようになります。MCPサーバーとして実行すると、Repomixはローカルまたはリモートリポジトリを手動でファイル準備することなく、AI分析用にパッケージ化するツールを提供します。

## RepomixをMCPサーバーとして実行する

RepomixをMCPサーバーとして実行するには、`--mcp`フラグを使用します：

```bash
repomix --mcp
```

これによりRepomixがMCPサーバーモードで起動し、Model Context ProtocolをサポートするAIアシスタントから利用できるようになります。

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

## MCPサーバーの設定

RepomixをMCPサーバーとしてClaudeなどのAIアシスタントで使用するには、MCP設定を構成する必要があります：

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

### Claude Desktopの場合

`claude_desktop_config.json`ファイルをClineの設定と同様に編集します。

## RepomixをMCPサーバーとして使用する利点

RepomixをMCPサーバーとして使用すると、いくつかの利点があります：

1. **直接統合**: AIアシスタントが手動でファイルを準備することなく、コードベースを直接分析できます。
2. **効率的なワークフロー**: ファイルを手動で生成してアップロードする必要がなくなり、コード分析のプロセスが効率化されます。
3. **一貫した出力**: AIアシスタントが一貫性のある最適化された形式でコードベースを受け取ることができます。
4. **高度な機能**: コード圧縮、トークンカウント、セキュリティチェックなど、Repomixのすべての機能を活用できます。

設定が完了すると、AIアシスタントはRepomixの機能を直接使用してコードベースを分析できるようになり、コード分析ワークフローがより効率的になります。
