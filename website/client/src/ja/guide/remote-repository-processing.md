---
title: GitHubリポジトリの処理
description: 完全なURL、user/repo短縮表記、ブランチ、タグ、コミット、Docker、リモート設定の信頼制御を使ってGitHubリポジトリをRepomixでパックします。
---

# GitHubリポジトリの処理

## 基本的な使用方法

パブリックリポジトリを処理
```bash
# 完全なURLを使用
repomix --remote https://github.com/user/repo

# GitHubのショートハンド形式を使用
repomix --remote user/repo
```

`--remote` を付けずに `owner/repo` のショートハンドを直接渡すこともできます。

```bash
repomix yamadashy/repomix
```

`owner/repo` は相対ローカルパスとも見分けがつかないため、Repomix は同名のローカルファイル・ディレクトリが存在せず、かつそのリポジトリが GitHub 上で到達可能な場合にのみリモートリポジトリとして扱います。同名のローカルパスがある場合は常にそちらが優先されます。`owner/repo` 形式のパスを強制的にローカルとして扱わせたい場合は、`./` を付けてください（例: `repomix ./owner/repo`）。引数がこのパターンに一致してもリポジトリに到達できない場合（プライベートリポジトリやタイプミスなど）は、Repomix はそれをローカルパスとして処理するようフォールバックします。

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

::: warning
`--remote-trust-config` を使うと、リモートリポジトリの設定がローカルマシンと同等の信頼を得ます。信頼した設定は（`input.processors` 経由で）**任意のコマンドを実行**したり、（`output.instructionFilePath` や `../` を使ったincludeパターンなどを介して）**リポジトリ外のローカルファイルを読み取る**ことができます。完全に信頼し、内容を確認済みのリポジトリでのみ使用してください。これは、見知らぬソースの `npm install` や `Makefile` を実行する前に払うべき注意と同じです。
:::

### 確認プロンプト

インタラクティブなターミナルでリポジトリの設定を信頼すると、repomixはこれから実行しようとしている設定を表示し、読み込む前に確認を求めます。

- **はい、今回のみ**：この実行だけを信頼します。
- **はい、このリポジトリでは今後確認しない**：一時ファイルが削除されるまで、かつその設定ファイル自体が変更されない限り記憶されます（設定ファイルが編集されると再度確認が求められます）。なお、この確認の対象は設定ファイル自体のみです。`.ts` / `.js` 形式の設定は他のファイルをインポートできますが、それらはチェックの対象に含まれません。
- **いいえ**：設定を実行せずに中止します。

`--force` を指定した場合、CIのような非インタラクティブなシェルの場合（これまでどおり設定は信頼され、既存の自動化はそのまま動作します）、またはそのリポジトリを常に信頼するとすでに選択している場合は、この確認プロンプトはスキップされます。

完全な信頼モデル（信頼した設定で何ができるか、表示される設定が改ざんからどう保護されているか、「今後確認しない」という選択がどこに保存されるか）については、[セキュリティ](/ja/guide/security#remote-repository-config-trust)を参照してください。

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
