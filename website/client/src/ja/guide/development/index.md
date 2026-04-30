# Repomixへの貢献

Repomixにご興味をお持ちいただきありがとうございます！🚀 より良いものにするためのあなたの協力をお待ちしています。このガイドでは、プロジェクトへの貢献を始めるための手順を説明します。

## 貢献の方法

- **リポジトリをスターする**: [リポジトリをスター](https://github.com/yamadashy/repomix)して応援してください！
- **イシューの作成**: バグを見つけた？新機能のアイデアがある？[イシューを作成](https://github.com/yamadashy/repomix/issues)して教えてください。
- **プルリクエストの提出**: 修正や改善点を見つけた？ぜひPRを送ってください！
- **言葉を広める**: SNS、ブログ、または技術コミュニティでRepomixの経験を共有してください。
- **Repomixを使用する**: 実際の使用からのフィードバックが最も貴重です。あなた自身のプロジェクトにRepomixを組み込んでみてください！
- **スポンサーする**: [スポンサーになる](https://github.com/sponsors/yamadashy)ことでRepomixの開発をサポートしてください。

## 開発環境のセットアップ

### 前提条件

- Node.js ≥ 20.0.0
- Git
- npm
- Docker（オプション、ウェブサイトの実行やコンテナ化された開発用）

### ローカル開発

Repomixのローカル開発環境をセットアップするには：

```bash
# リポジトリのクローン
git clone https://github.com/yamadashy/repomix.git
cd repomix

# 依存関係のインストール
npm install

# CLIの実行
npm run repomix
```

### Nix開発

[Nix](https://nixos.org/download)（flakes有効）を使用している場合、Node.js 24とGitがプリインストールされた再現可能な開発シェルに入ることができます：

```bash
nix develop
```

シェル内では、標準の`npm`ワークフローが期待通りに動作します：

```bash
npm ci
npm run build
npm run test
npm run lint
```

注意: このシェルはRepomix自体の開発用で、CLIとしてインストールするためのものではありません。

### Docker開発

Dockerを使用してRepomixを実行することもできます：

```bash
# イメージのビルド
docker build -t repomix .

# コンテナの実行
docker run -v ./:/app -it --rm repomix
```

### プロジェクト構造

プロジェクトは次のディレクトリに整理されています：

```
src/
├── cli/          # CLI実装
├── config/       # 設定の処理
├── core/         # コア機能
│   ├── file/     # ファイル処理
│   ├── metrics/  # メトリクス計算
│   ├── output/   # 出力生成
│   ├── security/ # セキュリティチェック
├── mcp/          # MCPサーバー統合
└── shared/       # 共有ユーティリティ
tests/            # src/構造を反映したテスト
website/          # ドキュメントウェブサイト
├── client/       # フロントエンド（VitePress）
└── server/       # バックエンドAPI
```

## 開発コマンド

```bash
# CLIを実行
npm run repomix

# テストを実行
npm run test
npm run test-coverage

# コードのリント
npm run lint
```

### テスト

テストには[Vitest](https://vitest.dev/)を使用しています。テストを実行するには：

```bash
# テストの実行
npm run test

# テストカバレッジ
npm run test-coverage

# リント
npm run lint-biome
npm run lint-ts
npm run lint-secretlint
```

## コーディングスタイル

- [Biome](https://biomejs.dev/)を使用してリントとフォーマットを行う
- テスト可能性のために依存性注入を使用
- ファイルは250行以下に保つ
- 新機能には必ずテストを追加

リントとフォーマットには[Biome](https://biomejs.dev/)を使用しています。コードがスタイルガイドに従っていることを確認するために以下を実行してください：

```bash
npm run lint
```

## プルリクエストのガイドライン

プルリクエストを提出する前に、以下を確認してください：

1. コードが全てのテストをパスすること: `npm run test`を実行
2. コードがリント基準に適合していること: `npm run lint`を実行
3. 関連するドキュメントを更新していること
4. 既存のコードスタイルに従っていること

## ウェブサイト開発

Repomixのウェブサイトは[VitePress](https://vitepress.dev/)で構築されています。ローカルでウェブサイトを実行するには：

```bash
# 前提条件: システムにDockerがインストールされていること

# ウェブサイト開発サーバーの起動
npm run website

# ウェブサイトには http://localhost:5173/ でアクセス
```

ドキュメントを更新する場合は、最初に英語版のみを更新する必要があります。他の言語への翻訳はメンテナーが対応します。

## リリースプロセス

メンテナーと貢献者向けのリリースプロセス：

1. バージョンの更新
```bash
npm version patch  # または minor/major
```

2. テストとビルドの実行
```bash
npm run test-coverage
npm run build
```

3. 公開
```bash
npm publish
```

新しいバージョンはメンテナーによって管理されます。リリースが必要だと思われる場合は、イシューを作成して議論してください。

## サポートが必要な場合

- [イシューを作成](https://github.com/yamadashy/repomix/issues)
- [Discordに参加](https://discord.gg/wNYzTwZFku)
