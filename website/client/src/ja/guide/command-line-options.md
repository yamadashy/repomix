# コマンドラインオプション

## 基本オプション
- `-v, --version`: バージョン情報を表示して終了

## CLI入出力オプション
- `--verbose`: 詳細なデバッグログを有効化（ファイル処理、トークン数、設定詳細を表示）
- `--quiet`: エラー以外のすべてのコンソール出力を抑制（スクリプト実行時に有用）
- `--stdout`: パックした出力をファイルではなく標準出力に直接出力（すべてのログを抑制）
- `--stdin`: Stdinから1行ずつファイルパスを読み取り（指定されたファイルを直接処理）
- `--copy`: 処理後に生成された出力をシステムクリップボードにコピー
- `--token-count-tree [threshold]`: トークン数付きファイルツリーを表示；オプションでN以上のトークンを持つファイルのみ表示（例：--token-count-tree 100）
- `--top-files-len <number>`: サマリーに表示する最大ファイル数（デフォルト：5、例：--top-files-len 20）

## Repomix出力オプション
- `-o, --output <file>`: 出力ファイルパス（デフォルト：repomix-output.xml、標準出力には「-」を使用）
- `--style <type>`: 出力形式：xml、markdown、json、またはplain（デフォルト：xml）
- `--parsable-style`: 特殊文字をエスケープして有効なXML/Markdownを保証（出力に形式を破損するコードが含まれる場合に必要）
- `--compress`: Tree-sitter解析を使用して重要なコード構造（クラス、関数、インターフェース）を抽出
- `--output-show-line-numbers`: 出力の各行に行番号を付ける
- `--no-file-summary`: 出力からファイルサマリーセクションを省略
- `--no-directory-structure`: 出力からディレクトリツリーの可視化を省略
- `--no-files`: ファイル内容なしでメタデータのみを生成（リポジトリ分析に有用）
- `--remove-comments`: パック前にすべてのコードコメントを除去
- `--remove-empty-lines`: すべてのファイルから空行を削除
- `--truncate-base64`: 出力サイズを削減するため長いbase64データ文字列を切り詰め
- `--header-text <text>`: 出力の冒頭に含めるカスタムテキスト
- `--instruction-file-path <path>`: 出力に含めるカスタム指示を含むファイルのパス
- `--split-output <size>`: 出力を複数の番号付きファイルに分割（例: repomix-output.1.xml, repomix-output.2.xml）; 500kb、2mb、1.5mbなどのサイズ指定
- `--include-empty-directories`: ディレクトリ構造にファイルのないフォルダを含める
- `--include-full-directory-structure`: --includeパターンを使用する場合でも、ディレクトリ構造セクションにリポジトリ全体のツリーを表示
- `--no-git-sort-by-changes`: Git変更頻度によるファイルのソートをしない（デフォルト：最も変更の多いファイルを優先）
- `--include-diffs`: ワークツリーとステージングされた変更を示すgit diffセクションを追加
- `--include-logs`: メッセージと変更されたファイルを含むgitコミット履歴を追加
- `--include-logs-count <count>`: --include-logsで含める最新のコミット数（デフォルト：50）

## ファイル選択オプション
- `--include <patterns>`: これらのglobパターンに一致するファイルのみを含める（カンマ区切り、例：「src/**/*.js,*.md」）
- `-i, --ignore <patterns>`: 除外する追加パターン（カンマ区切り、例：「*.test.js,docs/**」）
- `--no-gitignore`: ファイルフィルタリングに.gitignoreルールを使用しない
- `--no-dot-ignore`: ファイルフィルタリングに.ignoreルールを使用しない
- `--no-default-patterns`: 組み込みの無視パターンを適用しない（node_modules、.git、buildディレクトリなど）

## リモートリポジトリオプション
- `--remote <url>`: リモートリポジトリをクローンしてパック（GitHub URLまたはuser/repo形式）
- `--remote-branch <name>`: 使用する特定のブランチ、タグ、またはコミット（デフォルト：リポジトリのデフォルトブランチ）

## 設定オプション
- `-c, --config <path>`: repomix.config.jsonの代わりにカスタム設定ファイルを使用
- `--init`: デフォルト設定で新しいrepomix.config.jsonファイルを作成
- `--global`: --initと併用、現在のディレクトリではなくホームディレクトリに設定を作成

## セキュリティオプション
- `--no-security-check`: APIキーやパスワードなどの機密データのスキャンをスキップ

## トークンカウントオプション
- `--token-count-encoding <encoding>`: カウント用のトークナイザーモデル：o200k_base（GPT-4o）、cl100k_base（GPT-3.5/4）など（デフォルト：o200k_base）

## MCPオプション
- `--mcp`: AI ツール統合用のModel Context Protocolサーバーとして実行


## 使用例

```bash
# 基本的な使用方法
repomix

# カスタム出力ファイルと形式
repomix -o my-output.xml --style xml

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

# パターンを使用して特定のファイルを処理
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

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

