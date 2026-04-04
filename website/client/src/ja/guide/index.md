# Repomixとは

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomixは、リポジトリ全体をAIフレンドリーな単一ファイルにパッケージングするツールです。ChatGPT、Claude、Gemini、Grok、DeepSeek、Perplexity、Gemma、Llamaなどの大規模言語モデル（LLM）にコードベースを提供するために設計されています。

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## クイックスタート

プロジェクトディレクトリで以下のコマンドを実行するだけです。

```bash
npx repomix@latest
```

これだけで、`repomix-output.xml`ファイルにAIが理解しやすい形式でリポジトリ全体がまとめられます。

このファイルを以下のようなプロンプトとともにAIアシスタントに送信できます。

```
このファイルはリポジトリ内のすべてのファイルを1つにまとめたものです。
コードのリファクタリングを行いたいので、まずはコードレビューをお願いします。
```

すると、AIはコードベース全体を分析し、包括的な洞察を提供してくれます。

![Repomixの使用例1](/images/docs/repomix-file-usage-1.png)

具体的な変更点を議論する際には、AIはコードの生成をサポートしてくれます。例えば、Claudeのアーティファクト機能などを使用すると、相互に依存する複数のファイルを一度に生成することも可能です。

![Repomixの使用例2](/images/docs/repomix-file-usage-2.png)

良いコーディング体験を！🚀

## なぜRepomixか？

Repomixの強みは、ChatGPT、Claude、Gemini、Grokなどのお好きなサブスクリプションサービスで料金を気にせずに使えることです。また、コード全体を知っていることで、コードの調査などを行う上でファイルの探索が不要でより早く、時には正確に結果を得ることができます。

コードベース全体がコンテキストとして利用できることで、実装方針の相談、バグの調査、サードパーティライブラリのセキュリティのチェック、ドキュメントの生成など、あらゆることに使えます。

## 主な機能

- **AI最適化**: コードベースをAIが理解しやすい形式にフォーマット化
- **トークンカウント**: LLMのコンテキスト制限に対応するためのトークン数を計測
- **Git対応**: `.gitignore`および`.git/info/exclude`ファイルを自動的に認識してパッケージング対象から除外
- **セキュリティ重視**: [Secretlint](https://github.com/secretlint/secretlint)を使用した機密情報の検出と保護
- **複数の出力形式**: プレーンテキスト、XML、Markdownの出力形式を選択可能

## 次のステップ

- [インストールガイド](installation.md): Repomixをインストールするにはこちら
- [使用方法](usage.md): 基本的な使い方から高度な使い方まで
- [出力フォーマット](output.md): AIモデルに最適な出力形式を選択
- [設定](configuration.md): Repomixをカスタマイズするにはこちら
- [セキュリティ機能](security.md): セキュリティチェックの詳細はこちら
- [MCPサーバー](mcp-server.md): AIアシスタントとRepomixを直接連携

## コミュニティ

[Discordコミュニティ](https://discord.gg/wNYzTwZFku)に参加して、Repomixの使い方について質問したり、経験やノウハウを共有したり、新機能を提案したり、他のユーザーと交流しましょう。

## サポート

バグを見つけた場合や支援が必要な場合は、[GitHubでイシューを作成](https://github.com/yamadashy/repomix/issues)するか、Discordサーバーに参加してください。
