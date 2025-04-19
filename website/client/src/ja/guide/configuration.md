# 設定

Repomixは設定ファイル（`repomix.config.json`）またはコマンドラインオプションを使用して設定できます。設定ファイルを使用することで、コードベースの処理と出力方法をカスタマイズできます。

## クイックスタート

プロジェクトディレクトリに設定ファイルを作成します：
```bash
repomix --init
```

これにより、デフォルト設定の`repomix.config.json`ファイルが作成されます。また、ローカル設定が見つからない場合のフォールバックとして使用されるグローバル設定ファイルを作成することもできます：

```bash
repomix --init --global
```

## 設定オプション

| オプション                        | 説明                                                                                                                         | デフォルト値           |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | 処理する最大ファイルサイズ（バイト）。これより大きいファイルはスキップされます。大きなバイナリファイルやデータファイルを除外するのに便利です | `50000000`            |
| `output.filePath`                | 出力ファイル名。XML、Markdown、プレーンテキスト形式をサポートしています                                                      | `"repomix-output.xml"` |
| `output.style`                   | 出力形式（`xml`、`markdown`、`plain`）。各形式はAIツールに応じて異なる利点があります                                        | `"xml"`                |
| `output.parsableStyle`           | 選択したスタイルスキーマに基づいて出力をエスケープするかどうか。より良い解析が可能になりますが、トークン数が増加する可能性があります | `false`                |
| `output.compress`                | Tree-sitterを使用してインテリジェントなコード抽出を実行し、構造を保持しながらトークン数を削減するかどうか                  | `false`                |
| `output.headerText`              | ファイルヘッダーに含めるカスタムテキスト。AIツールにコンテキストや指示を提供するのに便利です                              | `null`                 |
| `output.instructionFilePath`     | AI処理用の詳細なカスタム指示を含むファイルへのパス                                                                          | `null`                 |
| `output.fileSummary`             | ファイル数、サイズ、その他のメトリクスを示す要約セクションを出力の先頭に含めるかどうか                                    | `true`                 |
| `output.directoryStructure`      | 出力にディレクトリ構造を含めるかどうか。AIがプロジェクトの構成を理解するのに役立ちます                                    | `true`                 |
| `output.files`                   | 出力にファイル内容を含めるかどうか。falseに設定すると、構造とメタデータのみが含まれます                                   | `true`                 |
| `output.removeComments`          | サポートされているファイルタイプからコメントを削除するかどうか。ノイズとトークン数を削減できます                          | `false`                |
| `output.removeEmptyLines`        | 出力から空行を削除してトークン数を削減するかどうか                                                                          | `false`                |
| `output.showLineNumbers`         | 各行に行番号を追加するかどうか。コードの特定の部分を参照するのに役立ちます                                                 | `false`                |
| `output.copyToClipboard`         | ファイルの保存に加えて、出力をシステムクリップボードにコピーするかどうか                                                   | `false`                |
| `output.topFilesLength`          | 要約に表示するトップファイルの数。0に設定すると、要約は表示されません                                                       | `5`                    |
| `output.includeEmptyDirectories` | リポジトリ構造に空のディレクトリを含めるかどうか                                                                           | `false`                |
| `output.git.sortByChanges`       | Gitの変更回数でファイルをソートするかどうか。変更が多いファイルが下部に表示されます                                       | `true`                 |
| `output.git.sortByChangesMaxCommits` | Gitの変更を分析する最大コミット数。パフォーマンスのために履歴の深さを制限します                                       | `100`                  |
| `output.git.includeDiffs`        | 出力にGitの差分を含めるかどうか。作業ツリーとステージング済みの変更を別々に表示します                                     | `false`                |
| `include`                        | 含めるファイルのパターン（[globパターン](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)を使用）    | `[]`                   |
| `ignore.useGitignore`            | プロジェクトの`.gitignore`ファイルのパターンを使用するかどうか                                                             | `true`                 |
| `ignore.useDefaultPatterns`      | デフォルトの除外パターン（node_modules、.gitなど）を使用するかどうか                                                       | `true`                 |
| `ignore.customPatterns`          | 追加の除外パターン（[globパターン](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)を使用）          | `[]`                   |
| `security.enableSecurityCheck`   | Secretlintを使用して機密情報を検出するセキュリティチェックを実行するかどうか                                               | `true`                 |
| `tokenCount.encoding`            | OpenAIの[tiktoken](https://github.com/openai/tiktoken)トークナイザーで使用するトークンカウントエンコーディング。GPT-4oの場合は`o200k_base`、GPT-4/3.5の場合は`cl100k_base`を使用。詳細は[tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24)を参照 | `"o200k_base"`         |

設定ファイルは[JSON5](https://json5.org/)構文をサポートしており、以下が可能です：
- コメント（単一行および複数行）
- オブジェクトと配列の末尾のカンマ
- 引用符なしのプロパティ名
- より柔軟な文字列構文

## スキーマ検証

設定ファイルに`$schema`プロパティを追加することで、スキーマ検証を有効にできます：

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

これにより、JSONスキーマをサポートするエディタでの自動補完と検証が可能になります。

## 設定ファイルの例

以下は完全な設定ファイル（`repomix.config.json`）の例です：

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "パッケージ化されたファイルのカスタムヘッダー情報",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false
    }
  },
  "include": ["**/*"],
  "forceInclude": ["coverage/summary.json", "test-results/junit.xml"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // パターンは .repomixignore でも指定できます
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## 設定ファイルの場所

Repomixは以下の順序で設定ファイルを探します：
1. カレントディレクトリのローカル設定ファイル（`repomix.config.json`）
2. グローバル設定ファイル：
   - Windows: `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux: `~/.config/repomix/repomix.config.json`

コマンドラインオプションは設定ファイルの設定よりも優先されます。

## 除外パターン

Repomixは複数の方法でファイルの除外を指定できます。パターンは以下の優先順位で処理されます：

1. 強制的に含めるパターン（`--force-include`）
2. CLIオプション（`--ignore`）
3. プロジェクトディレクトリの`.repomixignore`ファイル
4. `.gitignore`および`.git/info/exclude`（`ignore.useGitignore`がtrueの場合）
5. デフォルトパターン（`ignore.useDefaultPatterns`がtrueの場合）

`.repomixignore`の例：
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

`ignore.useDefaultPatterns`がtrueの場合、Repomixは以下のような一般的なパターンを自動的に除外します：
```text
node_modules/**
.git/**
coverage/**
dist/**
```

完全なリストは[defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)を参照してください。

## 高度な機能

### コード圧縮

`output.compress: true`で有効になるコード圧縮機能は、[Tree-sitter](https://github.com/tree-sitter/tree-sitter)を使用して、実装の詳細を削除しながら本質的なコード構造を抽出します。これにより、重要な構造情報を維持しながらトークン数を削減できます。

主な利点：
- トークン数を大幅に削減
- クラスと関数のシグネチャを保持
- インポートとエクスポートを維持
- 型定義とインターフェースを保持
- 関数本体と実装の詳細を削除

詳細と例については[コード圧縮ガイド](code-compress)をご覧ください。

### Git統合

`output.git`設定では、以下のようなGit対応機能を提供します：

- `sortByChanges`: trueに設定すると、ファイルはGitの変更回数（そのファイルを変更したコミット数）でソートされます。変更が多いファイルが出力の下部に表示されます。これは、より活発に開発されているファイルを優先するのに役立ちます。デフォルト: `true`
- `sortByChangesMaxCommits`: ファイルの変更回数を数える際に分析する最大コミット数。デフォルト: `100`
- `includeDiffs`: trueに設定すると、Git差分を出力に含めます（ワークツリーとステージング済みの変更を別々に含みます）。これにより、リポジトリの保留中の変更を確認できます。デフォルト: `false`

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

### セキュリティチェック

`security.enableSecurityCheck`が有効な場合、Repomixは[Secretlint](https://github.com/secretlint/secretlint)を使用して、出力に含める前にコードベース内の機密情報を検出します。これにより、以下のような情報の誤った露出を防ぐことができます：

- APIキー
- アクセストークン
- 秘密鍵
- パスワード
- その他の機密情報

### コメントの削除

`output.removeComments`を`true`に設定すると、サポートされているファイルタイプからコメントが削除され、出力サイズを削減し、本質的なコード内容に焦点を当てることができます。これは以下のような場合に特に便利です：

- 大量にドキュメント化されたコードを扱う場合
- トークン数を削減したい場合
- コードの構造とロジックに集中したい場合

サポートされている言語と詳細な例については[コメント削除ガイド](comment-removal)をご覧ください。