# 設定

## クイックスタート

設定ファイルを作成：
```bash
repomix --init
```

## 設定ファイル

`repomix.config.json`:
```json
{
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": true,
    "compress": false,
    "headerText": "カスタムヘッダーテキスト",
    "instructionFilePath": "repomix-instruction.md",
    "fileSummary": true,
    "directoryStructure": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100
    }
  },
  "include": ["**/*"],
  "forceInclude": ["coverage/summary.json", "test-results/junit.xml"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": ["tmp/", "*.log"]
  },
  "security": {
    "enableSecurityCheck": true
  }
}
```

## グローバル設定

グローバル設定を作成：
```bash
repomix --init --global
```

設定ファイルの場所：
- Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
- macOS/Linux: `~/.config/repomix/repomix.config.json`

## 除外パターン

優先順位：
1. 強制的に含めるパターン（`--force-include`）
2. CLIオプション（`--ignore`）
3. `.repomixignore`
4. `.gitignore` および `.git/info/exclude`
5. デフォルトパターン

`.repomixignore` の例：
```text
# キャッシュディレクトリ
.cache/
tmp/

# ビルド出力
dist/
build/

# ログ
*.log
```

## デフォルトの除外パターン

デフォルトで含まれる一般的なパターン：
```text
node_modules/**
.git/**
coverage/**
dist/**
```

全リスト: [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## 設定例

### コード圧縮

`output.compress`を`true`に設定すると、Repomixは実装の詳細を削除しながら、本質的なコード構造を抽出します。これにより、トークン数を削減しながら重要な構造情報を維持できます。

詳細と例については[コード圧縮ガイド](code-compress)をご覧ください。

### Git統合

`output.git`設定では、Gitの履歴に基づいてファイルをソートする方法や、Gitの差分を含める方法を制御できます：

- `sortByChanges`: `true`に設定すると、ファイルはGitの変更回数（そのファイルを変更したコミット数）でソートされます。より多くの変更があるファイルが出力の下部に表示されます。これは、より活発に開発されているファイルを優先するのに役立ちます。デフォルト: `true`
- `sortByChangesMaxCommits`: ファイルの変更回数を数える際に分析する最大コミット数。デフォルト: `100`
- `includeDiffs`: `true`に設定すると、Git差分を出力に含めます（ワークツリーとステージング済みの変更を別々に含みます）。これにより、リポジトリの保留中の変更を確認できます。デフォルト: `false`

設定例：
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true
    }
  }
}
```

### コメントの削除

`output.removeComments`を`true`に設定すると、サポートされているファイルタイプからコメントが削除され、出力サイズを削減し、本質的なコード内容に焦点を当てることができます。

サポートされている言語と詳細な例については[コメント削除ガイド](comment-removal)をご覧ください。