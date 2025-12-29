# 基本的な使い方

## クイックスタート

リポジトリ全体をパッケージ化：
```bash
repomix
```

## 一般的な使用例

### 特定のディレクトリをパッケージ化
```bash
repomix path/to/directory
```

### 特定のファイルを含める
[glob パターン](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)を使用：
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### ファイルを除外
```bash
repomix --ignore "**/*.log,tmp/"
```

### 出力を複数ファイルに分割

大規模なコードベースを扱う際、パックされた出力が一部のAIツールのファイルサイズ制限を超える場合があります（例: Google AI Studioの1MB制限）。`--split-output`を使用して出力を自動的に複数のファイルに分割できます:

```bash
repomix --split-output 1mb
```

これにより、以下のような番号付きファイルが生成されます:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

サイズは単位付きで指定できます: `500kb`、`1mb`、`2mb`、`1.5mb`など。小数値もサポートされています。

> [!NOTE]
> コンテキストを維持するため、ファイルはトップレベルディレクトリごとにグループ化されます。単一のファイルやディレクトリが複数の出力ファイルに分割されることはありません。

### リモートリポジトリ
```bash
# GitHub URLを使用
repomix --remote https://github.com/user/repo

# ショートハンドを使用
repomix --remote user/repo

# 特定のブランチ/タグ/コミット
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### ファイルリスト入力（stdin）

究極の柔軟性でファイルパスをstdin経由で渡します：

```bash
# findコマンドを使用
find src -name "*.ts" -type f | repomix --stdin

# gitを使用してトラッキングされているファイルを取得
git ls-files "*.ts" | repomix --stdin

# ripgrep (rg) を使用してファイルを検索
rg --files --type ts | repomix --stdin

# grepを使用して特定の内容を含むファイルを検索
grep -l "TODO" **/*.ts | repomix --stdin

# ripgrepを使用して特定の内容を含むファイルを検索
rg -l "TODO|FIXME" --type ts | repomix --stdin

# sharkdp/fd を使用してファイルを検索
fd -e ts | repomix --stdin

# fzfを使用してすべてのファイルから選択
fzf -m | repomix --stdin

# fzfを使用したインタラクティブなファイル選択
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# globパターンを使用したls
ls src/**/*.ts | repomix --stdin

# ファイルパスが含まれるファイルから
cat file-list.txt | repomix --stdin

# echoで直接入力
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

`--stdin`オプションを使用すると、Repomixにファイルパスのリストをパイプできるため、どのファイルをパッケージ化するかの選択において究極の柔軟性が得られます。

`--stdin`で指定されたファイルは、実質的にincludeパターンに追加されます。つまり、通常のincludeおよびignoreの動作と同じで、stdinで指定したファイルもignoreパターンに一致する場合は除外されます。

> [!NOTE]
> `--stdin`を使用する場合、ファイルパスは相対パスまたは絶対パスのどちらでも指定でき、Repomixが自動的にパス解決と重複除去を処理します。

### コード圧縮

```bash
repomix --compress

# リモートリポジトリでも使用可能：
repomix --remote yamadashy/repomix --compress
```

### Git統合

AI分析のための開発コンテキストを提供するためにGit情報を含めます：

```bash
# Git差分を含める（コミットされていない変更）
repomix --include-diffs

# Gitコミットログを含める（デフォルトで最新50コミット）
repomix --include-logs

# 特定の数のコミットを含める
repomix --include-logs --include-logs-count 10

# 差分とログの両方を含める
repomix --include-diffs --include-logs
```

これにより以下の貴重なコンテキストが追加されます：
- **最近の変更**: Git差分はコミットされていない変更を表示
- **開発パターン**: Gitログは通常一緒に変更されるファイルを明らかにする
- **コミット履歴**: 最近のコミットメッセージは開発の焦点についての洞察を提供
- **ファイル関係**: 同じコミットで変更されるファイルの理解

### トークン数最適化

コードベースのトークン分布を理解することは、AIとの対話を最適化するために重要です。`--token-count-tree`オプションを使用して、プロジェクト全体のトークン使用量を視覚化できます：

```bash
repomix --token-count-tree
```

これにより、コードベースの階層ビューがトークン数とともに表示されます：

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

最小トークン閾値を設定して、大きなファイルに焦点を当てることもできます：

```bash
repomix --token-count-tree 1000  # 1000以上のトークンを持つファイル/ディレクトリのみを表示
```

これにより以下のことが可能になります：
- **トークンの多いファイルを特定** - AIのコンテキスト制限を超える可能性があるファイルを発見
- **ファイル選択を最適化** - `--include`と`--ignore`パターンを使用した最適化
- **圧縮戦略を計画** - 最大の要因をターゲットにした戦略立案
- **コンテンツとコンテキストのバランス** - AI分析用のコード準備時のバランス調整

## 出力形式

### XML（デフォルト）
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### JSON
```bash
repomix --style json
```

### プレーンテキスト
```bash
repomix --style plain
```

## その他のオプション

### コメントを削除
```bash
repomix --remove-comments
```

### 行番号を表示
```bash
repomix --output-show-line-numbers
```

### クリップボードにコピー
```bash
repomix --copy
```

### セキュリティチェックを無効化
```bash
repomix --no-security-check
```

## 設定

設定ファイルを初期化：
```bash
repomix --init
```

詳細なオプションについては[設定ガイド](/ja/guide/configuration)を参照してください。
