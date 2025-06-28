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

### ファイルリスト入力（pipe via stdin）

究極の柔軟性でファイルパスをstdin経由で渡します：

```bash
# findコマンドを使用
find src -name "*.ts" -type f | repomix

# gitを使用してトラッキングされているファイルを取得
git ls-files "*.ts" | repomix

# globパターンを使用したls
ls src/**/*.ts | repomix

# ファイルパスが含まれるファイルから
cat file-list.txt | repomix

# echoで直接入力
echo -e "src/index.ts\nsrc/utils.ts" | repomix

# ダッシュを使用したfindコマンド（明示的なstdin指標）
find src -name "*.ts" | repomix -
```

Repomixは、ファイルパスがstdin経由でパイプされるのを自動的に検出するため、どのファイルをパッケージ化するかの選択において究極の柔軟性が得られます。

> [!NOTE]
> stdin入力を使用する場合、ファイルパスは相対パスまたは絶対パスのどちらでも指定でき、Repomixが自動的にパス解決と重複除去を処理します。

### コード圧縮
```bash
repomix --compress

# リモートリポジトリでも使用可能：
repomix --remote user/repo --compress
```

## 出力形式

### XML（デフォルト）
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
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
