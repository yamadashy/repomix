# コマンドラインオプション

## 基本オプション
- `-v, --version`: ツールのバージョンを表示

## CLI入出力オプション
- `--verbose`: 詳細なログを有効化
- `--quiet`: 標準出力へのすべての出力を無効化
- `--stdout`: ファイルに書き込む代わりに標準出力に出力（`--output`オプションと併用不可）
- `--stdin`: ファイルを自動的に検出する代わりに、stdinからファイルパスを読み取る
- `--copy`: 生成された出力をシステムクリップボードにも追加でコピー
- `--token-count-tree [threshold]`: トークン数のサマリーでファイルツリーを表示（オプション：最小トークン数のしきい値）。大きなファイルを特定し、AIコンテキスト制限に向けたトークン使用量を最適化するのに有用
- `--top-files-len <number>`: サマリーに表示するトップファイルの数

## Repomix出力オプション
- `-o, --output <file>`: 出力ファイル名を指定
- `--style <style>`: 出力スタイルを指定（`xml`、`markdown`、`plain`）
- `--parsable-style`: 選択した形式のスキーマに基づいて解析可能な出力を有効化。これによりトークン数が増加する可能性があります。
- `--compress`: 関数やクラスのシグネチャなどの重要な構造に焦点を当てたインテリジェントなコード抽出を実行し、トークン数を削減
- `--output-show-line-numbers`: 出力に行番号を表示
- `--no-file-summary`: ファイルサマリーセクションの出力を無効化
- `--no-directory-structure`: ディレクトリ構造セクションの出力を無効化
- `--no-files`: ファイル内容の出力を無効化（メタデータのみモード）
- `--remove-comments`: サポートされているファイルタイプからコメントを削除
- `--remove-empty-lines`: 出力から空行を削除
- `--truncate-base64`: Base64データ文字列の切り捨てを有効化
- `--header-text <text>`: ファイルヘッダーに含めるカスタムテキスト
- `--instruction-file-path <path>`: 詳細なカスタム指示を含むファイルのパス
- `--include-empty-directories`: 空のディレクトリを出力に含める
- `--include-diffs`: Git差分を出力に含める（ワークツリーとステージングされた変更を別々に含む）
- `--include-logs`: Gitログを出力に含める（日時、メッセージ、ファイルパスを含むコミット履歴）
- `--include-logs-count <count>`: 含めるGitログのコミット数（デフォルト: 50）
- `--no-git-sort-by-changes`: Gitの変更回数によるファイルのソートを無効化（デフォルトで有効）

## ファイル選択オプション
- `--include <patterns>`: 含めるパターンのリスト（カンマ区切り）
- `-i, --ignore <patterns>`: 追加の除外パターン（カンマ区切り）
- `--ignore-content <patterns>`: Skip file content for matched patterns (comma-separated; prefix with `!` to keep specific paths)
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
- `--token-count-encoding <encoding>`: OpenAIの[tiktoken](https://github.com/openai/tiktoken)トークナイザーで使用されるトークンカウントエンコーディングを指定（例：GPT-4o用`o200k_base`、GPT-4/3.5用`cl100k_base`）。エンコーディングの詳細については[tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24)を参照してください。


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

# Git統合機能
repomix --include-logs   # Gitログを含める（デフォルトで50コミット）
repomix --include-logs --include-logs-count 10  # 最新10コミットを含める
repomix --include-diffs --include-logs  # 差分とログの両方を含める

# 特定のファイルを処理
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Ignore file contents for matching patterns
repomix --ignore-content "components/**,!components/slider/**"

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

# トークン数分析
repomix --token-count-tree
repomix --token-count-tree 1000  # 1000以上のトークンを持つファイル/ディレクトリのみを表示
```

