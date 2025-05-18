# インストール

## npx を使用する方法 (インストール不要)

```bash
npx repomix
```

## グローバルインストール

### npm
```bash
npm install -g repomix
```

### Yarn
```bash
yarn global add repomix
```

### Homebrew（macOS/Linux）
```bash
brew install repomix
```

## Dockerを使用する方法

一貫した環境を確保するためにコンテナ化された実行環境を提供するDockerイメージをプルして実行できます：

```bash
# カレントディレクトリを処理 - カレントディレクトリをコンテナ内の/appにマウント
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# 特定のディレクトリを処理 - 特定のパスのみを処理するように指定
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# カスタム出力ファイル - 出力ファイル名と場所を指定
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix -o custom-output.xml

# リモートリポジトリを処理 - 出力を./outputディレクトリに保存
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

DockerイメージにはRepomixを実行するために必要なすべての依存関係が含まれています。

## VSCode 拡張機能

VSCodeでRepomixを直接実行できるコミュニティメンテナンスの[Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)拡張機能（[massdo](https://github.com/massdo)によって作成）があります。

機能:
- クリック数回でフォルダをパック
- 出力フォーマット（XML、Markdown、プレーンテキスト）を制御
- ファイルまたはコンテンツモードでのコピーが可能
- 出力ファイルの自動クリーンアップ
- 既存のrepomix.config.jsonとシームレスに連携
- VSCodeの直感的なインターフェースを通じて出力を管理

[VSCode マーケットプレイス](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)からインストールするか、[GitHubでソースコードを確認](https://github.com/massdo/repomix-runner)できます。

## システム要件

- Node.js: 18.0.0 以上
- Git: リモートリポジトリを処理する場合はインストールしてください

## インストールの確認

インストール後、以下のコマンドで Repomix が正常に動作することを確認できます。

```bash
repomix --version
repomix --help
```
