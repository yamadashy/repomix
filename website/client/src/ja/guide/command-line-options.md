# コマンドラインオプション

## 基本オプション
- `-v, --version`: バージョンを表示

## 出力オプション
- `-o, --output <file>`: 出力ファイル名（デフォルト: `repomix-output.txt`）
- `--stdout`: ファイルに書き込む代わりに標準出力に出力（`--output`オプションと併用不可）
- `--style <type>`: 出力形式（`plain`、`xml`、`markdown`）（デフォルト: `xml`）
- `--parsable-style`: 選択した形式のスキーマに基づいて解析可能な出力を有効化（デフォルト: `false`）
- `--compress`: 関数やクラスのシグネチャなどの重要な構造を保持しながら、実装の詳細を削除するインテリジェントなコード抽出を実行します。詳細と例については、[コード圧縮ガイド](code-compress)を参照してください。
- `--output-show-line-numbers`: 行番号を追加（デフォルト: `false`）
- `--copy`: クリップボードにコピー（デフォルト: `false`）
- `--no-file-summary`: ファイルサマリーを無効化（デフォルト: `true`）
- `--no-directory-structure`: ディレクトリ構造を無効化（デフォルト: `true`）
- `--no-files`: ファイル内容の出力を無効化（メタデータのみモード）（デフォルト: `true`）
- `--remove-comments`: コメントを削除（デフォルト: `false`）
- `--remove-empty-lines`: 空行を削除（デフォルト: `false`）
- `--header-text <text>`: ファイルヘッダーに含めるカスタムテキスト
- `--instruction-file-path <path>`: 詳細なカスタム指示を含むファイルのパス
- `--include-empty-directories`: 空のディレクトリを出力に含める（デフォルト: `false`）
- `--include-diffs`: Gitの差分を出力に含める（ワークツリーとステージングされた変更が別々に含まれます）（デフォルト: `false`）
- `--no-git-sort-by-changes`: Gitの変更回数によるファイルのソートを無効化（デフォルト: `true`）

## フィルターオプション
- `--include <patterns>`: 含めるパターン（カンマ区切り）
- `--force-include <patterns>`: 除外ルールを上書きして強制的に含めるパターン（カンマ区切り）
- `-i, --ignore <patterns>`: 除外パターン（カンマ区切り）
- `--stdin`: ファイルを自動的に検出する代わりに、stdinからファイルパスを読み取る
- `--no-gitignore`: .gitignoreファイルの使用を無効化
- `--no-default-patterns`: デフォルトパターンを無効化

## リモートリポジトリオプション
- `--remote <url>`: リモートリポジトリを処理
- `--remote-branch <name>`: リモートブランチ名、タグ、またはコミットハッシュを指定（デフォルトはリポジトリのデフォルトブランチ）

## 設定オプション
- `-c, --config <path>`: カスタム設定ファイルのパス
- `--init`: 設定ファイルを作成
- `--global`: グローバル設定を使用

## セキュリティオプション
- `--no-security-check`: セキュリティチェックを無効化（デフォルト: `true`）

## トークンカウントオプション
- `--token-count-encoding <encoding>`: トークンカウントのエンコーディングを指定（例: `o200k_base`、`cl100k_base`）（デフォルト: `o200k_base`）

## その他のオプション
- `--top-files-len <number>`: 表示するトップファイルの数（デフォルト: `5`）
- `--verbose`: 詳細なログを有効化
- `--quiet`: 標準出力へのすべての出力を無効化

## 使用例

```bash
# 基本的な使用方法
repomix

# カスタム出力
repomix -o output.xml --style xml

# 標準出力への出力
repomix --stdout > custom-output.txt

# 標準出力への出力後、他のコマンドへパイプ（例：simonw/llm）
repomix --stdout | llm "このコードについて説明してください"

# 圧縮を使用したカスタム出力
repomix --compress

# 特定のファイルを処理
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# 除外ルールを無視して特定のファイルを強制的に含める
repomix --force-include "coverage/summary.json,test-results/junit.xml"

# ブランチを指定したリモートリポジトリ
repomix --remote https://github.com/user/repo/tree/main

# コミットを指定したリモートリポジトリ
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# ショートハンドを使用したリモートリポジトリ
repomix --remote user/repo

# stdinを使用したファイルリスト
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```
