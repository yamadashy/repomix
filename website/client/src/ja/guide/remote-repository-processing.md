# GitHubリポジトリの処理

## 基本的な使用方法

パブリックリポジトリを処理
```bash
# 完全なURLを使用
repomix --remote https://github.com/user/repo

# GitHubのショートハンド形式を使用
repomix --remote user/repo
```

## ブランチとコミットの選択

```bash
# 特定のブランチ
repomix --remote user/repo --remote-branch main

# タグ
repomix --remote user/repo --remote-branch v1.0.0

# コミットハッシュ
repomix --remote user/repo --remote-branch 935b695
```

## 必要条件

- Gitがインストールされていること
- インターネット接続があること
- リポジトリへの読み取りアクセス権があること

## 出力の制御

```bash
# 出力先のカスタマイズ
repomix --remote user/repo -o custom-output.xml

# XML形式で出力
repomix --remote user/repo --style xml

# コメントを削除
repomix --remote user/repo --remove-comments
```

## Docker使用時

```bash
# カレントディレクトリに出力
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# 特定のディレクトリに出力
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## セキュリティ

セキュリティ上の理由から、リモートリポジトリ内の設定ファイル（`repomix.config.*`）はデフォルトでは読み込まれません。これにより、信頼できないリポジトリが `repomix.config.ts` などの設定ファイルを通じてコードを実行することを防ぎます。

グローバル設定とCLIオプションは通常通り適用されます。

リモートリポジトリの設定を信頼する場合：

```bash
# CLIフラグを使用
repomix --remote user/repo --remote-trust-config

# 環境変数を使用
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

`--remote` と `--config` を併用する場合は、絶対パスを指定する必要があります：

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## 一般的な問題

### アクセスの問題
- リポジトリがパブリックであることを確認
- Gitのインストールを確認
- インターネット接続を確認

### 大規模リポジトリの処理
- `--include`で特定のパスを選択
- `--remove-comments`を有効化
- ブランチごとに個別に処理

## 関連リソース

- [コマンドラインオプション](/ja/guide/command-line-options) - `--remote`オプションを含むCLIリファレンス
- [設定](/ja/guide/configuration) - リモート処理のデフォルトオプションを設定
- [コード圧縮](/ja/guide/code-compress) - 大規模リポジトリの出力サイズを削減
- [セキュリティ](/ja/guide/security) - 機密データ検出の仕組み
