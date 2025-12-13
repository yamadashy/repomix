# インストール

## npx を使用する方法 (インストール不要)

```bash
npx repomix@latest
```

## グローバルインストール

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## Dockerを使用する方法

以下のコマンドで Docker イメージをプルして実行できます。

```bash
# カレントディレクトリを処理
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# 特定のディレクトリを処理
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# リモートリポジトリを処理
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## VSCode 拡張機能

VSCodeでRepomixを直接実行できるコミュニティメンテナンスの[Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)拡張機能があります。

機能:
- クリック数回でフォルダをパック
- ファイルまたはコンテンツモードでのコピーが可能
- 出力ファイルの自動クリーンアップ
- repomix.config.jsonと連携

[VSCode マーケットプレイス](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)からインストールできます。

## ブラウザ拡張機能

GitHubリポジトリから直接Repomixにアクセスできます！Chrome拡張機能がGitHubリポジトリページに便利な「Repomix」ボタンを追加します。

![Repomix Browser Extension](/images/docs/browser-extension.png)

### インストール
- Chrome拡張: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Firefox アドオン: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### 機能
- GitHubリポジトリからワンクリックでRepomixにアクセス
- さらなる機能を開発中です！

## システム要件

- Node.js: 20.0.0 以上
- Git: リモートリポジトリを処理する場合はインストールしてください

## インストールの確認

インストール後、以下のコマンドで Repomix が正常に動作することを確認できます。

```bash
repomix --version
repomix --help
```
